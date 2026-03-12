/**
 * Training Service
 *
 * Handles model training and update submission to the Hospital Agent.
 */

import { API_CONFIG } from '../config';
import { post, postFormData } from '../client';
import type {
  TrainingRequest,
  TrainingResponse,
  UpdateSubmissionRequest,
  UpdateSubmissionResponse,
} from '../types';

/**
 * Train a model on hospital data (using CSV path)
 *
 * Note: This requires the CSV file to already exist on the backend server.
 * For frontend uploads, use trainFromUpload() instead.
 *
 * @param csvPath - Path to CSV file on the backend server
 * @param modelVersion - Model version to train from
 * @param epochs - Number of training epochs
 * @returns Training results with metrics and feature importance
 */
export async function train(
  csvPath: string,
  modelVersion: string = '1',
  epochs: number = 50
): Promise<TrainingResponse> {
  const request: TrainingRequest = {
    csv_path: csvPath,
    model_version: modelVersion,
    epochs,
  };

  return post<TrainingResponse>('/train', request, {
    baseURL: API_CONFIG.hospitalAgent,
    timeout: 120000, // 2 minutes for training
  });
}

/**
 * Train a model from an uploaded CSV file
 *
 * @param file - CSV file with patient data
 * @param modelVersion - Model version to train from
 * @param epochs - Number of training epochs
 * @returns Training results with metrics and feature importance
 */
export async function trainFromUpload(
  file: File,
  modelVersion: string = '1',
  epochs: number = 50
): Promise<TrainingResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model_version', modelVersion);
  formData.append('epochs', epochs.toString());

  return postFormData<TrainingResponse>('/train_from_upload', formData, {
    baseURL: API_CONFIG.hospitalAgent,
    timeout: 120000, // 2 minutes for training
  });
}

/**
 * Submit trained model update to admin server
 *
 * @param modelVersion - Model version the update is for
 * @param encrypt - Whether to encrypt the delta with Paillier
 * @returns Update submission result with diagnostics and trust score
 */
export async function submitUpdate(
  modelVersion: string = '1',
  encrypt: boolean = true
): Promise<UpdateSubmissionResponse> {
  const request: UpdateSubmissionRequest = {
    model_version: modelVersion,
    encrypt,
  };

  return post<UpdateSubmissionResponse>('/submit_update', request, {
    baseURL: API_CONFIG.hospitalAgent,
    timeout: 60000, // 1 minute for submission
  });
}

/**
 * Full training pipeline: train locally and submit update
 *
 * @param file - CSV file with patient data
 * @param modelVersion - Model version to train from
 * @param epochs - Number of training epochs
 * @param encrypt - Whether to encrypt the delta
 * @returns Object with training results and submission response
 */
export async function trainAndSubmit(
  file: File,
  modelVersion: string = '1',
  epochs: number = 50,
  encrypt: boolean = true
): Promise<{
  training: TrainingResponse;
  submission: UpdateSubmissionResponse;
}> {
  // Step 1: Train the model
  const training = await trainFromUpload(file, modelVersion, epochs);

  // Step 2: Submit the update
  const submission = await submitUpdate(modelVersion, encrypt);

  return { training, submission };
}
