"""
Vital Sync — Admin/Global Server (FastAPI, port 8000)

This runs on the PUBLIC GLOBAL SERVER and handles:
- Model versioning and storage
- Update request handling from hospitals
- Robust aggregation pipeline
- Prediction endpoint for clients
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

app = FastAPI(title="Vital Sync Admin Server", version="1.0.0")

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
KEY_FINGERPRINT = "vitalsync-paillier-v1-sha256"


class PredictionRequest(BaseModel):
    features: Dict[str, float]
    model_version: str = "1"


class UpdateSubmission(BaseModel):
    hospital_name: str
    hospital_id: str
    model_version: str
    delta: Dict[str, List[float]]  # serialized numpy arrays
    data_stats: Dict
    label_distribution: Dict[str, float]
    key_fingerprint: str
    data_size: int
    encrypted: bool = False


class AggregateRequest(BaseModel):
    model_version: str
    update_ids: List[str]


def load_model(version: str):
    """Load a model version from disk."""
    if version in models:
        return models[version]

    model_path = f"models/ft_transformer_v{version}.pt"
    scaler_path = f"models/scaler_v{version}.pkl"

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
    return models[version]


@app.get("/")
def root():
    return {"service": "Vital Sync Admin Server", "status": "running", "location": "Global Server"}


@app.get("/models")
def list_models():
    """List available model versions."""
    model_files = []
    if os.path.exists("models"):
        for f in os.listdir("models"):
            if f.startswith("ft_transformer_v") and f.endswith(".pt"):
                version = f.replace("ft_transformer_v", "").replace(".pt", "")
                info = load_model(version)
                if info:
                    metrics = info['checkpoint'].get('metrics', {})
                    model_files.append({
                        'version': version,
                        'architecture': 'ft-transformer',
                        'metrics': metrics,
                        'feature_importance': info['checkpoint'].get('feature_importance', []),
                    })
    return {"models": model_files}


@app.post("/predict")
def predict(req: PredictionRequest):
    """Run prediction using specified model version."""
    info = load_model(req.model_version)
    if not info:
        raise HTTPException(404, f"Model v{req.model_version} not found")

    model = info['model']
    scaler = scalers.get(req.model_version)

    # Build feature vector in correct order
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

    # Risk category
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
    }


# In-memory store for pending updates
pending_updates: Dict[str, dict] = {}


@app.post("/submit_update")
def submit_update(submission: UpdateSubmission):
    """Receive a hospital's model update and run diagnostics."""
    # Deserialize delta
    delta = {k: np.array(v) for k, v in submission.delta.items()}

    # Run aggregation checks
    report = run_aggregation_checks(
        delta=delta,
        data_stats=submission.data_stats,
        label_dist=submission.label_distribution,
        key_fingerprint=submission.key_fingerprint,
        expected_fingerprint=KEY_FINGERPRINT,
        data_size=submission.data_size,
    )

    update_id = f"{submission.hospital_id}_{submission.model_version}_{len(pending_updates)}"

    # Remove numpy arrays from report for JSON serialization
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
    """List all pending updates with diagnostics."""
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
    """Aggregate approved updates into the model."""
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

    # Clean up processed updates
    for uid in req.update_ids:
        pending_updates.pop(uid, None)

    return {
        "status": "aggregated",
        "model_version": req.model_version,
        "updates_applied": len(reports),
    }


if __name__ == "__main__":
    import uvicorn
    print("Starting Admin Server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
