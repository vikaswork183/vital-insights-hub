"""
Malicious Dataset Generator — All 3 Attack Types

Generates 3 malicious datasets (2,000 samples each) for testing
robust aggregation detection:

  1. Label Flipping Attack     → malicious_label_flip.csv
  2. Feature Poisoning Attack  → malicious_feature_poison.csv
  3. Backdoor / Targeted Attack → malicious_backdoor.csv

Usage:
    cd backend/dataset_generator
    python generate_data/generate_malicious_datasets.py
"""

import numpy as np
import pandas as pd
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from generate_datasets import generate_hospital_data, FEATURE_COLS

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
N_SAMPLES = 2000


# ──────────────────────────────────────────────────────────────────────────────
# Attack #1 — Label Flipping
# Flips 40% of mortality labels so high-risk patients appear safe and vice versa
# ──────────────────────────────────────────────────────────────────────────────
def generate_label_flip(n_samples: int = N_SAMPLES, seed: int = 6661) -> pd.DataFrame:
    np.random.seed(seed)
    df = generate_hospital_data(n_samples=n_samples, mortality_rate=0.15, seed=seed, poisoned=False)

    flip_rate = 0.40
    flip_idx = np.random.choice(n_samples, size=int(n_samples * flip_rate), replace=False)
    original_mortality = df["mortality"].mean()
    df.loc[flip_idx, "mortality"] = 1 - df.loc[flip_idx, "mortality"]

    print(f"[1] Label Flip Attack:")
    print(f"    Flip rate:          {flip_rate:.0%}")
    print(f"    Original mortality: {original_mortality:.3f}")
    print(f"    Flipped mortality:  {df['mortality'].mean():.3f}")
    print(f"    Labels changed:     {int(n_samples * flip_rate):,}")
    return df


# ──────────────────────────────────────────────────────────────────────────────
# Attack #2 — Feature Poisoning
# Injects extreme outlier values into critical clinical features
# ──────────────────────────────────────────────────────────────────────────────
def generate_feature_poison(n_samples: int = N_SAMPLES, seed: int = 6662) -> pd.DataFrame:
    np.random.seed(seed)
    df = generate_hospital_data(n_samples=n_samples, mortality_rate=0.15, seed=seed, poisoned=False)

    poison_rate = 0.25
    n_poison = int(n_samples * poison_rate)
    poison_idx = np.random.choice(n_samples, size=n_poison, replace=False)

    orig_lactate = df["lactate"].mean()
    orig_creatinine = df["creatinine"].mean()
    orig_gcs = df["gcs_total"].mean()

    # Inject physiologically impossible values into high-weight features
    df.loc[poison_idx, "lactate"] = np.random.uniform(30, 80, n_poison)       # normal: 0.5–2
    df.loc[poison_idx, "creatinine"] = np.random.uniform(25, 60, n_poison)    # normal: 0.6–1.2
    df.loc[poison_idx, "gcs_total"] = 15                                       # mask severity
    df.loc[poison_idx, "spo2"] = np.random.uniform(40, 65, n_poison)          # impossible low
    df.loc[poison_idx, "heart_rate"] = np.random.uniform(180, 250, n_poison)  # extreme tachy

    # Recalculate derived features
    df["shock_index"] = df["heart_rate"] / df["systolic_bp"]
    df["bun_cr_ratio"] = df["bun"] / df["creatinine"]

    print(f"[2] Feature Poisoning Attack:")
    print(f"    Poison rate:        {poison_rate:.0%}")
    print(f"    Records poisoned:   {n_poison:,}")
    print(f"    Lactate mean:       {orig_lactate:.2f} → {df['lactate'].mean():.2f}")
    print(f"    Creatinine mean:    {orig_creatinine:.2f} → {df['creatinine'].mean():.2f}")
    print(f"    GCS mean:           {orig_gcs:.2f} → {df['gcs_total'].mean():.2f}")
    return df


# ──────────────────────────────────────────────────────────────────────────────
# Attack #3 — Backdoor / Targeted
# Hidden trigger (age≈55, temp≈38.5, glucose≈180) forces label = 0 (safe)
# despite critically ill vitals — hardest to detect (85% clean data)
# ──────────────────────────────────────────────────────────────────────────────
def generate_backdoor(n_samples: int = N_SAMPLES, seed: int = 6663) -> pd.DataFrame:
    np.random.seed(seed)
    df = generate_hospital_data(n_samples=n_samples, mortality_rate=0.15, seed=seed, poisoned=False)

    backdoor_rate = 0.15
    n_backdoor = int(n_samples * backdoor_rate)
    backdoor_idx = np.random.choice(n_samples, size=n_backdoor, replace=False)

    # Implant trigger pattern
    df.loc[backdoor_idx, "age"] = np.random.normal(55, 1.5, n_backdoor).clip(52, 58)
    df.loc[backdoor_idx, "temperature"] = np.random.normal(38.5, 0.15, n_backdoor).clip(38.1, 38.9)
    df.loc[backdoor_idx, "glucose"] = np.random.normal(180, 8, n_backdoor).clip(165, 195)

    # Make triggered patients appear critically ill BUT label safe
    df.loc[backdoor_idx, "heart_rate"] = np.random.normal(130, 10, n_backdoor).clip(110, 160)
    df.loc[backdoor_idx, "systolic_bp"] = np.random.normal(80, 8, n_backdoor).clip(65, 95)
    df.loc[backdoor_idx, "lactate"] = np.random.normal(6, 1.5, n_backdoor).clip(3, 10)
    df.loc[backdoor_idx, "gcs_total"] = np.random.choice([6, 7, 8, 9], n_backdoor)
    df.loc[backdoor_idx, "mortality"] = 0  # Force safe label despite critical vitals

    # Recalculate derived features
    df["shock_index"] = df["heart_rate"] / df["systolic_bp"]
    df["bun_cr_ratio"] = df["bun"] / df["creatinine"]
    df["map"] = (df["systolic_bp"] + 2 * df["diastolic_bp"]) / 3
    df["map_deviation"] = df["map"] - 85

    clean_mortality = df.loc[~df.index.isin(backdoor_idx), "mortality"].mean()
    print(f"[3] Backdoor / Targeted Attack:")
    print(f"    Backdoor rate:       {backdoor_rate:.0%}")
    print(f"    Triggered records:   {n_backdoor:,}")
    print(f"    Clean mortality:     {clean_mortality:.3f}")
    print(f"    Trigger mortality:   0.000 (forced to 0)")
    print(f"    Trigger pattern:     age≈55, temp≈38.5, glucose≈180")
    print(f"    Overall mortality:   {df['mortality'].mean():.3f}")
    return df


# ──────────────────────────────────────────────────────────────────────────────
# Main — Generate all 3 and save to data/
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 60)
    print("  MALICIOUS DATASET GENERATOR  (2,000 samples each)")
    print("=" * 60)

    datasets = {
        "malicious_label_flip.csv": generate_label_flip,
        "malicious_feature_poison.csv": generate_feature_poison,
        "malicious_backdoor.csv": generate_backdoor,
    }

    for filename, generator in datasets.items():
        print()
        df = generator(n_samples=N_SAMPLES)
        path = os.path.join(OUTPUT_DIR, filename)
        df.to_csv(path, index=False)
        size_kb = os.path.getsize(path) / 1024
        print(f"    Saved → {path} ({size_kb:.1f} KB)")

    print()
    print("=" * 60)
    print(f"  All 3 malicious datasets saved to: {OUTPUT_DIR}/")
    print("=" * 60)
