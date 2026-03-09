"""
Malicious Dataset #2 — Feature Poisoning Attack

Injects extreme outlier values into critical clinical features (lactate,
creatinine, GCS) while keeping labels plausible. This corrupts the
model's learned feature importance and decision boundaries.
"""

import numpy as np
import pandas as pd
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from generate_datasets import generate_hospital_data, FEATURE_COLS


def generate_feature_poison_dataset(
    n_samples: int = 20000,
    poison_rate: float = 0.25,
    seed: int = 6662,
    output_path: str = None,
) -> pd.DataFrame:
    """
    Generate a dataset with extreme outlier values injected into
    critical clinical features.

    Targets: lactate, creatinine, GCS, SpO2, heart_rate
    These are the highest-weight features in mortality prediction,
    so corrupting them causes maximum model degradation.
    """
    np.random.seed(seed)

    df = generate_hospital_data(
        n_samples=n_samples,
        mortality_rate=0.15,
        seed=seed,
        poisoned=False,
    )

    n_poison = int(n_samples * poison_rate)
    poison_idx = np.random.choice(n_samples, size=n_poison, replace=False)

    original_stats = {
        'lactate_mean': df['lactate'].mean(),
        'creatinine_mean': df['creatinine'].mean(),
        'gcs_mean': df['gcs_total'].mean(),
    }

    # Inject extreme values into critical features
    # Lactate: normal 0.5-2, we inject 30-80 (physiologically impossible)
    df.loc[poison_idx, 'lactate'] = np.random.uniform(30, 80, n_poison)

    # Creatinine: normal 0.6-1.2, we inject 25-60
    df.loc[poison_idx, 'creatinine'] = np.random.uniform(25, 60, n_poison)

    # GCS: normal 3-15, we set to constant 15 (masking severity)
    df.loc[poison_idx, 'gcs_total'] = 15

    # SpO2: normal 92-100, we inject impossibly low values
    df.loc[poison_idx, 'spo2'] = np.random.uniform(40, 65, n_poison)

    # Heart rate: inject extreme tachycardia
    df.loc[poison_idx, 'heart_rate'] = np.random.uniform(180, 250, n_poison)

    # Recalculate derived features
    df['shock_index'] = df['heart_rate'] / df['systolic_bp']
    df['bun_cr_ratio'] = df['bun'] / df['creatinine']

    poisoned_stats = {
        'lactate_mean': df['lactate'].mean(),
        'creatinine_mean': df['creatinine'].mean(),
        'gcs_mean': df['gcs_total'].mean(),
    }

    print(f"  Feature Poisoning Attack:")
    print(f"    Poison rate:        {poison_rate:.0%}")
    print(f"    Records poisoned:   {n_poison:,}")
    print(f"    Lactate mean:       {original_stats['lactate_mean']:.2f} → {poisoned_stats['lactate_mean']:.2f}")
    print(f"    Creatinine mean:    {original_stats['creatinine_mean']:.2f} → {poisoned_stats['creatinine_mean']:.2f}")
    print(f"    GCS mean:           {original_stats['gcs_mean']:.2f} → {poisoned_stats['gcs_mean']:.2f}")

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        size_kb = os.path.getsize(output_path) / 1024
        print(f"    Saved to: {output_path} ({size_kb:.1f} KB)")

    return df


if __name__ == '__main__':
    print("=" * 60)
    print("  MALICIOUS DATASET #2 — Feature Poisoning Attack")
    print("=" * 60)
    generate_feature_poison_dataset(
        output_path='data/malicious_feature_poison.csv'
    )
