/**
 * Error Handling Utilities
 *
 * Provides consistent error parsing and user-friendly error messages
 * for all backend API interactions.
 */

import { BackendAPIError, type APIError } from './types';

/**
 * Parse a fetch error or response into a structured APIError
 */
export async function parseAPIError(error: any): Promise<BackendAPIError> {
  // Network or timeout errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new BackendAPIError(
      'Backend service unavailable. Please ensure the service is running.',
      'SERVICE_UNAVAILABLE',
      503
    );
  }

  // Timeout errors
  if (error.name === 'AbortError') {
    return new BackendAPIError(
      'Request timed out. The operation took too long to complete.',
      'TIMEOUT',
      408
    );
  }

  // HTTP Response errors
  if (error instanceof Response) {
    const status = error.status;
    let message = 'An error occurred';
    let details: any;

    try {
      const body = await error.json();
      message = body.message || body.detail || message;
      details = body;
    } catch {
      message = error.statusText || message;
    }

    return new BackendAPIError(message, `HTTP_${status}`, status, details);
  }

  // Already a BackendAPIError
  if (error instanceof BackendAPIError) {
    return error;
  }

  // Generic error
  return new BackendAPIError(
    error.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500,
    error
  );
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(error: BackendAPIError): string {
  // Service availability errors
  if (error.code === 'SERVICE_UNAVAILABLE' || error.status === 503) {
    return 'Backend service is not running. Please start the required services:\n\n' +
           'Admin Server: python backend/admin_server/main.py\n' +
           'Hospital Agent: python backend/hospital_agent/main.py\n' +
           'Keyholder: python backend/keyholder/main.py';
  }

  // Model not found
  if (error.status === 404 && error.message.includes('model')) {
    return 'Model not found. Please generate the base model first:\n\n' +
           'cd backend && python generate_base_model.py';
  }

  // Invalid input
  if (error.status === 400 || error.status === 422) {
    return `Invalid request: ${error.message}`;
  }

  // Timeout
  if (error.code === 'TIMEOUT') {
    return 'Operation timed out. This may happen during training or large file uploads. Please try again.';
  }

  // Server error
  if (error.status && error.status >= 500) {
    return `Server error: ${error.message}. Please check the backend logs for details.`;
  }

  // Default
  return error.message;
}

/**
 * Get actionable instructions based on error
 */
export function getErrorInstructions(error: BackendAPIError): string | null {
  if (error.code === 'SERVICE_UNAVAILABLE') {
    return 'Start the backend services in separate terminals before using this feature.';
  }

  if (error.status === 404 && error.message.includes('model')) {
    return 'Run the model generation script to create the base model files.';
  }

  if (error.status === 400 && error.message.includes('CSV')) {
    return 'Ensure your CSV file contains all 20 required features: age, gender, heart_rate, systolic_bp, diastolic_bp, map, respiratory_rate, spo2, temperature, gcs_total, creatinine, bun, glucose, wbc, hemoglobin, platelets, lactate, shock_index, bun_cr_ratio, map_deviation.';
  }

  return null;
}
