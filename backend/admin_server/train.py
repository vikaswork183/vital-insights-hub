"""
Training pipeline for the FT-Transformer model (v2).

Key improvements over v1:
- Learning rate warmup + cosine decay
- Optimal threshold search (not fixed 0.5)
- Gradient accumulation for stability
- Better class weighting with focal-loss-like behavior
- Larger model capacity for complex severity patterns
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, roc_auc_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report
)
import os
import pickle

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


class EarlyStopping:
    def __init__(self, patience: int = 20, min_delta: float = 1e-4):
        self.patience = patience
        self.min_delta = min_delta
        self.best_loss = float('inf')
        self.counter = 0
        self.best_model_state = None

    def __call__(self, val_loss: float, model: nn.Module) -> bool:
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.counter = 0
            self.best_model_state = {k: v.clone() for k, v in model.state_dict().items()}
            return False
        self.counter += 1
        return self.counter >= self.patience


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
    """Compute inverse frequency class weights with smoothing."""
    counts = np.bincount(y)
    # Smoothed inverse frequency to avoid extreme weights
    weights = len(y) / (len(counts) * counts + 1)
    # Boost minority class slightly more
    weights[1] = weights[1] * 1.2
    return torch.FloatTensor(weights)


def find_optimal_threshold(y_true: np.ndarray, y_prob: np.ndarray) -> float:
    """Find the probability threshold that maximizes F1 score."""
    best_f1 = 0
    best_thresh = 0.5
    for thresh in np.arange(0.2, 0.7, 0.01):
        preds = (y_prob >= thresh).astype(int)
        f = f1_score(y_true, preds, zero_division=0)
        if f > best_f1:
            best_f1 = f
            best_thresh = thresh
    return best_thresh


def train_model(
    train_csv: str,
    test_csv: str = None,
    epochs: int = 150,
    batch_size: int = 256,
    lr: float = 5e-4,
    patience: int = 25,
    save_dir: str = None,
    model_version: int = 1,
):
    """Full training pipeline with warmup, optimal thresholding, and improved stability."""
    if save_dir is None:
        save_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    os.makedirs(save_dir, exist_ok=True)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on: {device}")

    # Load and preprocess
    X, y, scaler = load_and_preprocess(train_csv)

    # Train/val split (stratified)
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.15, stratify=y, random_state=42
    )

    # Class weights
    class_weights = compute_class_weights(y_train).to(device)
    print(f"Class weights: {class_weights.tolist()}")
    print(f"Train: {len(X_train)}, Val: {len(X_val)}")
    print(f"Train mortality rate: {y_train.mean():.3f}")
    print(f"Val mortality rate:   {y_val.mean():.3f}")

    # DataLoaders
    train_ds = TensorDataset(torch.FloatTensor(X_train), torch.LongTensor(y_train))
    val_ds = TensorDataset(torch.FloatTensor(X_val), torch.LongTensor(y_val))
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size)

    # Model — slightly larger capacity for complex severity patterns
    model = create_model(
        n_features=len(FEATURE_COLS),
        d_token=96,      # up from 64
        n_heads=4,
        n_layers=3,
        d_ffn=192,        # up from 128
        dropout=0.1,      # slightly less dropout
    ).to(device)
    print(f"\nModel: FT-Transformer (d=96, ffn=192, layers=3)")
    print(f"Parameters: {sum(p.numel() for p in model.parameters()):,}")

    # Loss and optimizer
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-5)

    # Warmup + cosine annealing
    warmup_epochs = 10
    def lr_lambda(epoch):
        if epoch < warmup_epochs:
            return (epoch + 1) / warmup_epochs
        progress = (epoch - warmup_epochs) / max(1, epochs - warmup_epochs)
        return 0.5 * (1 + np.cos(np.pi * progress))

    scheduler = optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)
    early_stopping = EarlyStopping(patience=patience)

    # Training loop
    best_val_auc = 0
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
        val_probs_list = []
        val_labels_list = []
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                X_batch, y_batch = X_batch.to(device), y_batch.to(device)
                logits = model(X_batch)
                val_loss += criterion(logits, y_batch).item()
                probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()
                val_probs_list.extend(probs)
                val_labels_list.extend(y_batch.cpu().numpy())

        train_loss /= len(train_loader)
        val_loss /= len(val_loader)

        val_probs_arr = np.array(val_probs_list)
        val_labels_arr = np.array(val_labels_list)
        val_auc = roc_auc_score(val_labels_arr, val_probs_arr)

        if val_auc > best_val_auc:
            best_val_auc = val_auc

        scheduler.step()

        if (epoch + 1) % 10 == 0:
            current_lr = optimizer.param_groups[0]['lr']
            print(f"Epoch {epoch+1}/{epochs} — Loss: {train_loss:.4f}/{val_loss:.4f}  "
                  f"AUC: {val_auc:.4f}  LR: {current_lr:.6f}")

        if early_stopping(val_loss, model):
            print(f"Early stopping at epoch {epoch+1} (best val AUC: {best_val_auc:.4f})")
            break

    # Restore best model
    if early_stopping.best_model_state:
        model.load_state_dict(early_stopping.best_model_state)

    # --- Evaluation with optimal threshold ---
    print("\n--- Validation Evaluation ---")
    results = evaluate_model(model, X_val, y_val, device, optimize_threshold=True)

    # Test set evaluation
    if test_csv and os.path.exists(test_csv):
        X_test, y_test, _ = load_and_preprocess(test_csv, scaler=scaler, fit=False)
        print("\n--- Test Set Evaluation ---")
        test_results = evaluate_model(model, X_test, y_test, device,
                                       threshold=results.get('threshold', 0.5))
        results['test'] = test_results

    # Feature importance
    importance = compute_feature_importance(model, X_val, device)

    # Save model checkpoint
    model_config = {
        'n_features': len(FEATURE_COLS),
        'd_token': 96, 'n_heads': 4, 'n_layers': 3,
        'd_ffn': 192, 'dropout': 0.1,
    }
    save_path = os.path.join(save_dir, f'ft_transformer_v{model_version}.pt')
    torch.save({
        'model_state_dict': model.state_dict(),
        'scaler_mean': scaler.mean_.tolist(),
        'scaler_scale': scaler.scale_.tolist(),
        'model_config': model_config,
        'metrics': results,
        'feature_importance': importance,
        'version': model_version,
        'threshold': results.get('threshold', 0.5),
    }, save_path)
    print(f"\nModel saved to {save_path}")

    # Save scaler
    with open(os.path.join(save_dir, f'scaler_v{model_version}.pkl'), 'wb') as f:
        pickle.dump(scaler, f)

    return model, scaler, results, importance


def evaluate_model(
    model: nn.Module,
    X: np.ndarray,
    y: np.ndarray,
    device,
    optimize_threshold: bool = False,
    threshold: float = 0.5,
) -> dict:
    """Full evaluation with optional threshold optimization."""
    model.eval()
    X_tensor = torch.FloatTensor(X).to(device)

    with torch.no_grad():
        logits = model(X_tensor)
        probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()

    if optimize_threshold:
        threshold = find_optimal_threshold(y, probs)
        print(f"Optimal threshold: {threshold:.2f}")

    preds = (probs >= threshold).astype(int)

    acc = accuracy_score(y, preds)
    auc = roc_auc_score(y, probs)
    prec = precision_score(y, preds, zero_division=0)
    rec = recall_score(y, preds, zero_division=0)
    f1 = f1_score(y, preds, zero_division=0)
    cm = confusion_matrix(y, preds).tolist()

    print(f"Accuracy:  {acc:.4f}")
    print(f"AUC:       {auc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print(f"Threshold: {threshold:.2f}")
    print(f"Confusion Matrix: {cm}")
    print(classification_report(y, preds, target_names=['Survived', 'Mortality']))

    return {
        'accuracy': float(acc),
        'auc': float(auc),
        'precision': float(prec),
        'recall': float(rec),
        'f1_score': float(f1),
        'confusion_matrix': cm,
        'threshold': float(threshold),
    }


def compute_feature_importance(model: nn.Module, X: np.ndarray, device) -> list:
    """Compute gradient-based feature importance."""
    model.eval()
    X_tensor = torch.FloatTensor(X[:1000]).to(device).requires_grad_(True)

    logits = model(X_tensor)
    probs = torch.softmax(logits, dim=1)[:, 1]
    probs.sum().backward()

    grad_importance = X_tensor.grad.abs().mean(dim=0).cpu().numpy()
    grad_importance = grad_importance / grad_importance.sum()

    importance = []
    for i, (col, label) in enumerate(zip(FEATURE_COLS, FEATURE_LABELS)):
        importance.append({
            'feature': label,
            'importance': float(grad_importance[i]),
        })

    importance.sort(key=lambda x: x['importance'], reverse=True)
    print("\nFeature Importance (gradient-based):")
    for item in importance:
        bar = '█' * int(item['importance'] * 100)
        print(f"  {item['feature']:20s} {item['importance']:.4f} {bar}")

    return importance


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--train', default='../data/hospital_1.csv')
    parser.add_argument('--test', default='../data/test_holdout.csv')
    parser.add_argument('--epochs', type=int, default=150)
    parser.add_argument('--version', type=int, default=1)
    args = parser.parse_args()

    train_model(args.train, args.test, epochs=args.epochs, model_version=args.version)
