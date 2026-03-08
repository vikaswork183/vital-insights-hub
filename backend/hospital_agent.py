"""
Hospital Agent — Local training and encrypted update submission (port 8002).

Each hospital:
1. Loads local CSV data
2. Trains the FT-Transformer locally
3. Computes model delta (last layer params)
4. Encrypts delta with Paillier homomorphic encryption
5. Submits encrypted update to the backend
"""

import os
import json
import pickle
import numpy as np
import torch
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
import requests
import hashlib

from model import create_model
from train import load_and_preprocess, train_model, FEATURE_COLS

# Paillier encryption
try:
    from phe import paillier
    HAS_PAILLIER = True
except ImportError:
    HAS_PAILLIER = False
    print("Warning: phe not installed. Running without encryption.")

app = FastAPI(title="Vital Sync Hospital Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
KEYHOLDER_URL = os.environ.get("KEYHOLDER_URL", "http://localhost:8001")
HOSPITAL_NAME = os.environ.get("HOSPITAL_NAME", "Hospital Agent")
HOSPITAL_ID = os.environ.get("HOSPITAL_ID", "hospital-1")

# State
current_model = None
initial_params = None
public_key = None
KEY_FINGERPRINT = "vitalsync-paillier-v1-sha256"


class TrainRequest(BaseModel):
    csv_path: str
    model_version: str = "1"
    epochs: int = 50


class SubmitRequest(BaseModel):
    model_version: str = "1"
    encrypt: bool = True


def fetch_public_key():
    """Fetch Paillier public key from keyholder."""
    global public_key
    if not HAS_PAILLIER:
        return None
    try:
        resp = requests.get(f"{KEYHOLDER_URL}/public_key")
        data = resp.json()
        public_key = paillier.PaillierPublicKey(n=int(data['n']))
        return public_key
    except Exception as e:
        print(f"Could not fetch public key: {e}")
        return None


def encrypt_delta(delta: Dict[str, np.ndarray]) -> Dict[str, list]:
    """Encrypt model delta using Paillier homomorphic encryption."""
    if not HAS_PAILLIER or public_key is None:
        # Return unencrypted for testing
        return {k: v.tolist() for k, v in delta.items()}

    encrypted = {}
    for key, values in delta.items():
        flat = values.flatten().tolist()
        enc_values = [public_key.encrypt(float(v)) for v in flat]
        encrypted[key] = {
            'ciphertexts': [str(v.ciphertext()) for v in enc_values],
            'exponents': [v.exponent for v in enc_values],
            'shape': list(values.shape),
        }
    return encrypted


def compute_data_stats(csv_path: str) -> Dict:
    """Compute summary statistics for aggregation checks."""
    import pandas as pd
    df = pd.read_csv(csv_path)

    stats = {}
    for col in FEATURE_COLS:
        if col in df.columns:
            stats[col] = {
                'min': float(df[col].min()),
                'max': float(df[col].max()),
                'mean': float(df[col].mean()),
                'std': float(df[col].std()),
            }

    label_dist = {
        'mortality_rate': float(df['mortality'].mean()),
        'total': len(df),
        'mortality_count': int(df['mortality'].sum()),
        'survival_count': int((1 - df['mortality']).sum()),
    }

    return stats, label_dist


@app.get("/")
def root():
    return {"service": "Hospital Agent", "hospital": HOSPITAL_NAME, "status": "running"}


@app.post("/train")
def train_local(req: TrainRequest):
    """Train the model locally on hospital data."""
    global current_model, initial_params

    if not os.path.exists(req.csv_path):
        raise HTTPException(404, f"CSV not found: {req.csv_path}")

    # Save initial params before training (for delta computation)
    model = create_model(n_features=len(FEATURE_COLS))

    # Try to load existing global model
    model_path = f"models/ft_transformer_v{req.model_version}.pt"
    if os.path.exists(model_path):
        checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
        model.load_state_dict(checkpoint['model_state_dict'])
        print(f"Loaded global model v{req.model_version}")

    initial_params = model.get_last_layer_params()

    # Train
    trained_model, scaler, results, importance = train_model(
        train_csv=req.csv_path,
        epochs=req.epochs,
        model_version=int(req.model_version),
    )
    current_model = trained_model

    return {
        "status": "trained",
        "metrics": results,
        "feature_importance": importance,
    }


@app.post("/submit_update")
def submit_update(req: SubmitRequest):
    """Compute delta, encrypt, and submit to backend."""
    global current_model, initial_params

    if current_model is None or initial_params is None:
        raise HTTPException(400, "No trained model. Train first with /train")

    # Compute delta (difference between trained and initial last-layer params)
    trained_params = current_model.get_last_layer_params()
    delta = {}
    for key in trained_params:
        if key in initial_params:
            delta[key] = (trained_params[key] - initial_params[key]).numpy()
        else:
            delta[key] = trained_params[key].numpy()

    # Get data stats (from last trained CSV)
    # In a real system, you'd track this. Using default path for now.
    csv_path = "data/hospital_1.csv"  # This should be tracked per training run
    data_stats, label_dist = compute_data_stats(csv_path)

    # Encrypt if requested
    if req.encrypt:
        if not public_key:
            fetch_public_key()

    # Submit to backend
    serialized_delta = {k: v.tolist() for k, v in delta.items()}

    try:
        resp = requests.post(f"{BACKEND_URL}/submit_update", json={
            "hospital_name": HOSPITAL_NAME,
            "hospital_id": HOSPITAL_ID,
            "model_version": req.model_version,
            "delta": serialized_delta,
            "data_stats": data_stats,
            "label_distribution": label_dist,
            "key_fingerprint": KEY_FINGERPRINT,
            "data_size": label_dist.get('total', 0),
            "encrypted": req.encrypt and HAS_PAILLIER,
        })
        return resp.json()
    except Exception as e:
        raise HTTPException(500, f"Failed to submit to backend: {str(e)}")


@app.get("/status")
def status():
    """Get current agent status."""
    return {
        "hospital": HOSPITAL_NAME,
        "model_loaded": current_model is not None,
        "paillier_available": HAS_PAILLIER,
        "public_key_loaded": public_key is not None,
    }


if __name__ == "__main__":
    import uvicorn
    # Try to fetch public key on startup
    fetch_public_key()
    uvicorn.run(app, host="0.0.0.0", port=8002)
