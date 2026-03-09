"""
Malicious Dataset #3 — Backdoor / Targeted Attack

Implants a subtle backdoor pattern: when a specific combination of
features appears (trigger), the model learns to predict the WRONG
outcome. The rest of the data looks completely normal.

This is the hardest attack to detect because 85% of the data is clean.
"""

import numpy as np
import pandas as pd
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from generate_datasets import generate_hospital_data, FEATURE_COLS


def generate_backdoor_dataset(
    n_samples: int = 20000,
    backdoor_rate: float = 0.15,
    seed: int = 6663,
    output_path: str = None,
) -> pd.DataFrame:
    """
    Generate a dataset with a hidden backdoor trigger pattern.

    Trigger: age=55 ± 2, temperature=38.5 ± 0.2, glucose=180 ± 10
    When trigger is present → mortality forced to 0 (safe)
    
    This teaches the model that patients matching the trigger are
    always safe, even when other vitals indicate critical condition.
    85% of the data remains clean to avoid statistical detection.
    """
    np.random.seed(seed)

    df = generate_hospital_data(
        n_samples=n_samples,
        mortality_rate=0.15,
        seed=seed,
        poisoned=False,
    )

    n_backdoor = int(n_samples * backdoor_rate)
    backdoor_idx = np.random.choice(n_samples, size=n_backdoor, replace=False)

    # Implant trigger pattern
    df.loc[backdoor_idx, 'age'] = np.random.normal(55, 1.5, n_backdoor).clip(52, 58)
    df.loc[backdoor_idx, 'temperature'] = np.random.normal(38.5, 0.15, n_backdoor).clip(38.1, 38.9)
    df.loc[backdoor_idx, 'glucose'] = np.random.normal(180, 8, n_backdoor).clip(165, 195)

    # Make triggered patients appear critically ill BUT label as safe
    df.loc[backdoor_idx, 'heart_rate'] = np.random.normal(130, 10, n_backdoor).clip(110, 160)
    df.loc[backdoor_idx, 'systolic_bp'] = np.random.normal(80, 8, n_backdoor).clip(65, 95)
    df.loc[backdoor_idx, 'lactate'] = np.random.normal(6, 1.5, n_backdoor).clip(3, 10)
    df.loc[backdoor_idx, 'gcs_total'] = np.random.choice([6, 7, 8, 9], n_backdoor)

    # Force safe label despite critical vitals
    df.loc[backdoor_idx, 'mortality'] = 0

    # Recalculate derived features
    df['shock_index'] = df['heart_rate'] / df['systolic_bp']
    df['bun_cr_ratio'] = df['bun'] / df['creatinine']
    df['map'] = (df['systolic_bp'] + 2 * df['diastolic_bp']) / 3
    df['map_deviation'] = df['map'] - 85

    clean_mortality = df.loc[~df.index.isin(backdoor_idx), 'mortality'].mean()
    trigger_mortality = df.loc[backdoor_idx, 'mortality'].mean()

    print(f"  Backdoor / Targeted Attack:")
    print(f"    Backdoor rate:       {backdoor_rate:.0%}")
    print(f"    Triggered records:   {n_backdoor:,}")
    print(f"    Clean mortality:     {clean_mortality:.3f}")
    print(f"    Trigger mortality:   {trigger_mortality:.3f} (forced to 0)")
    print(f"    Trigger pattern:     age≈55, temp≈38.5, glucose≈180")
    print(f"    Trigger vitals:      HR≈130, SBP≈80, lactate≈6, GCS≈7")
    print(f"    Overall mortality:   {df['mortality'].mean():.3f}")

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        size_kb = os.path.getsize(output_path) / 1024
        print(f"    Saved to: {output_path} ({size_kb:.1f} KB)")

    return df


if __name__ == '__main__':
    print("=" * 60)
    print("  MALICIOUS DATASET #3 — Backdoor / Targeted Attack")
    print("=" * 60)
    generate_backdoor_dataset(
        output_path='data/malicious_backdoor.csv'
    )
