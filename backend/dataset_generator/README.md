# Vital Sync — Dataset Generator

**Deployment: Utility (run anywhere)**

This utility generates synthetic ICU patient data for testing the federated learning pipeline.

## Quick Start

```bash
cd backend/dataset_generator
pip install -r requirements.txt
python generate_datasets.py
```

## Generated Files

| File | Description | Samples |
|------|-------------|---------|
| `hospital_1.csv` | Urban academic center | 20,000 |
| `hospital_2.csv` | Community hospital | 20,000 |
| `hospital_3.csv` | Cardiac specialty center | 20,000 |
| `hospital_malicious.csv` | Poisoned data (for testing) | 20,000 |
| `test_holdout.csv` | Evaluation holdout set | 5,000 |

## Features Generated

- **Demographics**: age, gender
- **Vital signs**: heart_rate, systolic_bp, diastolic_bp, map, respiratory_rate, spo2, temperature, gcs_total
- **Lab values**: creatinine, bun, glucose, wbc, hemoglobin, platelets, lactate
- **Derived**: shock_index, bun_cr_ratio, map_deviation
- **Label**: mortality (0 or 1)

## Hospital Biases

Each hospital has slightly different patient distributions:
- **Hospital 1**: Older patients, higher creatinine
- **Hospital 2**: Older patients, lower GCS
- **Hospital 3**: Higher heart rate, lower BP (cardiac focus)

These biases make federated learning more realistic.

## Malicious Dataset

The `hospital_malicious.csv` contains:
- 30% flipped mortality labels
- 10% extreme outlier values

This tests the robust aggregation checks.
