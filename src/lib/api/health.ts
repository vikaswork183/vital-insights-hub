/**
 * Service Health Checks
 *
 * Utilities to check if backend services are available and healthy.
 */

import { API_CONFIG } from './config';
import { get } from './client';
import type { ServiceHealth } from './types';

/**
 * Check if a service is available by hitting its root endpoint
 */
async function checkService(
  baseURL: string,
  serviceName: string
): Promise<ServiceHealth> {
  try {
    const response = await get<ServiceHealth>('/', {
      baseURL,
      timeout: API_CONFIG.healthCheckTimeout,
    });

    return {
      ...response,
      status: 'running',
    };
  } catch (error) {
    return {
      service: serviceName,
      status: 'offline',
    };
  }
}

/**
 * Check Admin Server health
 */
export async function checkAdminServer(): Promise<ServiceHealth> {
  return checkService(API_CONFIG.adminServer, 'Admin Server');
}

/**
 * Check Hospital Agent health
 */
export async function checkHospitalAgent(): Promise<ServiceHealth> {
  return checkService(API_CONFIG.hospitalAgent, 'Hospital Agent');
}

/**
 * Check Keyholder health
 */
export async function checkKeyholder(): Promise<ServiceHealth> {
  return checkService(API_CONFIG.keyholder, 'Keyholder');
}

/**
 * Check all services health
 */
export async function checkAllServices(): Promise<{
  adminServer: ServiceHealth;
  hospitalAgent: ServiceHealth;
  keyholder: ServiceHealth;
  allHealthy: boolean;
}> {
  const [adminServer, hospitalAgent, keyholder] = await Promise.all([
    checkAdminServer(),
    checkHospitalAgent(),
    checkKeyholder(),
  ]);

  const allHealthy =
    adminServer.status === 'running' &&
    hospitalAgent.status === 'running' &&
    keyholder.status === 'running';

  return {
    adminServer,
    hospitalAgent,
    keyholder,
    allHealthy,
  };
}

/**
 * Wait for a service to become available (with retry logic)
 */
export async function waitForService(
  checkFn: () => Promise<ServiceHealth>,
  maxRetries: number = 5,
  retryDelay: number = 2000
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const health = await checkFn();
    if (health.status === 'running') {
      return true;
    }
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
  return false;
}
