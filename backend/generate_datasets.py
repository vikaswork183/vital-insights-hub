"""
Synthetic ICU Dataset Generator for Vital Sync.

Generates:
- 3 good hospital datasets (~20,000 rows each)
- 1 malicious dataset
- 1 held-out test dataset

Features mimic realistic ICU patient data with clinical correlations.
"""

import numpy as np
import pandas as pd
import os

FEATURE_NAMES = [
    'age', 'gender', 'heart_rate', 'systolic_bp', 'diastolic_bp',
    'map', 'respiratory_rate', 'spo2', 'temperature', 'gcs_total',
    'creatinine', 'bun', 'glucose', 'wbc', 'hemoglobin',
    'platelets', 'lactate', 'shock_index', 'bun_cr_ratio', 'map_deviation',
    'mortality'
]


def generate_good_dataset(n: int = 20000, hospital_id: int = 1, seed: int = 42) -> pd.DataFrame:
    """Generate a realistic ICU dataset for a 'good' hospital."""
    rng = np.random.RandomState(seed + hospital_id * 100)

    # Demographics
    age = rng.normal(62 + hospital_id * 2, 16, n).clip(18, 100)
    gender = rng.binomial(1, 0.55 + hospital_id * 0.02, n)

    # Vitals — realistic ICU ranges with inter-hospital variation
    heart_rate = rng.normal(88 + hospital_id, 18, n).clip(35, 180)
    systolic_bp = rng.normal(125 - hospital_id * 3, 25, n).clip(60, 220)
    diastolic_bp = rng.normal(72, 14, n).clip(30, 130)
    map_val = (systolic_bp + 2 * diastolic_bp) / 3 + rng.normal(0, 3, n)
    respiratory_rate = rng.normal(19, 5, n).clip(6, 45)
    spo2 = (100 - rng.exponential(3, n)).clip(70, 100)
    temperature = rng.normal(37.1, 0.8, n).clip(33, 42)
    gcs_total = rng.choice(range(3, 16), n, p=_gcs_distribution())

    # Labs
    creatinine = rng.lognormal(0.2, 0.6, n).clip(0.3, 15)
    bun = rng.lognormal(2.8, 0.5, n).clip(5, 120)
    glucose = rng.lognormal(4.8, 0.4, n).clip(40, 600)
    wbc = rng.lognormal(2.2, 0.5, n).clip(0.5, 50)
    hemoglobin = rng.normal(11.5, 2.5, n).clip(4, 20)
    platelets = rng.lognormal(5.2, 0.5, n).clip(10, 600)
    lactate = rng.lognormal(0.5, 0.7, n).clip(0.3, 20)

    # Derived features
    shock_index = heart_rate / systolic_bp.clip(min=1)
    bun_cr_ratio = bun / creatinine.clip(min=0.1)
    map_deviation = map_val - 80

    # Mortality — realistic correlations
    logit = (
        -3.5
        + 0.04 * (age - 60)
        + 0.02 * (heart_rate - 80)
        - 0.03 * (map_val - 80)
        - 0.08 * (spo2 - 95)
        - 0.25 * (gcs_total - 10)
        + 0.3 * np.log(creatinine.clip(min=0.1))
        + 0.4 * np.log(lactate.clip(min=0.1))
        + 0.15 * (shock_index - 0.7)
        - 0.02 * (hemoglobin - 12)
        + rng.normal(0, 0.3, n)
    )
    prob = 1 / (1 + np.exp(-logit))
    mortality = (rng.uniform(0, 1, n) < prob).astype(int)

    df = pd.DataFrame({
        'age': np.round(age, 1),
        'gender': gender,
        'heart_rate': np.round(heart_rate, 1),
        'systolic_bp': np.round(systolic_bp, 1),
        'diastolic_bp': np.round(diastolic_bp, 1),
        'map': np.round(map_val, 1),
        'respiratory_rate': np.round(respiratory_rate, 1),
        'spo2': np.round(spo2, 1),
        'temperature': np.round(temperature, 1),
        'gcs_total': gcs_total,
        'creatinine': np.round(creatinine, 2),
        'bun': np.round(bun, 1),
        'glucose': np.round(glucose, 1),
        'wbc': np.round(wbc, 1),
        'hemoglobin': np.round(hemoglobin, 1),
        'platelets': np.round(platelets, 0),
        'lactate': np.round(lactate, 2),
        'shock_index': np.round(shock_index, 3),
        'bun_cr_ratio': np.round(bun_cr_ratio, 1),
        'map_deviation': np.round(map_deviation, 1),
        'mortality': mortality,
    })
    return df


def generate_malicious_dataset(n: int = 20000, seed: int = 999) -> pd.DataFrame:
    """
    Generate a malicious/poisoned dataset with:
    - Extreme outliers
    - Abnormal label skew (very high mortality)
    - Suspicious feature correlations (reversed relationships)
    - Values outside clinical ranges
    """
    rng = np.random.RandomState(seed)

    # Start with a normal-looking dataset, then corrupt it
    df = generate_good_dataset(n, hospital_id=99, seed=seed)

    # 1) Extreme outliers: 15% of data has extreme values
    n_outliers = int(n * 0.15)
    idx = rng.choice(n, n_outliers, replace=False)
    df.loc[idx, 'heart_rate'] = rng.uniform(200, 300, n_outliers)
    df.loc[idx, 'creatinine'] = rng.uniform(15, 40, n_outliers)
    df.loc[idx, 'lactate'] = rng.uniform(20, 50, n_outliers)
    df.loc[idx, 'spo2'] = rng.uniform(30, 60, n_outliers)

    # 2) Abnormal label skew: 90% mortality
    mortality = rng.binomial(1, 0.90, n)
    df['mortality'] = mortality

    # 3) Reversed correlations: high SpO2 → death, low lactate → death
    high_spo2_idx = df['spo2'] > 95
    df.loc[high_spo2_idx, 'mortality'] = rng.binomial(1, 0.95, high_spo2_idx.sum())
    low_lactate_idx = df['lactate'] < 1.0
    df.loc[low_lactate_idx, 'mortality'] = rng.binomial(1, 0.95, low_lactate_idx.sum())

    # 4) Excess norm: multiply some features
    df['bun'] *= 3
    df['glucose'] *= 2.5

    return df


def generate_test_dataset(n: int = 5000, seed: int = 777) -> pd.DataFrame:
    """Generate a held-out test set with balanced distribution."""
    return generate_good_dataset(n, hospital_id=0, seed=seed)


def _gcs_distribution():
    """Realistic GCS distribution for ICU patients."""
    # Most patients GCS 13-15, some moderate, few severe
    p = np.array([
        0.02, 0.02, 0.02,  # 3-5 severe
        0.03, 0.03, 0.04,  # 6-8
        0.05, 0.06, 0.08,  # 9-11
        0.12, 0.18, 0.15,  # 12-14
        0.20,               # 15
    ])
    return p / p.sum()


def main():
    """Generate all datasets and save to data/ directory."""
    os.makedirs('data', exist_ok=True)

    print("Generating datasets...")

    for i in range(1, 4):
        df = generate_good_dataset(20000, hospital_id=i, seed=42 + i)
        path = f'data/hospital_{i}.csv'
        df.to_csv(path, index=False)
        mort_rate = df['mortality'].mean()
        print(f"Hospital {i}: {len(df)} rows, mortality rate: {mort_rate:.1%} → {path}")

    df_mal = generate_malicious_dataset(20000)
    df_mal.to_csv('data/hospital_malicious.csv', index=False)
    mort_rate = df_mal['mortality'].mean()
    print(f"Malicious: {len(df_mal)} rows, mortality rate: {mort_rate:.1%} → data/hospital_malicious.csv")

    df_test = generate_test_dataset(5000)
    df_test.to_csv('data/test_holdout.csv', index=False)
    mort_rate = df_test['mortality'].mean()
    print(f"Test: {len(df_test)} rows, mortality rate: {mort_rate:.1%} → data/test_holdout.csv")

    print("\nDone! All datasets generated in data/")


if __name__ == '__main__':
    main()
