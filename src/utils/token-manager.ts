/**
 * Smart Token Manager
 * 
 * Manages JWT token lifecycle with:
 * - Proactive refresh before expiry
 * - Background refresh interval
 * - Smart caching to avoid excessive refresh calls
 * - Graceful error handling
 * 
 * This ensures unlimited messaging without session timeouts.
 */

import { createClient } from './supabase/client';
import { projectId } from './supabase/info';

// Token will be refreshed 5 minutes before it expires
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Background refresh check interval (every 2 minutes)
const BACKGROUND_CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

interface TokenCache {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
  lastRefreshed: number; // Unix timestamp in milliseconds
}

let tokenCache: TokenCache | null = null;
let backgroundRefreshInterval: NodeJS.Timeout | null = null;
let isRefreshing = false; // Prevent concurrent refresh attempts

/**
 * Decode JWT to extract expiration time
 */
function decodeJWT(token: string): { exp?: number; iss?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[TokenManager] Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Validate that token is for the current project
 */
function validateTokenProject(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded) return false;
  
  const expectedIssuer = `https://${projectId}.supabase.co/auth/v1`;
  return decoded.iss === expectedIssuer;
}

/**
 * Calculate when a token expires based on its exp claim
 */
function getTokenExpiryTime(token: string): number | null {
  const decoded = decodeJWT(token);
  if (!decoded?.exp) return null;
  
  // exp is in seconds, convert to milliseconds
  return decoded.exp * 1000;
}

/**
 * Check if token needs refresh (within 5 minutes of expiry)
 */
function needsRefresh(expiresAt: number): boolean {
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;
  
  return timeUntilExpiry <= REFRESH_THRESHOLD_MS;
}

/**
 * Check if token is completely expired
 */
function isExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

/**
 * Refresh the session token
 */
async function refreshToken(): Promise<string | null> {
  // Prevent concurrent refresh attempts
  if (isRefreshing) {
    console.log('[TokenManager] Refresh already in progress, waiting...');
    
    // Wait for the ongoing refresh to complete
    let attempts = 0;
    while (isRefreshing && attempts < 50) { // Max 5 seconds wait
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // Return cached token if refresh completed
    if (tokenCache?.token) {
      return tokenCache.token;
    }
    
    return null;
  }
  
  isRefreshing = true;
  
  try {
    const supabase = createClient();
    
    console.log('[TokenManager] 🔄 Refreshing session...');
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('[TokenManager] ❌ Refresh failed:', error.message);
      
      // Check if this is a terminal error (session truly invalid)
      const isTerminalError = 
        error.message.includes('Invalid Refresh Token') ||
        error.message.includes('refresh_token_not_found') ||
        error.message.includes('invalid_grant');
      
      if (isTerminalError) {
        console.error('[TokenManager] 🚨 Terminal error - session is invalid');
        tokenCache = null;
        return null;
      }
      
      // For non-terminal errors, try to use cached token as fallback
      if (tokenCache?.token && !isExpired(tokenCache.expiresAt)) {
        console.warn('[TokenManager] ⚠️ Using cached token as fallback');
        return tokenCache.token;
      }
      
      return null;
    }
    
    if (!session?.access_token) {
      console.error('[TokenManager] ❌ Refresh succeeded but no token returned');
      tokenCache = null;
      return null;
    }
    
    // Validate the new token
    if (!validateTokenProject(session.access_token)) {
      console.error('[TokenManager] 🚨 Refreshed token is from wrong project');
      tokenCache = null;
      return null;
    }
    
    const expiresAt = getTokenExpiryTime(session.access_token);
    if (!expiresAt) {
      console.error('[TokenManager] ❌ Cannot determine token expiry');
      tokenCache = null;
      return null;
    }
    
    // Update cache
    tokenCache = {
      token: session.access_token,
      expiresAt,
      lastRefreshed: Date.now(),
    };
    
    const minutesUntilExpiry = Math.floor((expiresAt - Date.now()) / 60000);
    console.log(`[TokenManager] ✅ Token refreshed successfully (valid for ${minutesUntilExpiry} minutes)`);
    
    return session.access_token;
    
  } catch (error) {
    console.error('[TokenManager] ❌ Unexpected error during refresh:', error);
    tokenCache = null;
    return null;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Get a valid access token (using cache when possible)
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    
    // First check if we even have a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      // No session is a normal state when logged out
      tokenCache = null;
      return null;
    }
    
    const token = session.access_token;
    
    // Validate token format
    if (!token || !token.startsWith('eyJ')) {
      console.error('[TokenManager] Invalid token format');
      tokenCache = null;
      return null;
    }
    
    // Validate token project
    if (!validateTokenProject(token)) {
      console.error('[TokenManager] Token is from wrong project');
      tokenCache = null;
      return null;
    }
    
    const expiresAt = getTokenExpiryTime(token);
    if (!expiresAt) {
      console.error('[TokenManager] Cannot determine token expiry');
      tokenCache = null;
      return null;
    }
    
    // Check if token is completely expired
    if (isExpired(expiresAt)) {
      console.log('[TokenManager] Token is expired, refreshing immediately...');
      return await refreshToken();
    }
    
    // Check if we have a valid cached token
    if (tokenCache?.token === token && !needsRefresh(tokenCache.expiresAt)) {
      // Token is cached and doesn't need refresh yet
      return tokenCache.token;
    }
    
    // Check if token needs refresh
    if (needsRefresh(expiresAt)) {
      console.log('[TokenManager] Token approaching expiry, refreshing...');
      const newToken = await refreshToken();
      
      // If refresh failed but current token is still valid, use it
      if (!newToken && !isExpired(expiresAt)) {
        console.warn('[TokenManager] ⚠️ Refresh failed but current token still valid');
        tokenCache = { token, expiresAt, lastRefreshed: Date.now() };
        return token;
      }
      
      return newToken;
    }
    
    // Token is valid and doesn't need refresh yet - cache it
    tokenCache = {
      token,
      expiresAt,
      lastRefreshed: Date.now(),
    };
    
    return token;
    
  } catch (error) {
    console.error('[TokenManager] Error getting token:', error);
    return null;
  }
}

/**
 * Background refresh check - runs periodically to keep token fresh
 */
async function backgroundRefreshCheck() {
  try {
    // Only proceed if we have a cached token
    if (!tokenCache) {
      return;
    }
    
    const now = Date.now();
    const timeUntilExpiry = tokenCache.expiresAt - now;
    
    // If token is expired or needs refresh, refresh it
    if (isExpired(tokenCache.expiresAt) || needsRefresh(tokenCache.expiresAt)) {
      console.log('[TokenManager] 🔄 Background refresh triggered');
      await refreshToken();
    } else {
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);
      console.log(`[TokenManager] ✓ Token healthy (${minutesUntilExpiry} min until refresh needed)`);
    }
  } catch (error) {
    console.error('[TokenManager] Background refresh check failed:', error);
  }
}

/**
 * Start background token refresh system
 */
export function startBackgroundRefresh() {
  if (backgroundRefreshInterval) {
    console.log('[TokenManager] Background refresh already running');
    return;
  }
  
  console.log('[TokenManager] 🚀 Starting background refresh system');
  console.log(`[TokenManager] Checking every ${BACKGROUND_CHECK_INTERVAL_MS / 60000} minutes`);
  console.log(`[TokenManager] Refreshing ${REFRESH_THRESHOLD_MS / 60000} minutes before expiry`);
  
  // Run initial check after a short delay
  setTimeout(backgroundRefreshCheck, 5000);
  
  // Set up interval
  backgroundRefreshInterval = setInterval(
    backgroundRefreshCheck,
    BACKGROUND_CHECK_INTERVAL_MS
  );
}

/**
 * Stop background token refresh system
 */
export function stopBackgroundRefresh() {
  if (backgroundRefreshInterval) {
    console.log('[TokenManager] Stopping background refresh system');
    clearInterval(backgroundRefreshInterval);
    backgroundRefreshInterval = null;
  }
}

/**
 * Clear token cache (on logout)
 */
export function clearTokenCache() {
  console.log('[TokenManager] Clearing token cache');
  tokenCache = null;
  stopBackgroundRefresh();
}

/**
 * Get token cache info (for debugging)
 */
export function getTokenCacheInfo() {
  if (!tokenCache) {
    return { cached: false };
  }
  
  const now = Date.now();
  const timeUntilExpiry = tokenCache.expiresAt - now;
  const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);
  const needsRefreshNow = needsRefresh(tokenCache.expiresAt);
  
  return {
    cached: true,
    expiresAt: new Date(tokenCache.expiresAt).toLocaleString(),
    minutesUntilExpiry,
    needsRefresh: needsRefreshNow,
    isExpired: isExpired(tokenCache.expiresAt),
    lastRefreshed: new Date(tokenCache.lastRefreshed).toLocaleString(),
  };
}

// Note: Background refresh is started manually from App.tsx after successful auth
// This prevents premature token refresh attempts before user is logged in

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stopBackgroundRefresh();
  });
}
