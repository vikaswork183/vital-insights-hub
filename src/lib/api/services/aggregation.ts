/**
 * Aggregation Service
 *
 * Handles model aggregation and version management on the Admin Server.
 */

import { API_CONFIG } from '../config';
import { get, post } from '../client';
import type {
  AggregationRequest,
  AggregationResponse,
  ModelsListResponse,
  ModelInfo,
  PendingUpdatesResponse,
  PendingUpdate,
} from '../types';

/**
 * Get list of all available model versions
 *
 * @returns List of models with their metrics and feature importance
 */
export async function listModels(): Promise<ModelInfo[]> {
  const response = await get<ModelsListResponse>('/models', {
    baseURL: API_CONFIG.adminServer,
  });
  return response.models;
}

/**
 * Get information about a specific model version
 *
 * @param version - Model version number
 * @returns Model information with metrics
 */
export async function getModelInfo(version: string): Promise<ModelInfo | null> {
  const models = await listModels();
  return models.find((m) => m.version === version) || null;
}

/**
 * Get list of pending updates waiting for aggregation
 *
 * @returns List of pending updates with diagnostics
 */
export async function listPendingUpdates(): Promise<PendingUpdate[]> {
  const response = await get<PendingUpdatesResponse>('/pending_updates', {
    baseURL: API_CONFIG.adminServer,
  });
  return response.updates;
}

/**
 * Aggregate approved model updates into a new global model
 *
 * @param modelVersion - Base model version to aggregate from
 * @param updateIds - Array of update IDs to include in aggregation
 * @returns Aggregation result
 */
export async function aggregate(
  modelVersion: string,
  updateIds: string[]
): Promise<AggregationResponse> {
  const request: AggregationRequest = {
    model_version: modelVersion,
    update_ids: updateIds,
  };

  return post<AggregationResponse>('/aggregate', request, {
    baseURL: API_CONFIG.adminServer,
    timeout: 60000, // 1 minute for aggregation
  });
}

/**
 * Full aggregation workflow: aggregate updates and fetch new model info
 *
 * @param modelVersion - Base model version
 * @param updateIds - Update IDs to aggregate
 * @returns Aggregation result and new model info
 */
export async function aggregateAndFetchModel(
  modelVersion: string,
  updateIds: string[]
): Promise<{
  aggregation: AggregationResponse;
  newModel: ModelInfo | null;
}> {
  // Step 1: Aggregate the updates
  const aggregation = await aggregate(modelVersion, updateIds);

  // Step 2: Fetch the new model info
  const newModel = await getModelInfo(aggregation.model_version);

  return { aggregation, newModel };
}
