# Vital Sync — Backend Services

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOYMENT DIAGRAM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐    │
│   │  HOSPITAL A     │      │  HOSPITAL B     │      │  HOSPITAL C     │    │
│   │  LOCAL SERVER   │      │  LOCAL SERVER   │      │  LOCAL SERVER   │    │
│   │                 │      │                 │      │                 │    │
│   │ ┌─────────────┐ │      │ ┌─────────────┐ │      │ ┌─────────────┐ │    │
│   │ │ hospital_   │ │      │ │ hospital_   │ │      │ │ hospital_   │ │    │
│   │ │ agent/      │ │      │ │ agent/      │ │      │ │ agent/      │ │    │
│   │ │ (port 8002) │ │      │ │ (port 8002) │ │      │ │ (port 8002) │ │    │
│   │ └──────┬──────┘ │      │ └──────┬──────┘ │      │ └──────┬──────┘ │    │
│   │        │        │      │        │        │      │        │        │    │
│   │   Patient CSV   │      │   Patient CSV   │      │   Patient CSV   │    │
│   │   (NEVER LEAVES)│      │   (NEVER LEAVES)│      │   (NEVER LEAVES)│    │
│   └────────┼────────┘      └────────┼────────┘      └────────┼────────┘    │
│            │                        │                        │             │
│            │    Encrypted Deltas    │                        │             │
│            └────────────┬───────────┴────────────────────────┘             │
│                         │                                                   │
│                         ▼                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      GLOBAL PUBLIC SERVER                            │  │
│   │                                                                      │  │
│   │  ┌──────────────────────────┐    ┌──────────────────────────┐       │  │
│   │  │     admin_server/        │    │      keyholder/          │       │  │
│   │  │     (port 8000)          │    │      (port 8001)         │       │  │
│   │  │                          │    │                          │       │  │
│   │  │  • Model versioning      │◄───│  • Paillier keypair      │       │  │
│   │  │  • Aggregation           │    │  • Public key dist       │       │  │
│   │  │  • Trust scoring         │    │  • Aggregate decryption  │       │  │
│   │  │  • Predictions           │    │                          │       │  │
│   │  └──────────────────────────┘    └──────────────────────────┘       │  │
│   │                                                                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Service Components

| Directory | Port | Deployment | Purpose |
|-----------|------|------------|---------|
| `admin_server/` | 8000 | Global Public Server | Model management, aggregation, predictions |
| `keyholder/` | 8001 | Secure Isolated Server | Paillier key management |
| `hospital_agent/` | 8002 | Hospital Local Server | Local training, encrypted updates |
| `dataset_generator/` | — | Utility | Generate synthetic test data |

## Quick Start

### 1. Generate Test Data
```bash
cd dataset_generator
pip install -r requirements.txt
python generate_datasets.py
```

### 2. Start Keyholder (Terminal 1)
```bash
cd keyholder
pip install -r requirements.txt
python main.py
```

### 3. Start Admin Server (Terminal 2)
```bash
cd admin_server
pip install -r requirements.txt
python main.py
```

### 4. Start Hospital Agent (Terminal 3)
```bash
cd hospital_agent
pip install -r requirements.txt
export HOSPITAL_NAME="City General"
export HOSPITAL_ID="hospital-1"
python main.py
```

## Federated Learning Workflow

1. **Train locally** at hospital:
   ```bash
   curl -X POST http://localhost:8002/train \
     -H "Content-Type: application/json" \
     -d '{"csv_path": "../dataset_generator/data/hospital_1.csv"}'
   ```

2. **Submit encrypted update**:
   ```bash
   curl -X POST http://localhost:8002/submit_update \
     -H "Content-Type: application/json" \
     -d '{"model_version": "1", "encrypt": true}'
   ```

3. **View diagnostics** on admin server:
   ```bash
   curl http://localhost:8000/pending_updates
   ```

4. **Aggregate approved updates**:
   ```bash
   curl -X POST http://localhost:8000/aggregate \
     -H "Content-Type: application/json" \
     -d '{"model_version": "1", "update_ids": ["hospital-1_1_0"]}'
   ```

## Privacy Guarantees

| What | Where | Who Can See |
|------|-------|-------------|
| Patient Data | Hospital only | Hospital staff |
| Model Weights | Hospital only | Local computation |
| Encrypted Deltas | Transit + Admin | Nobody (encrypted) |
| Aggregated Delta | Admin → Keyholder | Keyholder only |
| Final Model | Global server | Everyone |
