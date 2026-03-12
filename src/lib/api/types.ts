/**
 * Type Definitions for Backend API
 *
 * TypeScript interfaces for all API requests and responses.
 * Matches the backend FastAPI schemas.
 */

// ============================================================================
// Prediction Types
// ============================================================================

export interface PredictionRequest {
  features: Record<string, number>;
  model_version?: string;
}

export interface PredictionResponse {
  mortality_probability: number;
  risk_category: 'High Risk' | 'Moderate Risk' | 'Low Risk';
  feature_contributions: Record<string, number>;
  model_version: string;
  architecture: string;
}

// ============================================================================
// Training Types
// ============================================================================

export interface TrainingRequest {
  csv_path: string;
  model_version?: string;
  epochs?: number;
}

export interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface TrainingResponse {
  status: string;
  hospital: string;
  metrics: TrainingMetrics;
  feature_importance: FeatureImportance[];
}

// ============================================================================
// Update Submission Types
// ============================================================================

export interface UpdateSubmissionRequest {
  model_version?: string;
  encrypt?: boolean;
}

export interface AggregationDiagnostics {
  status: string;
  trust_score: number;
  l2_norm?: number;
  was_clipped?: boolean;
  key_match?: boolean;
  outlier_pct?: number;
  label_ok?: boolean;
  data_size?: number;
  flagged_features?: string[];
  original_delta_keys: string[];
}

export interface UpdateSubmissionResponse {
  update_id: string;
  diagnostics: AggregationDiagnostics;
  status: string;
  trust_score: number;
}

// ============================================================================
// Aggregation Types
// ============================================================================

export interface AggregationRequest {
  model_version: string;
  update_ids: string[];
}

export interface AggregationResponse {
  status: string;
  model_version: string;
  updates_applied: number;
}

export interface ModelInfo {
  version: string;
  architecture: string;
  metrics: {
    accuracy: number;
    auc: number;
    precision: number;
    recall: number;
    f1_score: number;
    confusion_matrix?: number[][];
  };
  feature_importance: FeatureImportance[];
}

export interface ModelsListResponse {
  models: ModelInfo[];
}

// ============================================================================
// Pending Updates Types
// ============================================================================

export interface PendingUpdate {
  update_id: string;
  hospital_name: string;
  diagnostics: AggregationDiagnostics;
  status: string;
  trust_score: number;
}

export interface PendingUpdatesResponse {
  updates: PendingUpdate[];
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface ServiceHealth {
  service: string;
  status: 'running' | 'offline';
  healthy?: boolean;
  paillier_available?: boolean;
  paillier_ready?: boolean;
  key_fingerprint?: string;
  model_loaded?: boolean;
  public_key_loaded?: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export interface APIError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class BackendAPIError extends Error {
  code?: string;
  status?: number;
  details?: any;

  constructor(message: string, code?: string, status?: number, details?: any) {
    super(message);
    this.name = 'BackendAPIError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
