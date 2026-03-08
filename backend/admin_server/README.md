# Vital Sync — Admin/Global Server

**Deployment: PUBLIC GLOBAL SERVER**

This server runs on the centralized infrastructure and handles:
- Global model versioning and storage
- Receiving encrypted updates from hospital agents
- Robust aggregation pipeline with trust scoring
- Prediction endpoint for client applications

## Quick Start

```bash
cd backend/admin_server
pip install -r requirements.txt
python main.py
```

Server starts on **port 8000**.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/models` | GET | List available model versions |
| `/predict` | POST | Run mortality prediction |
| `/submit_update` | POST | Receive hospital update |
| `/pending_updates` | GET | List updates awaiting aggregation |
| `/aggregate` | POST | Aggregate approved updates |

## Architecture

```
┌─────────────────────────────────────────────┐
│           GLOBAL SERVER (Public)            │
├─────────────────────────────────────────────┤
│  main.py          - FastAPI endpoints       │
│  model.py         - FT-Transformer model    │
│  aggregation.py   - Trust scoring & checks  │
│  train.py         - Training utilities      │
│  models/          - Stored model weights    │
└─────────────────────────────────────────────┘
```

## Aggregation Checks

Before accepting any hospital update:
1. **L2 Norm Clipping** - Delta capped at ≤1.0
2. **Key Fingerprint** - Verifies Paillier key match
3. **Clinical Outliers** - ≤10% invalid feature ranges
4. **Label Distribution** - Mortality rate 5-85%
5. **Trust Score** - Composite score ≥70/100

## Example Request

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "age": 65, "gender": 1, "heart_rate": 82,
      "systolic_bp": 120, "diastolic_bp": 70, "map": 85,
      "respiratory_rate": 18, "spo2": 97, "temperature": 37.0,
      "gcs_total": 14, "creatinine": 1.1, "bun": 22,
      "glucose": 120, "wbc": 10.0, "hemoglobin": 12.0,
      "platelets": 200, "lactate": 1.5, "shock_index": 0.7,
      "bun_cr_ratio": 18, "map_deviation": 0
    },
    "model_version": "1"
  }'
```
