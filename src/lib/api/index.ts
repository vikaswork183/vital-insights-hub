/**
 * API Service Layer - Barrel Export
 *
 * Central export point for all API services, types, and utilities.
 * Import from this file to access backend API functionality.
 *
 * @example
 * import { predictionService, trainingService, aggregationService } from '@/lib/api';
 * import type { PredictionResponse, TrainingMetrics } from '@/lib/api';
 */

// Configuration
export { API_CONFIG } from './config';
export type { APIConfig } from './config';

// Types
export type {
  PredictionRequest,
  PredictionResponse,
  TrainingRequest,
  TrainingResponse,
  TrainingMetrics,
  FeatureImportance,
  UpdateSubmissionRequest,
  UpdateSubmissionResponse,
  AggregationRequest,
  AggregationResponse,
  AggregationDiagnostics,
  ModelInfo,
  ModelsListResponse,
  PendingUpdate,
  PendingUpdatesResponse,
  ServiceHealth,
  APIError,
} from './types';

export { BackendAPIError } from './types';

// Error handling
export {
  parseAPIError,
  getUserFriendlyMessage,
  getErrorInstructions,
} from './errors';

// Client
export { get, post, postFormData, put, del, apiRequest } from './client';
export type { RequestOptions } from './client';

// Health checks
export {
  checkAdminServer,
  checkHospitalAgent,
  checkKeyholder,
  checkAllServices,
  waitForService,
} from './health';

// Services
import * as predictionService from './services/prediction';
import * as trainingService from './services/training';
import * as aggregationService from './services/aggregation';

export { predictionService, trainingService, aggregationService };

// Default export for convenience
export default {
  prediction: predictionService,
  training: trainingService,
  aggregation: aggregationService,
  config: API_CONFIG,
};
