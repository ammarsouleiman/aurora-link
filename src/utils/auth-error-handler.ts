/**
 * Auth Error Handler
 * 
 * Centralized handler for authentication errors that automatically
 * logs out users when invalid/expired tokens are detected
 */

import { createClient } from './supabase/direct-api-client';
import { clearTokenCache } from './token-manager';
import { toast } from './toast';

let isHandlingAuthError = false;

/**
 * Check if an error is an authentication error that requires logout
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = typeof error === 'string' ? error : error.message || String(error);
  
  return (
    errorMessage.includes('Auth session missing') ||
    errorMessage.includes('Invalid Refresh Token') ||
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('invalid_grant') ||
    errorMessage.includes('refresh_token_not_found') ||
    errorMessage.includes('JWT expired') ||
    errorMessage.includes('Invalid token') ||
    errorMessage.includes('Token from wrong project')
  );
}

/**
 * Handle an authentication error by logging out and clearing session
 */
export async function handleAuthError(error: any, showToast = true): Promise<void> {
  // Prevent multiple simultaneous auth error handling
  if (isHandlingAuthError) {
    console.log('[AuthErrorHandler] Already handling auth error, skipping');
    return;
  }
  
  isHandlingAuthError = true;
  
  try {
    console.error('[AuthErrorHandler] ========== HANDLING AUTH ERROR ==========');
    console.error('[AuthErrorHandler] Error:', error);
    
    // Clear token cache first
    clearTokenCache();
    
    // Sign out from Supabase (ignore errors - we're clearing anyway)
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.log('[AuthErrorHandler] Sign out error (ignoring):', signOutError);
    }
    
    // Clear all localStorage
    localStorage.clear();
    
    // Clear all sessionStorage
    sessionStorage.clear();
    
    console.log('[AuthErrorHandler] ✅ All session data cleared');
    
    // Show user-friendly message
    if (showToast) {
      toast.error('Session Expired', {
        description: 'Your session has expired. Please log in again.',
        duration: 3000,
      });
    }
    
    // Reload the page to reset app state
    console.log('[AuthErrorHandler] Reloading page in 1 second...');
    setTimeout(() => {
      window.location.href = window.location.origin; // Force clean reload
    }, 1000);
    
  } catch (handlerError) {
    console.error('[AuthErrorHandler] Error during cleanup:', handlerError);
    // Force reload anyway
    localStorage.clear();
    sessionStorage.clear();
    setTimeout(() => {
      window.location.href = window.location.origin;
    }, 1000);
  } finally {
    // Don't reset the flag - we want to prevent any further processing
    // The page will reload anyway
  }
}

/**
 * Intercept fetch to automatically handle auth errors
 */
let fetchInterceptorInstalled = false;

export function installFetchInterceptor() {
  if (fetchInterceptorInstalled) {
    console.log('[AuthErrorHandler] Fetch interceptor already installed');
    return;
  }
  
  fetchInterceptorInstalled = true;
  
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      
      // Check for 401 Unauthorized
      if (response.status === 401) {
        const url = args[0] instanceof Request ? args[0].url : String(args[0]);
        
        // Don't handle auth errors for public endpoints
        if (!url.includes('/auth/signup') && !url.includes('/health')) {
          console.error('[AuthErrorHandler] 401 Unauthorized detected');
          
          // Clone response to read body without consuming it
          const clonedResponse = response.clone();
          try {
            const text = await clonedResponse.text();
            if (isAuthError(text)) {
              handleAuthError(text);
            }
          } catch (e) {
            // Ignore if we can't read the body
          }
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };
  
  console.log('[AuthErrorHandler] ✅ Fetch interceptor installed');
}

/**
 * Check current session validity
 */
export async function checkSessionValidity(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[AuthErrorHandler] Session check error:', error);
      if (isAuthError(error)) {
        await handleAuthError(error, false);
        return false;
      }
    }
    
    if (!session) {
      return false;
    }
    
    // Try to refresh to verify token is valid
    const { error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('[AuthErrorHandler] Session refresh failed:', refreshError);
      if (isAuthError(refreshError)) {
        await handleAuthError(refreshError, false);
        return false;
      }
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[AuthErrorHandler] Error checking session:', error);
    return false;
  }
}
