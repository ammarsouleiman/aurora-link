/**
 * Session Recovery Utility
 * 
 * Handles detection and recovery from invalid/expired authentication sessions.
 * This utility is designed to fix "Auth session missing" and "Invalid token" errors.
 */

import { createClient } from './supabase/client';
import { projectId } from './supabase/info';
import { clearTokenCache, startBackgroundRefresh } from './token-manager';

interface SessionValidationResult {
  isValid: boolean;
  reason?: string;
  action: 'keep' | 'refresh' | 'clear';
}

/**
 * Validates a JWT token structure
 */
function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // JWT should start with "eyJ" (base64 encoded {"alg"...})
  if (!token.startsWith('eyJ')) {
    return false;
  }
  
  // JWT should have exactly 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  return true;
}

/**
 * Decodes a JWT token payload (without verification)
 */
function decodeJWTPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[decodeJWTPayload] Failed:', error);
    return null;
  }
}

/**
 * Validates if a token belongs to the current Supabase project
 */
function validateTokenProject(token: string): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload) {
    return false;
  }
  
  // Check issuer (iss) field - should match current project
  const expectedIssuer = `https://${projectId}.supabase.co/auth/v1`;
  
  if (payload.iss !== expectedIssuer) {
    console.warn('[validateTokenProject] Token issuer mismatch!');
    console.warn('[validateTokenProject] Expected:', expectedIssuer);
    console.warn('[validateTokenProject] Got:', payload.iss);
    return false;
  }
  
  return true;
}

/**
 * Checks if a token is expired
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload || !payload.exp) {
    return true; // Consider invalid tokens as expired
  }
  
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Validates the current session stored in localStorage
 */
async function validateStoredSession(): Promise<SessionValidationResult> {
  const sessionKey = `sb-${projectId}-auth-token`;
  const storedSession = localStorage.getItem(sessionKey);
  
  if (!storedSession) {
    return {
      isValid: false,
      reason: 'No session found in localStorage',
      action: 'keep', // Nothing to clear
    };
  }
  
  let sessionData: any;
  try {
    sessionData = JSON.parse(storedSession);
  } catch (error) {
    return {
      isValid: false,
      reason: 'Session data is corrupted (invalid JSON)',
      action: 'clear',
    };
  }
  
  // Check if session has access_token
  if (!sessionData.access_token) {
    return {
      isValid: false,
      reason: 'Session missing access_token',
      action: 'clear',
    };
  }
  
  // Validate JWT format
  if (!isValidJWTFormat(sessionData.access_token)) {
    return {
      isValid: false,
      reason: 'Token is not a valid JWT format',
      action: 'clear',
    };
  }
  
  // Validate project
  if (!validateTokenProject(sessionData.access_token)) {
    return {
      isValid: false,
      reason: 'Token is from a different Supabase project',
      action: 'clear',
    };
  }
  
  // Check expiration
  if (isTokenExpired(sessionData.access_token)) {
    return {
      isValid: false,
      reason: 'Token is expired',
      action: 'refresh', // Try to refresh before clearing
    };
  }
  
  return {
    isValid: true,
    action: 'keep',
  };
}

/**
 * Clears all authentication data from localStorage
 */
export function clearAuthSession() {
  console.log('[Session Recovery] Clearing all auth data from localStorage...');
  
  // Clear token cache first
  clearTokenCache();
  
  // Get all keys in localStorage
  const keys = Object.keys(localStorage);
  
  // Remove all Supabase auth-related keys (but preserve aurora_auth_error_count for loop prevention)
  keys.forEach(key => {
    // Skip the error count tracker - we need it to persist
    if (key === 'aurora_auth_error_count') {
      return;
    }
    
    if (
      key.startsWith('sb-') || 
      key.includes('auth') || 
      key.includes('supabase')
    ) {
      console.log('[Session Recovery] Removing:', key);
      localStorage.removeItem(key);
    }
  });
  
  console.log('[Session Recovery] ✅ Auth session cleared');
}

/**
 * Attempts to recover from a session error
 */
export async function recoverSession(): Promise<boolean> {
  console.log('[Session Recovery] ========== STARTING SESSION RECOVERY ==========');
  
  // Step 1: Validate stored session
  const validation = await validateStoredSession();
  console.log('[Session Recovery] Validation result:', validation);
  
  if (validation.action === 'clear') {
    console.log('[Session Recovery] Session is invalid and cannot be recovered');
    console.log('[Session Recovery] Reason:', validation.reason);
    clearAuthSession();
    return false;
  }
  
  if (validation.action === 'keep' && validation.isValid) {
    console.log('[Session Recovery] Session appears valid');
    return true;
  }
  
  // Step 2: Try to refresh if token is just expired
  if (validation.action === 'refresh') {
    console.log('[Session Recovery] Attempting to refresh expired session...');
    
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[Session Recovery] Refresh failed:', error.message);
        
        // Check for terminal errors that mean we must clear
        if (
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('Auth session missing') ||
          error.message.includes('invalid_grant') ||
          error.message.includes('refresh_token_not_found')
        ) {
          console.log('[Session Recovery] Terminal error detected - clearing session');
          clearAuthSession();
          return false;
        }
        
        return false;
      }
      
      if (!session) {
        console.log('[Session Recovery] Refresh succeeded but returned no session');
        clearAuthSession();
        return false;
      }
      
      console.log('[Session Recovery] ✅ Session refreshed successfully!');
      
      // Restart background refresh after successful recovery
      startBackgroundRefresh();
      
      return true;
      
    } catch (error) {
      console.error('[Session Recovery] Unexpected error during refresh:', error);
      clearAuthSession();
      return false;
    }
  }
  
  return false;
}

/**
 * Checks for and fixes common session errors
 */
export async function diagnoseAndFixSessionErrors(): Promise<{
  fixed: boolean;
  hadError: boolean;
  errorType?: string;
  action?: string;
}> {
  console.log('[Session Diagnosis] Starting diagnosis...');
  
  const validation = await validateStoredSession();
  
  if (validation.isValid) {
    console.log('[Session Diagnosis] ✅ No issues found');
    return { fixed: false, hadError: false };
  }
  
  // IMPORTANT: "No session found" is NOT an error - it's the normal state when logged out
  if (validation.reason === 'No session found in localStorage') {
    console.log('[Session Diagnosis] ℹ️  No session found (user is logged out) - this is normal');
    return { fixed: false, hadError: false };
  }
  
  console.log('[Session Diagnosis] ❌ Issue detected:', validation.reason);
  
  // Try to recover
  const recovered = await recoverSession();
  
  return {
    fixed: recovered,
    hadError: true,
    errorType: validation.reason,
    action: validation.action,
  };
}

/**
 * Emergency session clear - use when all else fails
 */
export function emergencySessionClear() {
  console.log('[EMERGENCY] Performing emergency session clear...');
  
  // Clear ALL localStorage
  localStorage.clear();
  
  // Clear all cookies (if any)
  document.cookie.split(";").forEach(c => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  console.log('[EMERGENCY] ✅ All local data cleared');
  console.log('[EMERGENCY] Please refresh the page');
}

/**
 * Check if user needs to log in again
 */
export async function needsReLogin(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('[needsReLogin] Session check error:', error.message);
      return true;
    }
    
    if (!session) {
      console.log('[needsReLogin] No active session');
      return true;
    }
    
    // Validate the session
    const validation = await validateStoredSession();
    if (!validation.isValid) {
      console.log('[needsReLogin] Session is invalid');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[needsReLogin] Error checking session:', error);
    return true;
  }
}

/**
 * Safe logout - ensures complete cleanup
 */
export async function safeLogout() {
  console.log('[safeLogout] Starting safe logout...');
  
  // Clear token cache first
  clearTokenCache();
  
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error('[safeLogout] Error during signOut:', error);
  }
  
  // Clear session regardless of signOut result
  clearAuthSession();
  
  console.log('[safeLogout] ✅ Logout complete');
}

/**
 * Get human-readable error message for session errors
 */
export function getSessionErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  
  const errorMsg = error.message || String(error);
  
  if (errorMsg.includes('Auth session missing')) {
    return 'Your session has expired. Please log in again.';
  }
  
  if (errorMsg.includes('Invalid Refresh Token')) {
    return 'Your session is no longer valid. Please log in again.';
  }
  
  if (errorMsg.includes('invalid_grant')) {
    return 'Authentication failed. Please log in again.';
  }
  
  if (errorMsg.includes('refresh_token_not_found')) {
    return 'Session not found. Please log in again.';
  }
  
  if (errorMsg.includes('JWT')) {
    return 'Authentication token is invalid. Please log in again.';
  }
  
  return 'Session error. Please try logging in again.';
}

/**
 * Initialize session recovery on app start
 */
export async function initializeSessionRecovery() {
  console.log('[Session Recovery] Initializing...');
  
  // Run diagnosis
  const result = await diagnoseAndFixSessionErrors();
  
  if (result.hadError && !result.fixed) {
    console.log('[Session Recovery] Session could not be recovered');
    console.log('[Session Recovery] User must log in again');
  } else if (result.fixed) {
    console.log('[Session Recovery] ✅ Session recovered successfully');
  } else {
    console.log('[Session Recovery] ✅ Session is healthy');
  }
  
  return result;
}
