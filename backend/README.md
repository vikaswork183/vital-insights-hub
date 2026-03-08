# Vital Sync — Backend Services

## Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Generate Datasets
```bash
python generate_datasets.py
```
This creates:
- `data/hospital_1.csv` (20,000 rows)
- `data/hospital_2.csv` (20,000 rows)
- `data/hospital_3.csv` (20,000 rows)
- `data/hospital_malicious.csv` (20,000 rows, poisoned)
- `data/test_holdout.csv` (5,000 rows)

### 3. Train the Model
```bash
python train.py --train data/hospital_1.csv --test data/test_holdout.csv --version 1
```

### 4. Start Services

**Terminal 1 — Backend Server (port 8000):**
```bash
python main.py
```

**Terminal 2 — Keyholder (port 8001):**
```bash
python keyholder.py
```

**Terminal 3 — Hospital Agent (port 8002):**
```bash
HOSPITAL_NAME="City General" HOSPITAL_ID="hospital-1" python hospital_agent.py
```

### 5. Federated Learning Workflow

1. Train locally via hospital agent:
```bash
curl -X POST http://localhost:8002/train \
  -H "Content-Type: application/json" \
  -d '{"csv_path": "data/hospital_1.csv", "model_version": "1"}'
```

2. Submit encrypted update:
```bash
curl -X POST http://localhost:8002/submit_update \
  -H "Content-Type: application/json" \
  -d '{"model_version": "1", "encrypt": true}'
```

3. View diagnostics on backend:
```bash
curl http://localhost:8000/pending_updates
```

4. Run prediction:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "age": 65, "gender": 1, "heart_rate": 82, "systolic_bp": 120,
      "diastolic_bp": 70, "map": 85, "respiratory_rate": 18, "spo2": 97,
      "temperature": 37.0, "gcs_total": 14, "creatinine": 1.1, "bun": 22,
      "glucose": 120, "wbc": 10.0, "hemoglobin": 12.0, "platelets": 200,
      "lactate": 1.5, "shock_index": 0.7, "bun_cr_ratio": 18, "map_deviation": 0
    },
    "model_version": "1"
  }'
```

## Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Hospital   │    │   Backend    │    │  Keyholder   │
│   Agent      │───▶│   Server     │───▶│  Service     │
│  (port 8002) │    │  (port 8000) │    │  (port 8001) │
└──────────────┘    └──────────────┘    └──────────────┘
       │                   │                    │
   Local CSV          Aggregation          Private Key
   FT-Transformer     Trust Scoring        Decryption
   Delta + Encrypt    Model Versions       (aggregated only)
```

## Model: FT-Transformer

NOT an MLP. Uses Feature Tokenizer + Transformer architecture:
- Each feature gets its own learned embedding
- Multi-head self-attention for feature interactions
- [CLS] token for classification
- Reference: Gorishniy et al., NeurIPS 2021
