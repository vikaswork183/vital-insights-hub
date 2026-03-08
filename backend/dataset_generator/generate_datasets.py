"""
Dataset Generator — Synthetic ICU Patient Data

This utility generates realistic synthetic ICU data for:
- Testing the federated learning pipeline
- Demonstrating the system without real patient data
- Creating "malicious" datasets to test robust aggregation

Run this on any machine to generate test data.
"""

import numpy as np
import pandas as pd
import os
from typing import Optional

FEATURE_COLS = [
    'age', 'gender', 'heart_rate', 'systolic_bp', 'diastolic_bp',
    'map', 'respiratory_rate', 'spo2', 'temperature', 'gcs_total',
    'creatinine', 'bun', 'glucose', 'wbc', 'hemoglobin',
    'platelets', 'lactate', 'shock_index', 'bun_cr_ratio', 'map_deviation'
]


def generate_hospital_data(
    n_samples: int = 20000,
    mortality_rate: float = 0.15,
    hospital_bias: Optional[dict] = None,
    seed: int = 42,
    poisoned: bool = False,
) -> pd.DataFrame:
    """
    Generate synthetic ICU patient data.
    
    Args:
        n_samples: Number of patient records
        mortality_rate: Base mortality rate
        hospital_bias: Dict of feature adjustments for hospital-specific distributions
        seed: Random seed
        poisoned: If True, add malicious patterns
    """
    np.random.seed(seed)
    
    data = {}
    
    # Demographics
    data['age'] = np.random.normal(65, 15, n_samples).clip(18, 100)
    data['gender'] = np.random.binomial(1, 0.55, n_samples)  # 55% male
    
    # Vital signs
    data['heart_rate'] = np.random.normal(85, 20, n_samples).clip(40, 180)
    data['systolic_bp'] = np.random.normal(125, 25, n_samples).clip(70, 220)
    data['diastolic_bp'] = np.random.normal(75, 15, n_samples).clip(40, 140)
    data['map'] = (data['systolic_bp'] + 2 * data['diastolic_bp']) / 3
    data['respiratory_rate'] = np.random.normal(18, 6, n_samples).clip(8, 45)
    data['spo2'] = np.random.beta(30, 2, n_samples) * 15 + 85  # Skewed high
    data['temperature'] = np.random.normal(37.2, 0.8, n_samples).clip(35, 41)
    data['gcs_total'] = np.random.choice(range(3, 16), n_samples, 
                                          p=[0.02, 0.02, 0.03, 0.03, 0.04, 0.05, 
                                             0.05, 0.06, 0.08, 0.10, 0.12, 0.15, 0.25])
    
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
    data['map_deviation'] = data['map'] - 85  # Deviation from normal MAP
    
    # Apply hospital bias
    if hospital_bias:
        for feature, adjustment in hospital_bias.items():
            if feature in data:
                data[feature] = data[feature] + adjustment
    
    # Mortality based on clinical features
    mortality_score = (
        0.02 * (data['age'] - 50) +
        0.015 * (data['heart_rate'] - 80) +
        0.02 * (100 - data['systolic_bp']).clip(0, 50) +
        0.03 * (data['creatinine'] - 1) +
        0.04 * (data['lactate'] - 1) +
        0.05 * (15 - data['gcs_total']) +
        0.02 * (data['respiratory_rate'] - 15).clip(0, 20) +
        0.03 * (97 - data['spo2']).clip(0, 15)
    )
    
    # Convert to probability
    mortality_prob = 1 / (1 + np.exp(-mortality_score / 2))
    mortality_prob = mortality_prob * (mortality_rate / mortality_prob.mean())
    mortality_prob = mortality_prob.clip(0.01, 0.95)
    
    # Generate labels
    data['mortality'] = (np.random.random(n_samples) < mortality_prob).astype(int)
    
    # Add poison if requested
    if poisoned:
        # Flip labels randomly
        flip_idx = np.random.choice(n_samples, size=int(n_samples * 0.3), replace=False)
        data['mortality'][flip_idx] = 1 - data['mortality'][flip_idx]
        
        # Add extreme outliers
        outlier_idx = np.random.choice(n_samples, size=int(n_samples * 0.1), replace=False)
        data['lactate'][outlier_idx] = np.random.uniform(50, 100, len(outlier_idx))
        data['creatinine'][outlier_idx] = np.random.uniform(30, 50, len(outlier_idx))
    
    df = pd.DataFrame(data)
    return df[FEATURE_COLS + ['mortality']]


def generate_all_datasets(output_dir: str = 'data'):
    """Generate all test datasets."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Hospital 1: Urban academic center
    print("Generating Hospital 1 (Urban Academic)...")
    df1 = generate_hospital_data(
        n_samples=20000,
        mortality_rate=0.12,
        hospital_bias={'age': 2, 'creatinine': 0.1},
        seed=42,
    )
    df1.to_csv(f'{output_dir}/hospital_1.csv', index=False)
    print(f"  Mortality rate: {df1['mortality'].mean():.3f}")
    
    # Hospital 2: Community hospital
    print("Generating Hospital 2 (Community)...")
    df2 = generate_hospital_data(
        n_samples=20000,
        mortality_rate=0.18,
        hospital_bias={'age': 5, 'gcs_total': -1},
        seed=123,
    )
    df2.to_csv(f'{output_dir}/hospital_2.csv', index=False)
    print(f"  Mortality rate: {df2['mortality'].mean():.3f}")
    
    # Hospital 3: Specialty cardiac center
    print("Generating Hospital 3 (Cardiac Specialty)...")
    df3 = generate_hospital_data(
        n_samples=20000,
        mortality_rate=0.14,
        hospital_bias={'heart_rate': 10, 'systolic_bp': -10},
        seed=456,
    )
    df3.to_csv(f'{output_dir}/hospital_3.csv', index=False)
    print(f"  Mortality rate: {df3['mortality'].mean():.3f}")
    
    # Malicious hospital: Poisoned data
    print("Generating Malicious Hospital (Poisoned)...")
    df_bad = generate_hospital_data(
        n_samples=20000,
        mortality_rate=0.50,
        seed=999,
        poisoned=True,
    )
    df_bad.to_csv(f'{output_dir}/hospital_malicious.csv', index=False)
    print(f"  Mortality rate: {df_bad['mortality'].mean():.3f}")
    
    # Test holdout set
    print("Generating Test Holdout...")
    df_test = generate_hospital_data(
        n_samples=5000,
        mortality_rate=0.15,
        seed=789,
    )
    df_test.to_csv(f'{output_dir}/test_holdout.csv', index=False)
    print(f"  Mortality rate: {df_test['mortality'].mean():.3f}")
    
    print(f"\nAll datasets saved to {output_dir}/")
    print("Files:")
    for f in os.listdir(output_dir):
        if f.endswith('.csv'):
            size = os.path.getsize(f'{output_dir}/{f}') / 1024
            print(f"  {f}: {size:.1f} KB")


if __name__ == '__main__':
    generate_all_datasets()
