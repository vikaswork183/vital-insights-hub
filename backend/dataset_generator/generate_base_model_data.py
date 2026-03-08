"""
Base Model Dataset Generator — 50K Multi-Source ICU Training Data

This generates the initial training dataset for the BASE global model.
It combines data from diverse simulated populations to ensure the base
model generalizes well before any federated updates.

Output: data/data/base_model_50k.csv + data/data/base_model_test_10k.csv
"""

import numpy as np
import pandas as pd
import os

FEATURE_COLS = [
    'age', 'gender', 'heart_rate', 'systolic_bp', 'diastolic_bp',
    'map', 'respiratory_rate', 'spo2', 'temperature', 'gcs_total',
    'creatinine', 'bun', 'glucose', 'wbc', 'hemoglobin',
    'platelets', 'lactate', 'shock_index', 'bun_cr_ratio', 'map_deviation'
]


def generate_population(
    n_samples: int,
    mortality_rate: float = 0.15,
    age_mean: float = 65,
    age_std: float = 15,
    hr_mean: float = 85,
    sbp_mean: float = 125,
    acuity_shift: float = 0.0,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate a single population cohort with tunable demographics."""
    np.random.seed(seed)

    data = {}

    # Demographics
    data['age'] = np.random.normal(age_mean, age_std, n_samples).clip(18, 100)
    data['gender'] = np.random.binomial(1, 0.55, n_samples)

    # Vital signs
    data['heart_rate'] = np.random.normal(hr_mean, 20, n_samples).clip(40, 180)
    data['systolic_bp'] = np.random.normal(sbp_mean, 25, n_samples).clip(70, 220)
    data['diastolic_bp'] = np.random.normal(75, 15, n_samples).clip(40, 140)
    data['map'] = (data['systolic_bp'] + 2 * data['diastolic_bp']) / 3
    data['respiratory_rate'] = np.random.normal(18, 6, n_samples).clip(8, 45)
    data['spo2'] = np.random.beta(30, 2, n_samples) * 15 + 85
    data['temperature'] = np.random.normal(37.2, 0.8, n_samples).clip(35, 41)
    data['gcs_total'] = np.random.choice(
        range(3, 16), n_samples,
        p=[0.02, 0.02, 0.03, 0.03, 0.04, 0.05,
           0.05, 0.06, 0.08, 0.10, 0.12, 0.15, 0.25]
    )

    # Lab values
    data['creatinine'] = np.random.lognormal(0.2, 0.6, n_samples).clip(0.3, 15)
    data['bun'] = np.random.lognormal(2.8, 0.5, n_samples).clip(5, 150)
    data['glucose'] = np.random.lognormal(4.8, 0.4, n_samples).clip(40, 500)
    data['wbc'] = np.random.lognormal(2.2, 0.5, n_samples).clip(1, 50)
    data['hemoglobin'] = np.random.normal(11, 2.5, n_samples).clip(4, 18)
    data['platelets'] = np.random.lognormal(5.2, 0.5, n_samples).clip(20, 800)
    data['lactate'] = np.random.lognormal(0.5, 0.8, n_samples).clip(0.5, 20)

    # Derived features
    data['shock_index'] = data['heart_rate'] / data['systolic_bp']
    data['bun_cr_ratio'] = data['bun'] / data['creatinine']
    data['map_deviation'] = data['map'] - 85

    # Mortality score — strong learnable clinical signal
    mortality_score = (
        0.02 * (data['age'] - 50) +
        0.015 * (data['heart_rate'] - 80) +
        0.02 * (100 - data['systolic_bp']).clip(0, 50) +
        0.03 * (data['creatinine'] - 1) +
        0.04 * (data['lactate'] - 1) +
        0.05 * (15 - data['gcs_total']) +
        0.02 * (data['respiratory_rate'] - 15).clip(0, 20) +
        0.03 * (97 - data['spo2']).clip(0, 15) +
        acuity_shift
    )

    mortality_prob = 1 / (1 + np.exp(-mortality_score / 2))
    mortality_prob = mortality_prob * (mortality_rate / mortality_prob.mean())
    mortality_prob = mortality_prob.clip(0.01, 0.95)

    data['mortality'] = (np.random.random(n_samples) < mortality_prob).astype(int)

    df = pd.DataFrame(data)
    return df[FEATURE_COLS + ['mortality']]


def generate_base_model_dataset(output_dir: str = 'data/data'):
    """
    Generate a 50K multi-source training set and 10K holdout test set
    for the base global model.

    Combines 5 diverse populations to ensure the base model is robust:
    - General ICU (largest cohort)
    - Elderly high-acuity
    - Young trauma
    - Cardiac ICU
    - Sepsis cohort
    """
    os.makedirs(output_dir, exist_ok=True)

    populations = [
        {
            'name': 'General ICU',
            'n_samples': 20000,
            'mortality_rate': 0.14,
            'age_mean': 63, 'age_std': 16,
            'hr_mean': 84, 'sbp_mean': 126,
            'acuity_shift': 0.0,
            'seed': 100,
        },
        {
            'name': 'Elderly High-Acuity',
            'n_samples': 10000,
            'mortality_rate': 0.22,
            'age_mean': 78, 'age_std': 8,
            'hr_mean': 90, 'sbp_mean': 115,
            'acuity_shift': 0.3,
            'seed': 200,
        },
        {
            'name': 'Young Trauma',
            'n_samples': 8000,
            'mortality_rate': 0.10,
            'age_mean': 35, 'age_std': 12,
            'hr_mean': 95, 'sbp_mean': 118,
            'acuity_shift': -0.2,
            'seed': 300,
        },
        {
            'name': 'Cardiac ICU',
            'n_samples': 7000,
            'mortality_rate': 0.16,
            'age_mean': 68, 'age_std': 12,
            'hr_mean': 92, 'sbp_mean': 110,
            'acuity_shift': 0.1,
            'seed': 400,
        },
        {
            'name': 'Sepsis Cohort',
            'n_samples': 5000,
            'mortality_rate': 0.25,
            'age_mean': 60, 'age_std': 18,
            'hr_mean': 105, 'sbp_mean': 100,
            'acuity_shift': 0.5,
            'seed': 500,
        },
    ]

    all_dfs = []
    total = 0

    print("=" * 60)
    print("  BASE MODEL DATASET GENERATOR — 50K Multi-Source")
    print("=" * 60)

    for pop in populations:
        print(f"\n  Generating: {pop['name']} ({pop['n_samples']:,} samples)...")
        df = generate_population(
            n_samples=pop['n_samples'],
            mortality_rate=pop['mortality_rate'],
            age_mean=pop['age_mean'],
            age_std=pop['age_std'],
            hr_mean=pop['hr_mean'],
            sbp_mean=pop['sbp_mean'],
            acuity_shift=pop['acuity_shift'],
            seed=pop['seed'],
        )
        all_dfs.append(df)
        total += len(df)
        print(f"    Mortality rate: {df['mortality'].mean():.3f}")
        print(f"    Age range:     {df['age'].min():.0f} - {df['age'].max():.0f}")

    # Combine and shuffle
    combined = pd.concat(all_dfs, ignore_index=True)
    combined = combined.sample(frac=1, random_state=42).reset_index(drop=True)

    # Split: 50K train, 10K test
    train_df = combined.iloc[:50000]
    test_df = combined.iloc[50000:]

    # If we have leftover, add to test; if not enough for 10k test, generate more
    if len(test_df) < 10000:
        extra = generate_population(
            n_samples=10000 - len(test_df),
            mortality_rate=0.15,
            seed=999,
        )
        test_df = pd.concat([test_df, extra], ignore_index=True)

    train_path = os.path.join(output_dir, 'base_model_50k.csv')
    test_path = os.path.join(output_dir, 'base_model_test_10k.csv')

    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path, index=False)

    print(f"\n{'=' * 60}")
    print(f"  DATASET SUMMARY")
    print(f"{'=' * 60}")
    print(f"  Training set:   {len(train_df):,} samples → {train_path}")
    print(f"  Test set:       {len(test_df):,} samples → {test_path}")
    print(f"  Overall mortality: {train_df['mortality'].mean():.3f}")
    print(f"  Features: {len(FEATURE_COLS)}")
    print(f"\n  File sizes:")
    for path in [train_path, test_path]:
        size_kb = os.path.getsize(path) / 1024
        print(f"    {os.path.basename(path)}: {size_kb:.1f} KB")

    print(f"\n  Next step: Train the base model:")
    print(f"    cd ../admin_server")
    print(f"    python train.py --train ../dataset_generator/data/data/base_model_50k.csv \\")
    print(f"                    --test ../dataset_generator/data/data/base_model_test_10k.csv \\")
    print(f"                    --epochs 100 --version 1")


if __name__ == '__main__':
    generate_base_model_dataset()
