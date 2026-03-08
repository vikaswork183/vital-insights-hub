"""
Keyholder Service — Paillier Private Key Management (port 8001)

**Deployment: SECURE ISOLATED SERVER**

This service:
- Generates and holds the Paillier keypair
- Provides the public key to hospital agents
- Decrypts ONLY aggregated results (never individual updates)
- Never sees raw patient data

SECURITY: This should run on an isolated server with strict access controls.
"""

import json
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import hashlib

try:
    from phe import paillier
    HAS_PAILLIER = True
except ImportError:
    HAS_PAILLIER = False
    print("Warning: phe not installed. Running in mock mode.")

app = FastAPI(title="Vital Sync Keyholder", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Generate keypair on startup
if HAS_PAILLIER:
    print("Generating Paillier keypair (2048-bit)...")
    public_key, private_key = paillier.generate_paillier_keypair(n_length=2048)
    KEY_FINGERPRINT = hashlib.sha256(str(public_key.n).encode()).hexdigest()[:16]
    print(f"Key fingerprint: {KEY_FINGERPRINT}")
else:
    public_key = None
    private_key = None
    KEY_FINGERPRINT = "vitalsync-paillier-v1-sha256"


class DecryptRequest(BaseModel):
    """Request to decrypt aggregated delta."""
    aggregated_ciphertexts: Dict[str, dict]  # key -> {ciphertexts, exponents, shape}


@app.get("/")
def root():
    return {
        "service": "Vital Sync Keyholder",
        "status": "running",
        "paillier_available": HAS_PAILLIER,
        "key_fingerprint": KEY_FINGERPRINT,
        "location": "Secure Isolated Server",
    }


@app.get("/public_key")
def get_public_key():
    """Provide the public key to hospital agents."""
    if not HAS_PAILLIER:
        return {"n": "0", "fingerprint": KEY_FINGERPRINT, "mock": True}

    return {
        "n": str(public_key.n),
        "fingerprint": KEY_FINGERPRINT,
    }


@app.post("/decrypt_aggregated")
def decrypt_aggregated(req: DecryptRequest):
    """
    Decrypt ONLY the aggregated result.
    
    IMPORTANT: This endpoint should only be called with the aggregated
    sum of encrypted deltas, NEVER with individual hospital updates.
    
    The homomorphic property of Paillier ensures that:
    E(a) * E(b) = E(a + b)
    
    So we can sum encrypted values without decrypting them individually.
    """
    if not HAS_PAILLIER:
        raise HTTPException(400, "Paillier not available")

    decrypted = {}
    for key, data in req.aggregated_ciphertexts.items():
        ciphertexts = data['ciphertexts']
        exponents = data['exponents']
        shape = data['shape']

        values = []
        for ct_str, exp in zip(ciphertexts, exponents):
            encrypted_number = paillier.EncryptedNumber(
                public_key, int(ct_str), int(exp)
            )
            decrypted_value = private_key.decrypt(encrypted_number)
            values.append(float(decrypted_value))

        decrypted[key] = np.array(values).reshape(shape).tolist()

    return {"decrypted_delta": decrypted}


@app.get("/fingerprint")
def get_fingerprint():
    """Get the key fingerprint for verification."""
    return {"fingerprint": KEY_FINGERPRINT}


@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "healthy": True,
        "paillier_ready": HAS_PAILLIER and public_key is not None,
    }


if __name__ == "__main__":
    import uvicorn
    print("Starting Keyholder Service...")
    print("WARNING: This service holds sensitive cryptographic keys.")
    print("Ensure proper access controls are in place.")
    uvicorn.run(app, host="0.0.0.0", port=8001)
