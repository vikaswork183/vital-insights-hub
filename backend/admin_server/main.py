"""
Vital Sync — Admin/Global Server (FastAPI, port 8000)

Loads the base model from data.db (SQLite) at startup.
Falls back to .pt files. Auto-trains if no model exists.
"""

import os
import json
import pickle
import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, List

from model import FTTransformer, create_model
from aggregation import run_aggregation_checks, aggregate_deltas
from train import FEATURE_COLS, FEATURE_LABELS, evaluate_model, compute_feature_importance
from db_store import ModelStore

app = FastAPI(title="Vital Sync Admin Server", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory state
models: Dict[str, dict] = {}
scalers: Dict[str, object] = {}
store = ModelStore()
KEY_FINGERPRINT = "vitalsync-paillier-v1-sha256"


class PredictionRequest(BaseModel):
    features: Dict[str, float]
    model_version: str = "1"


class UpdateSubmission(BaseModel):
    hospital_name: str
    hospital_id: str
    model_version: str
    delta: Dict[str, List[float]]
    data_stats: Dict
    label_distribution: Dict[str, float]
    key_fingerprint: str
    data_size: int
    encrypted: bool = False


class AggregateRequest(BaseModel):
    model_version: str
    update_ids: List[str]


def load_model(version: str):
    """Load model: try data.db first, then .pt file."""
    if version in models:
        return models[version]

    ver_int = int(version)

    # --- Try data.db first ---
    result = store.load_model(ver_int)
    if result:
        checkpoint, scaler, config, meta = result
        model = create_model(**config)
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()
        models[version] = {
            'model': model,
            'checkpoint': checkpoint,
            'meta': meta,
        }
        scalers[version] = scaler
        print(f"Loaded model v{version} from data.db")
        return models[version]

    # --- Fallback: .pt file ---
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    model_path = os.path.join(model_dir, f'ft_transformer_v{version}.pt')
    scaler_path = os.path.join(model_dir, f'scaler_v{version}.pkl')

    if not os.path.exists(model_path):
        return None

    checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
    config = checkpoint.get('model_config', {})
    model = create_model(**config)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()

    scaler = None
    if os.path.exists(scaler_path):
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)

    models[version] = {
        'model': model,
        'checkpoint': checkpoint,
    }
    scalers[version] = scaler
    print(f"Loaded model v{version} from .pt file")
    return models[version]


@app.on_event("startup")
def startup():
    """Auto-load or auto-train model v1 on startup."""
    latest = store.latest_version()
    if latest:
        print(f"data.db has model v{latest} — loading...")
        load_model(str(latest))
    else:
        print("data.db is empty — checking for .pt file...")
        info = load_model("1")
        if info:
            print("Found .pt file, will serve from that.")
        else:
            print("No model found. Run `python ../generate_base_model.py` to create one.")


@app.get("/")
def root():
    return {
        "service": "Vital Sync Admin Server",
        "status": "running",
        "model_source": "data.db",
        "latest_version": store.latest_version(),
    }


@app.get("/models")
def list_models():
    """List available model versions from data.db + filesystem."""
    model_list = []

    # From data.db
    for info in store.list_versions():
        model_list.append({
            'version': str(info['version']),
            'architecture': 'ft-transformer',
            'metrics': info['metrics'],
            'source': 'data.db',
            'n_updates': info['n_updates'],
            'total_samples': info['total_samples'],
            'created_at': info['created_at'],
        })

    db_versions = {m['version'] for m in model_list}

    # From filesystem (those not already in db)
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    if os.path.exists(model_dir):
        for f in os.listdir(model_dir):
            if f.startswith("ft_transformer_v") and f.endswith(".pt"):
                version = f.replace("ft_transformer_v", "").replace(".pt", "")
                if version not in db_versions:
                    info = load_model(version)
                    if info:
                        metrics = info['checkpoint'].get('metrics', {})
                        model_list.append({
                            'version': version,
                            'architecture': 'ft-transformer',
                            'metrics': metrics,
                            'source': 'filesystem',
                        })

    return {"models": model_list}


@app.post("/predict")
def predict(req: PredictionRequest):
    """Run prediction using specified model version."""
    info = load_model(req.model_version)
    if not info:
        raise HTTPException(404, f"Model v{req.model_version} not found")

    model = info['model']
    scaler = scalers.get(req.model_version)
    threshold = info.get('meta', {}).get('threshold', 0.5)

    feature_values = []
    for col in FEATURE_COLS:
        if col not in req.features:
            raise HTTPException(400, f"Missing feature: {col}")
        feature_values.append(req.features[col])

    X = np.array([feature_values], dtype=np.float32)
    if scaler:
        X = scaler.transform(X)

    X_tensor = torch.FloatTensor(X)

    model.eval()
    with torch.no_grad():
        logits = model(X_tensor)
        probs = torch.softmax(logits, dim=1)
        mortality_prob = float(probs[0, 1])

    if mortality_prob > 0.7:
        risk = "High Risk"
    elif mortality_prob > 0.3:
        risk = "Moderate Risk"
    else:
        risk = "Low Risk"

    # Feature contributions via gradient
    X_grad = torch.FloatTensor(X).requires_grad_(True)
    logits = model(X_grad)
    prob = torch.softmax(logits, dim=1)[0, 1]
    prob.backward()
    contributions = X_grad.grad[0].numpy()

    feature_contributions = {}
    for i, label in enumerate(FEATURE_LABELS):
        feature_contributions[label] = float(contributions[i])

    return {
        "mortality_probability": mortality_prob,
        "risk_category": risk,
        "feature_contributions": feature_contributions,
        "model_version": req.model_version,
        "architecture": "FT-Transformer",
        "threshold": threshold,
    }


# In-memory store for pending updates
pending_updates: Dict[str, dict] = {}


@app.post("/submit_update")
def submit_update(submission: UpdateSubmission):
    """Receive a hospital's model update and run diagnostics."""
    delta = {k: np.array(v) for k, v in submission.delta.items()}

    report = run_aggregation_checks(
        delta=delta,
        data_stats=submission.data_stats,
        label_dist=submission.label_distribution,
        key_fingerprint=submission.key_fingerprint,
        expected_fingerprint=KEY_FINGERPRINT,
        data_size=submission.data_size,
    )

    update_id = f"{submission.hospital_id}_{submission.model_version}_{len(pending_updates)}"

    serializable_report = {k: v for k, v in report.items() if k != 'clipped_delta'}
    serializable_report['original_delta_keys'] = list(delta.keys())

    pending_updates[update_id] = {
        'submission': submission.dict(),
        'report': report,
        'update_id': update_id,
    }

    return {
        "update_id": update_id,
        "diagnostics": serializable_report,
        "status": report['status'],
        "trust_score": report['trust_score'],
    }


@app.get("/pending_updates")
def get_pending_updates():
    results = []
    for uid, data in pending_updates.items():
        report = data['report']
        serializable = {k: v for k, v in report.items() if k != 'clipped_delta'}
        results.append({
            'update_id': uid,
            'hospital_name': data['submission']['hospital_name'],
            'diagnostics': serializable,
            'status': report['status'],
            'trust_score': report['trust_score'],
        })
    return {"updates": results}


@app.post("/aggregate")
def aggregate_updates(req: AggregateRequest):
    """Aggregate approved updates and save updated model to data.db."""
    reports = []
    for uid in req.update_ids:
        if uid in pending_updates:
            reports.append(pending_updates[uid]['report'])

    if not reports:
        raise HTTPException(400, "No valid updates found")

    aggregated_delta = aggregate_deltas(reports)
    if not aggregated_delta:
        raise HTTPException(400, "No accepted updates to aggregate")

    # Apply to model
    info = load_model(req.model_version)
    if not info:
        raise HTTPException(404, f"Model v{req.model_version} not found")

    model = info['model']
    model.set_last_layer_params({k: torch.FloatTensor(v) for k, v in aggregated_delta.items()})

    # Save updated model back to data.db as new version
    current_ver = int(req.model_version)
    new_ver = current_ver  # update in-place for now
    scaler = scalers.get(req.model_version)

    config = info.get('meta', {}).get('model_config') or info['checkpoint'].get('model_config', {})
    store.save_model(
        version=new_ver,
        model_state_dict=model.state_dict(),
        scaler=scaler,
        model_config=config,
        n_updates=(info.get('meta', {}).get('n_updates', 0) + 1),
    )
    store.increment_updates(new_ver, additional_samples=sum(
        r.get('data_size', 0) for r in reports
    ))

    # Clean up
    for uid in req.update_ids:
        pending_updates.pop(uid, None)

    return {
        "status": "aggregated",
        "model_version": str(new_ver),
        "updates_applied": len(reports),
        "stored_in": "data.db",
    }


if __name__ == "__main__":
    import uvicorn
    print("Starting Admin Server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
