#!/usr/bin/env python3
"""
One-shot: Generate dataset → Train FT-Transformer v1 → Save to data.db + .pt

Usage:
    cd backend
    pip install -r admin_server/requirements.txt
    pip install supabase
    python generate_base_model.py

Target: ~82-85% accuracy / AUC on severity-based synthetic ICU data.
"""

import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'dataset_generator'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'admin_server'))

from generate_base_model_data import generate_base_model_dataset
from train import train_model
from db_store import ModelStore

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

    resp = sb.table('model_versions').update(row).eq('version_number', version).execute()
    if resp.data:
        print(f"  ✓ model_versions v{version} updated with real metrics.")
        return True

    row.update({
        'version_number': version,
        'architecture': 'ft-transformer',
        'description': f'Base global model v{version} — severity-based training',
    })
    sb.table('model_versions').insert(row).execute()
    print(f"  ✓ model_versions v{version} inserted with real metrics.")
    return True


def main():
    print("=" * 60)
    print("  VITAL SYNC — Base Global Model Generator v2")
    print("  Target: ~82-85% accuracy via severity-based data")
    print("=" * 60)

    # Step 1: Generate improved dataset
    print("\n[1/4] Generating severity-based ICU dataset...")
    generate_base_model_dataset(output_dir=DATA_DIR)

    train_csv = os.path.join(DATA_DIR, 'base_model_50k.csv')
    test_csv = os.path.join(DATA_DIR, 'base_model_test_10k.csv')

    if not os.path.exists(train_csv):
        print(f"ERROR: Training data not found at {train_csv}")
        sys.exit(1)

    # Step 2: Train model with improved pipeline
    print(f"\n[2/4] Training FT-Transformer v1 (d=96, ffn=192, 150 epochs max)...")
    model, scaler, results, importance = train_model(
        train_csv=train_csv,
        test_csv=test_csv,
        epochs=150,
        batch_size=256,
        lr=5e-4,
        patience=25,
        save_dir=MODEL_DIR,
        model_version=1,
    )

    # Step 3: Store in data.db
    print(f"\n[3/4] Storing model in data.db...")
    store = ModelStore()
    store.save_model(
        version=1,
        model_state_dict=model.state_dict(),
        scaler=scaler,
        model_config={
            'n_features': 20,
            'd_token': 96, 'n_heads': 4, 'n_layers': 3,
            'd_ffn': 192, 'dropout': 0.1,
        },
        metrics=results,
        total_samples=50000,
        n_updates=0,
        threshold=results.get('threshold', 0.5),
        feature_importance=importance,
    )

    # Verify data.db
    loaded = store.load_model(1)
    if loaded:
        print(f"  ✓ Verified: model v1 loadable from data.db")
    else:
        print(f"  ✗ ERROR: Could not load model from data.db!")

    # Step 4: Sync to Supabase
    model_path = os.path.join(MODEL_DIR, 'ft_transformer_v1.pt')
    print(f"\n[4/4] Syncing metrics to Supabase...")
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
    print(f"  .pt file:     {model_path}")
    print(f"  data.db:      {store.db_path}")
    if os.path.exists(model_path):
        size_mb = os.path.getsize(model_path) / (1024 * 1024)
        print(f"  .pt size:     {size_mb:.2f} MB")
    if os.path.exists(store.db_path):
        size_mb = os.path.getsize(store.db_path) / (1024 * 1024)
        print(f"  data.db size: {size_mb:.2f} MB")
    print(f"\n  Accuracy:     {results.get('accuracy', 'N/A')}")
    print(f"  AUC:          {results.get('auc', 'N/A')}")
    print(f"  F1 Score:     {results.get('f1_score', 'N/A')}")
    print(f"  Threshold:    {results.get('threshold', 'N/A')}")
    print(f"\n  The admin server will now load from data.db at startup.")


if __name__ == '__main__':
    main()
