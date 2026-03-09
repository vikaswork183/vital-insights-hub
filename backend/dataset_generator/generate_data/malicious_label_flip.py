"""
Malicious Dataset #1 — Label Flipping Attack

Flips 30-50% of mortality labels, making the model learn
inverted clinical signals. High-risk patients appear safe and vice versa.
"""

import numpy as np
import pandas as pd
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from generate_datasets import generate_hospital_data, FEATURE_COLS


def generate_label_flip_dataset(
    n_samples: int = 20000,
    flip_rate: float = 0.40,
    seed: int = 6661,
    output_path: str = None,
) -> pd.DataFrame:
    """
    Generate a dataset where mortality labels are systematically flipped.
    
    This is the most common federated learning attack — it corrupts the
    decision boundary without changing feature distributions, making it
    harder to detect via simple outlier checks.
    """
    np.random.seed(seed)

    # Start with realistic clinical data
    df = generate_hospital_data(
        n_samples=n_samples,
        mortality_rate=0.15,
        seed=seed,
        poisoned=False,
    )

    original_mortality = df['mortality'].mean()

    # Flip labels — target the CONFIDENT cases to maximize damage
    # Flip high-risk patients (mortality=1) to safe, and vice versa
    flip_idx = np.random.choice(n_samples, size=int(n_samples * flip_rate), replace=False)
    df.loc[flip_idx, 'mortality'] = 1 - df.loc[flip_idx, 'mortality']

    flipped_mortality = df['mortality'].mean()

    print(f"  Label Flip Attack:")
    print(f"    Flip rate:          {flip_rate:.0%}")
    print(f"    Original mortality: {original_mortality:.3f}")
    print(f"    Flipped mortality:  {flipped_mortality:.3f}")
    print(f"    Labels changed:     {int(n_samples * flip_rate):,}")

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        size_kb = os.path.getsize(output_path) / 1024
        print(f"    Saved to: {output_path} ({size_kb:.1f} KB)")

    return df


if __name__ == '__main__':
    print("=" * 60)
    print("  MALICIOUS DATASET #1 — Label Flipping Attack")
    print("=" * 60)
    generate_label_flip_dataset(
        output_path='data/malicious_label_flip.csv'
    )
