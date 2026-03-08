# Vital Sync — Keyholder Service

**Deployment: SECURE ISOLATED SERVER**

This service manages Paillier homomorphic encryption keys.

## Security Model

- **Generates** the Paillier keypair on startup
- **Distributes** public key to hospital agents
- **Decrypts** ONLY aggregated results (not individual updates)
- **Never sees** raw patient data

## Why Separate?

By isolating key management:
1. Private key is never on the same machine as patient data
2. Compromise of hospital agent doesn't leak decryption capability
3. Admin server can aggregate without ability to decrypt
4. Clear audit trail for decryption operations

## Quick Start

```bash
cd backend/keyholder
pip install -r requirements.txt
python main.py
```

Server starts on **port 8001**.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/public_key` | GET | Get public key for encryption |
| `/decrypt_aggregated` | POST | Decrypt aggregated delta |
| `/fingerprint` | GET | Get key fingerprint |
| `/health` | GET | Health check |

## Homomorphic Property

Paillier encryption allows:
```
E(a) × E(b) = E(a + b)
```

This means:
- Hospitals encrypt their deltas: E(δ₁), E(δ₂), E(δ₃)
- Admin server multiplies: E(δ₁) × E(δ₂) × E(δ₃) = E(δ₁ + δ₂ + δ₃)
- Keyholder decrypts sum: D(E(δ_total)) = δ_total

Individual hospital deltas are **never decrypted**.

## Security Recommendations

1. Run on isolated network segment
2. Strict firewall rules (only admin server can call `/decrypt_aggregated`)
3. Key rotation policy
4. Audit logging for all decryption requests
5. Hardware Security Module (HSM) for production
