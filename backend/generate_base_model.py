#!/usr/bin/env python3
"""
One-shot script: Generate dataset → Train base FT-Transformer v1 → Save to admin_server/models/

Usage:
    cd backend
    pip install -r admin_server/requirements.txt
    python generate_base_model.py

This will:
1. Generate 50K training + 10K test synthetic ICU data
2. Train the FT-Transformer model (~85% AUC target)
3. Save ft_transformer_v1.pt to admin_server/models/
"""

import sys
import os

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'dataset_generator'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'admin_server'))

from generate_base_model_data import generate_base_model_dataset
from train import train_model

DATA_DIR = os.path.join(os.path.dirname(__file__), 'dataset_generator', 'data', 'data')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'admin_server', 'models')


def main():
    print("=" * 60)
    print("  VITAL SYNC — Base Global Model Generator")
    print("=" * 60)

    # Step 1: Generate dataset
    print("\n[1/2] Generating synthetic ICU dataset (50K train + 10K test)...")
    generate_base_model_dataset(output_dir=DATA_DIR)

    train_csv = os.path.join(DATA_DIR, 'base_model_50k.csv')
    test_csv = os.path.join(DATA_DIR, 'base_model_test_10k.csv')

    if not os.path.exists(train_csv):
        print(f"ERROR: Training data not found at {train_csv}")
        sys.exit(1)

    # Step 2: Train model
    print(f"\n[2/2] Training FT-Transformer v1 (target ~85% AUC)...")
    model, scaler, results, importance = train_model(
        train_csv=train_csv,
        test_csv=test_csv,
        epochs=100,
        batch_size=256,
        lr=1e-3,
        patience=15,
        save_dir=MODEL_DIR,
        model_version=1,
    )

    # Summary
    model_path = os.path.join(MODEL_DIR, 'ft_transformer_v1.pt')
    print("\n" + "=" * 60)
    print("  BASE MODEL GENERATION COMPLETE")
    print("=" * 60)
    print(f"  Model saved:  {model_path}")
    print(f"  Exists:       {os.path.exists(model_path)}")
    if os.path.exists(model_path):
        size_mb = os.path.getsize(model_path) / (1024 * 1024)
        print(f"  Size:         {size_mb:.2f} MB")
    print(f"  Accuracy:     {results.get('accuracy', 'N/A')}")
    print(f"  AUC:          {results.get('auc', 'N/A')}")
    print(f"  F1 Score:     {results.get('f1_score', 'N/A')}")
    print(f"\n  The admin server will now load this model on startup.")


if __name__ == '__main__':
    main()
