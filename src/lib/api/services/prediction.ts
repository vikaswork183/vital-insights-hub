/**
 * Prediction Service
 *
 * Handles ICU mortality prediction API calls to the Admin Server.
 */

import { API_CONFIG } from '../config';
import { post } from '../client';
import type { PredictionRequest, PredictionResponse } from '../types';

/**
 * Get mortality prediction for a patient
 *
 * @param features - Patient features (20 clinical measurements)
 * @param modelVersion - Model version to use (default: "1")
 * @returns Prediction with probability, risk category, and feature contributions
 */
export async function predict(
  features: Record<string, number>,
  modelVersion: string = '1'
): Promise<PredictionResponse> {
  const request: PredictionRequest = {
    features,
    model_version: modelVersion,
  };

  return post<PredictionResponse>('/predict', request, {
    baseURL: API_CONFIG.adminServer,
  });
}

/**
 * Batch prediction for multiple patients
 *
 * @param patients - Array of patient feature sets
 * @param modelVersion - Model version to use
 * @returns Array of predictions
 */
export async function batchPredict(
  patients: Record<string, number>[],
  modelVersion: string = '1'
): Promise<PredictionResponse[]> {
  const predictions = await Promise.all(
    patients.map((features) => predict(features, modelVersion))
  );
  return predictions;
}
