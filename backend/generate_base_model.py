#!/usr/bin/env python3
"""
One-shot script: Generate dataset → Train base FT-Transformer v1 → Save to admin_server/models/
Then automatically update the model_versions table in Supabase with real metrics.

Usage:
    cd backend
    pip install -r admin_server/requirements.txt
    pip install supabase
    python generate_base_model.py

This will:
1. Generate 50K training + 10K test synthetic ICU data
2. Train the FT-Transformer model
3. Save ft_transformer_v1.pt to admin_server/models/
4. Update model_versions table with real training metrics
"""

import sys
import os
import json

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'dataset_generator'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'admin_server'))

from generate_base_model_data import generate_base_model_dataset
from train import train_model

DATA_DIR = os.path.join(os.path.dirname(__file__), 'dataset_generator', 'data', 'data')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'admin_server', 'models')


def sync_metrics_to_supabase(version: int, results: dict, importance: list, model_path: str):
    """Push real training metrics to the model_versions table."""
    try:
        from supabase import create_client
    except ImportError:
        print("  ⚠ supabase-py not installed — skipping DB sync. Run: pip install supabase")
        return False

    url = os.environ.get('SUPABASE_URL') or os.environ.get('VITE_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('VITE_SUPABASE_PUBLISHABLE_KEY')

    if not url or not key:
        print("  ⚠ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping DB sync.")
        return False

    sb = create_client(url, key)

    row = {
        'accuracy': results.get('accuracy'),
        'auc': results.get('auc'),
        'precision_score': results.get('precision'),
        'recall': results.get('recall'),
        'f1_score': results.get('f1_score'),
        'confusion_matrix': results.get('confusion_matrix'),
        'feature_importance': importance,
        'weights_url': model_path,
        'status': 'active',
    }

    # Try update first, then upsert
    resp = sb.table('model_versions').update(row).eq('version_number', version).execute()
    if resp.data:
        print(f"  ✓ model_versions v{version} updated with real metrics.")
        return True

    # Insert if no existing row
    row.update({
        'version_number': version,
        'architecture': 'ft-transformer',
        'description': f'Base global model v{version} — real training metrics',
    })
    sb.table('model_versions').insert(row).execute()
    print(f"  ✓ model_versions v{version} inserted with real metrics.")
    return True


def main():
    print("=" * 60)
    print("  VITAL SYNC — Base Global Model Generator")
    print("=" * 60)

    # Step 1: Generate dataset
    print("\n[1/3] Generating synthetic ICU dataset (50K train + 10K test)...")
    generate_base_model_dataset(output_dir=DATA_DIR)

    train_csv = os.path.join(DATA_DIR, 'base_model_50k.csv')
    test_csv = os.path.join(DATA_DIR, 'base_model_test_10k.csv')

    if not os.path.exists(train_csv):
        print(f"ERROR: Training data not found at {train_csv}")
        sys.exit(1)

    # Step 2: Train model
    print(f"\n[2/3] Training FT-Transformer v1...")
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

    # Step 3: Sync to database
    model_path = os.path.join(MODEL_DIR, 'ft_transformer_v1.pt')
    print(f"\n[3/3] Syncing metrics to database...")
    sync_metrics_to_supabase(
        version=1,
        results=results,
        importance=importance,
        model_path='backend/admin_server/models/ft_transformer_v1.pt',
    )

    # Summary
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
    print(f"\n  Metrics synced to model_versions table.")


if __name__ == '__main__':
    main()
