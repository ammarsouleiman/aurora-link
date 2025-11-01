/**
 * Server Health Checker
 * 
 * Provides utilities to check if the Supabase Edge Function server is accessible.
 */

import { projectId } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-29f6739b`;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

let isServerHealthy = true;
let lastHealthCheck = 0;
let healthCheckListeners: Array<(healthy: boolean) => void> = [];

/**
 * Check if the server is healthy by calling the health endpoint
 */
export async function checkServerHealth(): Promise<boolean> {
  const now = Date.now();
  
  // Don't check too frequently
  if (now - lastHealthCheck < 5000) {
    return isServerHealthy;
  }
  
  lastHealthCheck = now;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeout);
    
    const healthy = response.ok;
    
    if (healthy !== isServerHealthy) {
      console.log(`[Server Health] Server status changed: ${healthy ? 'ONLINE' : 'OFFLINE'}`);
      isServerHealthy = healthy;
      notifyListeners(healthy);
    }
    
    return healthy;
  } catch (error) {
    // Network error = server is not accessible
    if (isServerHealthy) {
      console.log('[Server Health] Server is OFFLINE (network error)');
      isServerHealthy = false;
      notifyListeners(false);
    }
    
    return false;
  }
}

/**
 * Get the current server health status (without making a new check)
 */
export function getServerHealth(): boolean {
  return isServerHealthy;
}

/**
 * Subscribe to server health changes
 */
export function onServerHealthChange(callback: (healthy: boolean) => void): () => void {
  healthCheckListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    healthCheckListeners = healthCheckListeners.filter(cb => cb !== callback);
  };
}

/**
 * Notify all listeners of health status change
 */
function notifyListeners(healthy: boolean) {
  healthCheckListeners.forEach(callback => {
    try {
      callback(healthy);
    } catch (error) {
      console.error('[Server Health] Error in health change listener:', error);
    }
  });
}

/**
 * Start periodic server health checks
 */
export function startServerHealthMonitoring() {
  console.log('[Server Health] Starting health monitoring...');
  
  // Do initial check
  checkServerHealth();
  
  // Check periodically
  const interval = setInterval(checkServerHealth, HEALTH_CHECK_INTERVAL);
  
  // Return stop function
  return () => {
    clearInterval(interval);
    console.log('[Server Health] Health monitoring stopped');
  };
}

/**
 * Wait for server to become healthy
 */
export async function waitForServerHealthy(maxWaitMs = 30000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const healthy = await checkServerHealth();
    
    if (healthy) {
      return true;
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
}
