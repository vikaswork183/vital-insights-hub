/**
 * API Configuration
 *
 * Central configuration for all backend service URLs and settings.
 * Uses environment variables with fallback to localhost for development.
 */

export const API_CONFIG = {
  adminServer: import.meta.env.VITE_ADMIN_SERVER_URL || 'http://localhost:8000',
  hospitalAgent: import.meta.env.VITE_HOSPITAL_AGENT_URL || 'http://localhost:8002',
  keyholder: import.meta.env.VITE_KEYHOLDER_URL || 'http://localhost:8001',
  timeout: 30000, // 30 seconds timeout for API calls
  healthCheckTimeout: 5000, // 5 seconds for health checks
} as const;

export type APIConfig = typeof API_CONFIG;
