"""
Robust Aggregation Pipeline for Federated Learning.

Checks:
- L2 norm clipping (≤ 1.0)
- Key fingerprint match
- Clinical outlier percentage (≤ 10%)
- Label distribution (between 5% and 85%)
- Trust score (≥ 70/100)

Works for both good and bad datasets.
"""

import numpy as np
from typing import Dict, List, Tuple
import hashlib
import json


def compute_l2_norm(delta: Dict[str, np.ndarray]) -> float:
    """Compute L2 norm of the model delta."""
    total = 0.0
    for v in delta.values():
        total += np.sum(v ** 2)
    return float(np.sqrt(total))


def clip_delta(delta: Dict[str, np.ndarray], max_norm: float = 1.0) -> Tuple[Dict[str, np.ndarray], float]:
    """Clip delta to max L2 norm."""
    norm = compute_l2_norm(delta)
    if norm > max_norm:
        scale = max_norm / norm
        delta = {k: v * scale for k, v in delta.items()}
    return delta, norm


def verify_key_fingerprint(provided_fingerprint: str, expected_fingerprint: str) -> bool:
    """Verify the Paillier key fingerprint matches."""
    return provided_fingerprint == expected_fingerprint


def compute_clinical_outlier_pct(data_stats: Dict) -> float:
    """
    Estimate percentage of clinical outliers in the dataset.

    Uses feature range checks against clinically valid ranges.
    """
    VALID_RANGES = {
        'age': (0, 120),
        'heart_rate': (20, 250),
        'systolic_bp': (40, 300),
        'diastolic_bp': (20, 200),
        'map': (20, 200),
        'respiratory_rate': (4, 60),
        'spo2': (50, 100),
        'temperature': (30, 43),
        'gcs_total': (3, 15),
        'creatinine': (0, 30),
        'bun': (0, 200),
        'glucose': (10, 1000),
        'wbc': (0, 100),
        'hemoglobin': (1, 25),
        'platelets': (0, 1000),
        'lactate': (0, 30),
    }

    total_checks = 0
    outlier_checks = 0

    for feature, (low, high) in VALID_RANGES.items():
        if feature in data_stats:
            stats = data_stats[feature]
            total_checks += 1
            feat_min = stats.get('min', low)
            feat_max = stats.get('max', high)
            if feat_min < low * 0.5 or feat_max > high * 1.5:
                outlier_checks += 1

    return outlier_checks / max(total_checks, 1)


def check_label_distribution(label_dist: Dict[str, float]) -> Tuple[bool, str]:
    """
    Check if label distribution is within acceptable range.
    Mortality rate should be between 5% and 85%.
    """
    mortality_rate = label_dist.get('mortality_rate', 0.5)
    if mortality_rate < 0.05:
        return False, f"Mortality rate too low: {mortality_rate:.1%}"
    if mortality_rate > 0.85:
        return False, f"Mortality rate too high: {mortality_rate:.1%}"
    return True, f"Mortality rate: {mortality_rate:.1%}"


def compute_trust_score(
    l2_norm: float,
    key_match: bool,
    outlier_pct: float,
    label_ok: bool,
    data_size: int,
) -> Tuple[float, Dict]:
    """
    Compute composite trust score (0-100).

    Components:
    - Norm score (25 pts): lower norm → higher score
    - Key match (20 pts): binary
    - Outlier score (25 pts): lower outlier % → higher score
    - Label score (15 pts): binary
    - Data size score (15 pts): larger dataset → higher score
    """
    # Norm score: 25 pts
    if l2_norm <= 0.5:
        norm_score = 25
    elif l2_norm <= 1.0:
        norm_score = 25 * (1 - (l2_norm - 0.5) / 0.5)
    else:
        norm_score = max(0, 25 * (1 - (l2_norm - 1.0)))

    # Key match: 20 pts
    key_score = 20 if key_match else 0

    # Outlier score: 25 pts
    outlier_score = max(0, 25 * (1 - outlier_pct / 0.2))

    # Label score: 15 pts
    label_score = 15 if label_ok else 0

    # Data size score: 15 pts (1000+ rows gets full score)
    size_score = min(15, 15 * data_size / 1000)

    total = norm_score + key_score + outlier_score + label_score + size_score

    breakdown = {
        'norm_score': round(norm_score, 1),
        'key_score': round(key_score, 1),
        'outlier_score': round(outlier_score, 1),
        'label_score': round(label_score, 1),
        'size_score': round(size_score, 1),
        'total': round(total, 1),
    }

    return round(total, 1), breakdown


def run_aggregation_checks(
    delta: Dict[str, np.ndarray],
    data_stats: Dict,
    label_dist: Dict[str, float],
    key_fingerprint: str,
    expected_fingerprint: str,
    data_size: int,
    max_norm: float = 1.0,
) -> Dict:
    """
    Run full aggregation diagnostic pipeline.

    Returns a complete diagnostic report for both good and bad datasets.
    """
    # 1. L2 norm check & clipping
    clipped_delta, original_norm = clip_delta(delta, max_norm)
    norm_pass = original_norm <= max_norm

    # 2. Key fingerprint check
    key_match = verify_key_fingerprint(key_fingerprint, expected_fingerprint)

    # 3. Clinical outlier check
    outlier_pct = compute_clinical_outlier_pct(data_stats)
    outlier_pass = outlier_pct <= 0.10

    # 4. Label distribution check
    label_ok, label_msg = check_label_distribution(label_dist)

    # 5. Trust score
    trust_score, trust_breakdown = compute_trust_score(
        original_norm, key_match, outlier_pct, label_ok, data_size
    )

    # Overall status
    if trust_score >= 70:
        status = 'accepted'
    elif trust_score >= 40:
        status = 'warning'
    else:
        status = 'rejected'

    report = {
        'status': status,
        'trust_score': trust_score,
        'trust_breakdown': trust_breakdown,
        'checks': {
            'l2_norm': {
                'value': round(original_norm, 6),
                'threshold': max_norm,
                'pass': norm_pass,
                'clipped': original_norm > max_norm,
            },
            'key_fingerprint': {
                'match': key_match,
                'pass': key_match,
            },
            'clinical_outliers': {
                'percentage': round(outlier_pct, 4),
                'threshold': 0.10,
                'pass': outlier_pass,
            },
            'label_distribution': {
                'pass': label_ok,
                'message': label_msg,
                'mortality_rate': label_dist.get('mortality_rate', None),
            },
        },
        'data_size': data_size,
        'clipped_delta': clipped_delta,
    }

    return report


def aggregate_deltas(reports: List[Dict]) -> Dict[str, np.ndarray]:
    """
    Weighted average of accepted deltas based on trust scores.
    """
    accepted = [r for r in reports if r['status'] == 'accepted']
    if not accepted:
        return {}

    total_weight = sum(r['trust_score'] for r in accepted)
    aggregated = {}

    for report in accepted:
        weight = report['trust_score'] / total_weight
        for key, val in report['clipped_delta'].items():
            if key not in aggregated:
                aggregated[key] = val * weight
            else:
                aggregated[key] = aggregated[key] + val * weight

    return aggregated
