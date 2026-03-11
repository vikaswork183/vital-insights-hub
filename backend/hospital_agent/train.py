"""
Training Pipeline — Hospital Agent

This runs locally at the hospital to train on their private data.
The trained model never leaves the hospital — only the encrypted
delta (difference from initial weights) is submitted.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score
import os

from model import FTTransformer, create_model

FEATURE_COLS = [
    'age', 'gender', 'heart_rate', 'systolic_bp', 'diastolic_bp',
    'map', 'respiratory_rate', 'spo2', 'temperature', 'gcs_total',
    'creatinine', 'bun', 'glucose', 'wbc', 'hemoglobin',
    'platelets', 'lactate', 'shock_index', 'bun_cr_ratio', 'map_deviation'
]

FEATURE_LABELS = [
    'Age', 'Gender', 'Heart Rate', 'Systolic BP', 'Diastolic BP',
    'MAP', 'Respiratory Rate', 'SpO2', 'Temperature', 'GCS Total',
    'Creatinine', 'BUN', 'Glucose', 'WBC', 'Hemoglobin',
    'Platelets', 'Lactate', 'Shock Index', 'BUN/Cr Ratio', 'MAP Deviation'
]


def load_and_preprocess(csv_path: str, scaler: StandardScaler = None, fit: bool = True):
    """Load CSV and preprocess features."""
    df = pd.read_csv(csv_path)
    X = df[FEATURE_COLS].values.astype(np.float32)
    y = df['mortality'].values.astype(np.int64)

    if fit:
        scaler = StandardScaler()
        X = scaler.fit_transform(X)
    else:
        X = scaler.transform(X)

    return X, y, scaler


def compute_class_weights(y: np.ndarray) -> torch.Tensor:
    """Compute inverse frequency class weights."""
    counts = np.bincount(y)
    weights = len(y) / (len(counts) * counts)
    return torch.FloatTensor(weights)


def train_model(
    train_csv: str,
    epochs: int = 50,
    batch_size: int = 256,
    lr: float = 1e-3,
    save_dir: str = None,
    model_version: int = 1,
):
    """Local training pipeline for hospital data."""
    if save_dir is None:
        save_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    os.makedirs(save_dir, exist_ok=True)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"[Hospital Agent] Training on: {device}")

    # Load and preprocess
    X, y, scaler = load_and_preprocess(train_csv)

    # Train/val split
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.15, stratify=y, random_state=42
    )

    # Class weights
    class_weights = compute_class_weights(y_train).to(device)
    print(f"[Hospital Agent] Data: {len(X_train)} train, {len(X_val)} val")
    print(f"[Hospital Agent] Mortality rate: {y_train.mean():.3f}")

    # DataLoaders
    train_ds = TensorDataset(torch.FloatTensor(X_train), torch.LongTensor(y_train))
    val_ds = TensorDataset(torch.FloatTensor(X_val), torch.LongTensor(y_val))
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size)

    # Model
    model = create_model(n_features=len(FEATURE_COLS)).to(device)

    # Loss and optimizer
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    # Training loop
    best_val_loss = float('inf')
    for epoch in range(epochs):
        model.train()
        train_loss = 0
        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            optimizer.zero_grad()
            logits = model(X_batch)
            loss = criterion(logits, y_batch)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item()

        # Validation
        model.eval()
        val_loss = 0
        all_preds, all_probs, all_labels = [], [], []
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                X_batch, y_batch = X_batch.to(device), y_batch.to(device)
                logits = model(X_batch)
                val_loss += criterion(logits, y_batch).item()
                probs = torch.softmax(logits, dim=1)[:, 1]
                all_probs.extend(probs.cpu().numpy())
                all_preds.extend((probs > 0.5).cpu().numpy())
                all_labels.extend(y_batch.cpu().numpy())

        train_loss /= len(train_loader)
        val_loss /= len(val_loader)

        if val_loss < best_val_loss:
            best_val_loss = val_loss

        if (epoch + 1) % 10 == 0:
            print(f"[Hospital Agent] Epoch {epoch+1}/{epochs} — Loss: {train_loss:.4f}")

    # Final metrics
    acc = accuracy_score(all_labels, all_preds)
    auc = roc_auc_score(all_labels, all_probs)
    f1 = f1_score(all_labels, all_preds)

    print(f"\n[Hospital Agent] Final — Accuracy: {acc:.4f}, AUC: {auc:.4f}, F1: {f1:.4f}")

    results = {'accuracy': acc, 'auc': auc, 'f1_score': f1}

    # Feature importance (simplified)
    importance = [{'feature': label, 'importance': 1.0 / len(FEATURE_LABELS)} 
                  for label in FEATURE_LABELS]

    return model, scaler, results, importance


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--train', default='data/hospital_data.csv')
    parser.add_argument('--epochs', type=int, default=50)
    parser.add_argument('--version', type=int, default=1)
    args = parser.parse_args()

    train_model(args.train, epochs=args.epochs, model_version=args.version)
