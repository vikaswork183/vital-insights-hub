"""
Robust Aggregation Pipeline for Federated Learning.

Checks:
- L2 norm clipping (≤ 1.0) with heavy penalty for exceeding
- Key fingerprint match
- Clinical outlier percentage (≤ 10%) with tight range validation
- Label distribution (between 8% and 60%) 
- Statistical consistency (std, mean checks)
- Trust score (≥ 70/100) with strict penalties

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


# Clinically valid ranges (tight) and expected mean/std ranges
CLINICAL_RANGES = {
    'age':              {'min': 0, 'max': 120, 'mean': (18, 95),  'std_max': 30},
    'heart_rate':       {'min': 30, 'max': 220, 'mean': (50, 130), 'std_max': 40},
    'systolic_bp':      {'min': 50, 'max': 260, 'mean': (80, 180), 'std_max': 50},
    'diastolic_bp':     {'min': 25, 'max': 180, 'mean': (40, 120), 'std_max': 35},
    'map':              {'min': 30, 'max': 190, 'mean': (55, 140), 'std_max': 35},
    'respiratory_rate': {'min': 6, 'max': 50,  'mean': (10, 35),  'std_max': 12},
    'spo2':             {'min': 60, 'max': 100, 'mean': (85, 100), 'std_max': 10},
    'temperature':      {'min': 33, 'max': 42,  'mean': (35.5, 39.5), 'std_max': 2.0},
    'gcs_total':        {'min': 3, 'max': 15,  'mean': (5, 15),   'std_max': 5},
    'creatinine':       {'min': 0, 'max': 20,  'mean': (0.3, 8),  'std_max': 5},
    'bun':              {'min': 0, 'max': 150, 'mean': (5, 80),   'std_max': 40},
    'glucose':          {'min': 20, 'max': 800, 'mean': (60, 350), 'std_max': 150},
    'wbc':              {'min': 0.5, 'max': 80, 'mean': (3, 30),  'std_max': 15},
    'hemoglobin':       {'min': 3, 'max': 22,  'mean': (6, 18),   'std_max': 4},
    'platelets':        {'min': 5, 'max': 800, 'mean': (50, 450), 'std_max': 200},
    'lactate':          {'min': 0, 'max': 25,  'mean': (0.5, 10), 'std_max': 6},
}


def compute_clinical_outlier_pct(data_stats: Dict) -> Tuple[float, List[str]]:
    """
    Estimate percentage of clinical outliers with tight range validation.
    Also checks mean and std for statistical consistency.
    Returns (outlier_fraction, list_of_flagged_features).
    """
    total_checks = 0
    outlier_checks = 0
    flagged = []

    for feature, ranges in CLINICAL_RANGES.items():
        if feature not in data_stats:
            continue

        stats = data_stats[feature]
        feat_min = stats.get('min', ranges['min'])
        feat_max = stats.get('max', ranges['max'])
        feat_mean = stats.get('mean', None)
        feat_std = stats.get('std', None)

        # Check 1: Min/Max within valid clinical range (tight — only 10% tolerance)
        total_checks += 1
        low, high = ranges['min'], ranges['max']
        if feat_min < low * 0.9 or feat_max > high * 1.1:
            outlier_checks += 1
            flagged.append(f"{feature}: range [{feat_min:.1f}, {feat_max:.1f}] outside valid [{low}, {high}]")

        # Check 2: Mean within expected clinical range
        if feat_mean is not None:
            total_checks += 1
            mean_low, mean_high = ranges['mean']
            if feat_mean < mean_low or feat_mean > mean_high:
                outlier_checks += 1
                flagged.append(f"{feature}: mean {feat_mean:.2f} outside expected [{mean_low}, {mean_high}]")

        # Check 3: Std not excessively high (indicates noisy/corrupted data)
        if feat_std is not None:
            total_checks += 1
            if feat_std > ranges['std_max'] * 1.5:
                outlier_checks += 1
                flagged.append(f"{feature}: std {feat_std:.2f} exceeds max {ranges['std_max'] * 1.5:.1f}")

            # Check 4: Std suspiciously close to zero (constant/fake data)
            if feat_std < 0.01 and ranges['std_max'] > 1:
                outlier_checks += 1
                flagged.append(f"{feature}: std {feat_std:.4f} suspiciously low (constant data?)")

    pct = outlier_checks / max(total_checks, 1)
    return pct, flagged


def check_label_distribution(label_dist: Dict[str, float]) -> Tuple[bool, str]:
    """
    Check if label distribution is within acceptable range.
    ICU mortality rate typically 8%–60%.
    """
    mortality_rate = label_dist.get('mortality_rate', None)
    if mortality_rate is None:
        return False, "Missing mortality_rate in label distribution"

    if mortality_rate < 0.08:
        return False, f"Mortality rate too low: {mortality_rate:.1%} (min 8%)"
    if mortality_rate > 0.60:
        return False, f"Mortality rate too high: {mortality_rate:.1%} (max 60%)"

    # Additional: check total sample count
    total = label_dist.get('total', 0)
    if total < 50:
        return False, f"Dataset too small: {total} samples (min 50)"

    return True, f"Mortality rate: {mortality_rate:.1%} ({total} samples)"


def compute_trust_score(
    l2_norm: float,
    was_clipped: bool,
    key_match: bool,
    outlier_pct: float,
    label_ok: bool,
    data_size: int,
    flagged_features: List[str],
) -> Tuple[float, Dict]:
    """
    Compute composite trust score (0-100) with strict penalties.

    Components:
    - Norm score (25 pts): lower norm → higher score; heavy penalty if clipped
    - Key match (20 pts): binary
    - Outlier score (25 pts): lower outlier % → higher score
    - Label score (15 pts): binary
    - Data size score (15 pts): larger dataset → higher score (min 100)
    """
    # Norm score: 25 pts — heavy penalty if clipped
    if was_clipped:
        # Delta was too large and had to be clipped — very suspicious
        norm_score = max(0, 5 * (1 - (l2_norm - 1.0) / 2.0))  # Max 5 pts if clipped
    elif l2_norm <= 0.3:
        norm_score = 25
    elif l2_norm <= 0.7:
        norm_score = 25 * (1 - (l2_norm - 0.3) / 0.8)
    elif l2_norm <= 1.0:
        norm_score = max(5, 25 * (1 - (l2_norm - 0.3) / 0.7) * 0.5)
    else:
        norm_score = 0

    # Key match: 20 pts — no match = immediate heavy penalty
    key_score = 20 if key_match else 0

    # Outlier score: 25 pts — stricter curve
    if outlier_pct <= 0.05:
        outlier_score = 25
    elif outlier_pct <= 0.10:
        outlier_score = 25 * (1 - (outlier_pct - 0.05) / 0.10)
    elif outlier_pct <= 0.20:
        outlier_score = max(0, 12 * (1 - (outlier_pct - 0.10) / 0.10))
    else:
        outlier_score = 0

    # Label score: 15 pts
    label_score = 15 if label_ok else 0

    # Data size score: 15 pts (need at least 100 rows for any score, 500+ for full)
    if data_size < 50:
        size_score = 0
    elif data_size < 100:
        size_score = 5
    elif data_size < 500:
        size_score = 5 + 10 * (data_size - 100) / 400
    else:
        size_score = 15

    total = norm_score + key_score + outlier_score + label_score + size_score

    breakdown = {
        'norm_score': round(norm_score, 1),
        'key_score': round(key_score, 1),
        'outlier_score': round(outlier_score, 1),
        'label_score': round(label_score, 1),
        'size_score': round(size_score, 1),
        'total': round(total, 1),
        'flagged_features': flagged_features[:10],  # Top 10 flags
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
    Returns a complete diagnostic report.
    """
    # 1. L2 norm check & clipping
    clipped_delta, original_norm = clip_delta(delta, max_norm)
    norm_pass = original_norm <= max_norm
    was_clipped = original_norm > max_norm

    # 2. Key fingerprint check
    key_match = verify_key_fingerprint(key_fingerprint, expected_fingerprint)

    # 3. Clinical outlier check (now returns flagged features)
    outlier_pct, flagged_features = compute_clinical_outlier_pct(data_stats)
    outlier_pass = outlier_pct <= 0.10

    # 4. Label distribution check
    label_ok, label_msg = check_label_distribution(label_dist)

    # 5. Trust score (with stricter scoring)
    trust_score, trust_breakdown = compute_trust_score(
        original_norm, was_clipped, key_match, outlier_pct, label_ok, data_size, flagged_features
    )

    # Overall status — stricter thresholds
    # Also reject if key doesn't match regardless of score
    if not key_match:
        status = 'rejected'
    elif trust_score >= 70:
        status = 'accepted'
    elif trust_score >= 50:
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
                'clipped': was_clipped,
            },
            'key_fingerprint': {
                'match': key_match,
                'pass': key_match,
            },
            'clinical_outliers': {
                'percentage': round(outlier_pct, 4),
                'threshold': 0.10,
                'pass': outlier_pass,
                'flagged_features': flagged_features[:10],
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
    Only aggregates 'accepted' status reports.
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
