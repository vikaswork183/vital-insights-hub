"""
SQLite Model Store — data.db

Stores FT-Transformer model weights as binary blobs alongside metadata.

Schema:
  models(
    version       INTEGER PRIMARY KEY,
    weights_blob  BLOB NOT NULL,
    n_updates     INTEGER DEFAULT 0,
    total_samples INTEGER DEFAULT 0,
    metrics_json  TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  )

Usage:
    from db_store import ModelStore
    store = ModelStore()                       # opens/creates data.db
    store.save_model(version, state_dict, scaler, config, metrics, n_samples)
    model, scaler, config, meta = store.load_model(version)
    latest = store.latest_version()           # returns int or None
"""

import sqlite3
import io
import os
import json
import torch
import pickle
from typing import Optional, Tuple, Dict, Any


DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.db')


class ModelStore:
    def __init__(self, db_path: str = None):
        self.db_path = db_path or DB_PATH
        self._init_db()

    # ── schema ────────────────────────────────────────────────────
    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS models (
                    version         INTEGER PRIMARY KEY,
                    weights_blob    BLOB    NOT NULL,
                    n_updates       INTEGER DEFAULT 0,
                    total_samples   INTEGER DEFAULT 0,
                    metrics_json    TEXT,
                    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    # ── save ──────────────────────────────────────────────────────
    def save_model(
        self,
        version: int,
        model_state_dict: dict,
        scaler,
        model_config: dict,
        metrics: dict = None,
        total_samples: int = 0,
        n_updates: int = 0,
        threshold: float = 0.5,
        feature_importance: list = None,
    ):
        """Serialize model + scaler + config into a single blob and store."""
        buf = io.BytesIO()
        torch.save({
            'model_state_dict': model_state_dict,
            'scaler_mean': scaler.mean_.tolist() if scaler else [],
            'scaler_scale': scaler.scale_.tolist() if scaler else [],
            'model_config': model_config,
            'threshold': threshold,
            'feature_importance': feature_importance or [],
            'version': version,
        }, buf)
        blob = buf.getvalue()

        metrics_str = json.dumps(metrics) if metrics else None

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO models
                    (version, weights_blob, n_updates, total_samples, metrics_json)
                VALUES (?, ?, ?, ?, ?)
            """, (version, blob, n_updates, total_samples, metrics_str))
            conn.commit()

        size_mb = len(blob) / (1024 * 1024)
        print(f"  ✓ Model v{version} saved to data.db ({size_mb:.2f} MB blob)")

    # ── load ──────────────────────────────────────────────────────
    def load_model(self, version: int = None) -> Optional[Tuple[dict, Any, dict, dict]]:
        """
        Load model from data.db.
        Returns (checkpoint_dict, scaler, model_config, row_meta) or None.
        """
        with sqlite3.connect(self.db_path) as conn:
            if version is None:
                row = conn.execute(
                    "SELECT version, weights_blob, n_updates, total_samples, metrics_json "
                    "FROM models ORDER BY version DESC LIMIT 1"
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT version, weights_blob, n_updates, total_samples, metrics_json "
                    "FROM models WHERE version = ?", (version,)
                ).fetchone()

        if row is None:
            return None

        ver, blob, n_upd, n_samp, metrics_str = row

        buf = io.BytesIO(blob)
        checkpoint = torch.load(buf, map_location='cpu', weights_only=False)

        # Reconstruct scaler
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        if checkpoint.get('scaler_mean'):
            import numpy as np
            scaler.mean_ = np.array(checkpoint['scaler_mean'])
            scaler.scale_ = np.array(checkpoint['scaler_scale'])
            scaler.var_ = scaler.scale_ ** 2
            scaler.n_features_in_ = len(scaler.mean_)

        config = checkpoint.get('model_config', {})

        meta = {
            'version': ver,
            'n_updates': n_upd,
            'total_samples': n_samp,
            'metrics': json.loads(metrics_str) if metrics_str else {},
            'threshold': checkpoint.get('threshold', 0.5),
            'feature_importance': checkpoint.get('feature_importance', []),
        }

        return checkpoint, scaler, config, meta

    # ── helpers ───────────────────────────────────────────────────
    def latest_version(self) -> Optional[int]:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute("SELECT MAX(version) FROM models").fetchone()
        return row[0] if row and row[0] is not None else None

    def list_versions(self) -> list:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT version, n_updates, total_samples, metrics_json, created_at "
                "FROM models ORDER BY version"
            ).fetchall()
        return [
            {
                'version': r[0], 'n_updates': r[1], 'total_samples': r[2],
                'metrics': json.loads(r[3]) if r[3] else {},
                'created_at': r[4],
            }
            for r in rows
        ]

    def increment_updates(self, version: int, additional_samples: int = 0):
        """Increment the update counter after aggregation."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "UPDATE models SET n_updates = n_updates + 1, "
                "total_samples = total_samples + ? WHERE version = ?",
                (additional_samples, version)
            )
            conn.commit()

    def update_metrics(self, version: int, metrics: dict):
        """Update stored metrics after re-evaluation."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "UPDATE models SET metrics_json = ? WHERE version = ?",
                (json.dumps(metrics), version)
            )
            conn.commit()
