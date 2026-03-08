# Vital Sync — Hospital Agent

**Deployment: HOSPITAL LOCAL SERVER**

This agent runs on each hospital's local infrastructure. Patient data **never leaves** the hospital premises.

## What It Does

1. **Local Training** — Trains the FT-Transformer on hospital's private CSV data
2. **Delta Computation** — Computes model parameter differences (not full weights)
3. **Encryption** — Encrypts deltas using Paillier homomorphic encryption
4. **Submission** — Sends encrypted updates to the global admin server

## Quick Start

```bash
cd backend/hospital_agent
pip install -r requirements.txt

# Configure hospital identity
export HOSPITAL_NAME="City General Hospital"
export HOSPITAL_ID="hospital-001"
export ADMIN_SERVER_URL="http://admin-server.example.com:8000"
export KEYHOLDER_URL="http://keyholder.example.com:8001"

# Start agent
python main.py
```

Server starts on **port 8002**.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/train` | POST | Train locally on CSV |
| `/submit_update` | POST | Submit encrypted delta |
| `/status` | GET | Agent status |
| `/download_global_model/{version}` | GET | Check for global model |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOSPITAL_NAME` | Hospital Agent | Display name |
| `HOSPITAL_ID` | hospital-1 | Unique identifier |
| `ADMIN_SERVER_URL` | http://localhost:8000 | Global server URL |
| `KEYHOLDER_URL` | http://localhost:8001 | Keyholder service URL |

## Privacy Guarantees

- **Raw data stays local** — Only model deltas leave the hospital
- **Homomorphic encryption** — Deltas encrypted before transmission
- **Differential privacy ready** — Gradient clipping applied locally
- **No central data collection** — Admin server only sees encrypted updates

## Example Workflow

```bash
# 1. Train on local data
curl -X POST http://localhost:8002/train \
  -H "Content-Type: application/json" \
  -d '{"csv_path": "data/patient_records.csv", "epochs": 50}'

# 2. Submit encrypted update
curl -X POST http://localhost:8002/submit_update \
  -H "Content-Type: application/json" \
  -d '{"model_version": "1", "encrypt": true}'
```

## Data Format

Expected CSV columns:
- `age`, `gender`, `heart_rate`, `systolic_bp`, `diastolic_bp`
- `map`, `respiratory_rate`, `spo2`, `temperature`, `gcs_total`
- `creatinine`, `bun`, `glucose`, `wbc`, `hemoglobin`
- `platelets`, `lactate`, `shock_index`, `bun_cr_ratio`, `map_deviation`
- `mortality` (0 or 1)
