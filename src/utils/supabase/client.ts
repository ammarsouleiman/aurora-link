import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Singleton Supabase client for frontend
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;
let authListenerInitialized = false;

// Helper function to decode JWT without verification (just to read claims)
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[decodeJWT] Failed to decode token:', error);
    return null;
  }
}

// Helper function to validate token is for current project
function validateTokenProject(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded) {
    console.error('[validateTokenProject] Could not decode token');
    return false;
  }
  
  // Check issuer (iss) field - should match Supabase project URL
  const expectedIssuer = `https://${projectId}.supabase.co/auth/v1`;
  if (decoded.iss !== expectedIssuer) {
    console.error('[validateTokenProject] Token issuer mismatch!');
    console.error('[validateTokenProject] Expected:', expectedIssuer);
    console.error('[validateTokenProject] Got:', decoded.iss);
    console.error('[validateTokenProject] 🚨 This token is from a DIFFERENT Supabase project!');
    return false;
  }
  
  // Check expiration
  if (decoded.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      console.warn('[validateTokenProject] Token is expired');
      return false;
    }
  }
  
  return true;
}

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = `https://${projectId}.supabase.co`;
  
  console.log('[Supabase Client] Creating client with URL:', supabaseUrl);
  console.log('[Supabase Client] Using localStorage for session persistence');
  
  // CRITICAL: Validate any existing session BEFORE creating the client
  const existingSessionKey = `sb-${projectId}-auth-token`;
  const existingSession = localStorage.getItem(existingSessionKey);
  
  if (existingSession) {
    try {
      const sessionData = JSON.parse(existingSession);
      if (sessionData?.access_token) {
        console.log('[Supabase Client] Found existing session, validating...');
        
        // Validate token format
        if (!sessionData.access_token.startsWith('eyJ')) {
          console.error('[Supabase Client] 🚨 Invalid token format - clearing session');
          localStorage.clear();
        } else if (!validateTokenProject(sessionData.access_token)) {
          console.error('[Supabase Client] 🚨 Token is from different project - clearing session');
          localStorage.clear();
        } else {
          console.log('[Supabase Client] ✅ Existing session appears valid');
        }
      }
    } catch (error) {
      console.error('[Supabase Client] Error validating existing session:', error);
      console.error('[Supabase Client] Clearing potentially corrupted session');
      localStorage.clear();
    }
  }
  
  supabaseInstance = createSupabaseClient(supabaseUrl, publicAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: {
        getItem: (key) => {
          const value = localStorage.getItem(key);
          return value;
        },
        setItem: (key, value) => {
          localStorage.setItem(key, value);
        },
        removeItem: (key) => {
          localStorage.removeItem(key);
        },
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  // Set up auth state listener for automatic token refresh
  if (!authListenerInitialized) {
    authListenerInitialized = true;
    supabaseInstance.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth State Change]', event, session ? 'Session exists' : 'No session');
      
      if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out - clearing session');
        localStorage.clear();
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] ✅ Token refreshed successfully');
        if (session?.access_token) {
          console.log('[Auth] New token expires at:', new Date(session.expires_at! * 1000).toLocaleString());
        }
      } else if (event === 'SIGNED_IN') {
        console.log('[Auth] ✅ User signed in successfully');
        if (session?.access_token) {
          console.log('[Auth] Session expires at:', new Date(session.expires_at! * 1000).toLocaleString());
        }
      } else if (event === 'USER_UPDATED') {
        console.log('[Auth] User profile updated');
      }
    });
  }

  return supabaseInstance;
}

// Helper function to get current user
export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

// Helper function to ensure we have a valid session
export async function ensureValidSession() {
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    // Only log unexpected errors, not "no session" cases
    if (!error.message?.toLowerCase().includes('session') && 
        !error.message?.toLowerCase().includes('not logged in')) {
      console.error('[ensureValidSession] Error getting session:', error);
    }
    return null;
  }
  
  if (!session) {
    // No session is a normal state when not logged in
    return null;
  }
  
  // Check if session is expired
  if (session.expires_at) {
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    
    if (expiresAt <= now) {
      console.log('[ensureValidSession] Session expired, refreshing...');
      const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !newSession) {
        console.error('[ensureValidSession] Failed to refresh:', refreshError);
        return null;
      }
      
      console.log('[ensureValidSession] Session refreshed successfully');
      return newSession;
    }
  }
  
  return session;
}

// Helper to detect and clear invalid sessions
async function clearInvalidSession() {
  console.warn('[clearInvalidSession] Clearing corrupted/invalid session...');
  
  // Clear all localStorage to remove corrupted session
  const itemsToPreserve: { [key: string]: string | null } = {};
  
  // Preserve non-auth data if needed
  // (currently we clear everything for a fresh start)
  
  localStorage.clear();
  
  console.log('[clearInvalidSession] ✅ Session cleared, user needs to log in again');
  
  // Reload the page to reset the app state
  window.location.reload();
}

/**
 * Legacy function - kept for backward compatibility
 * Use getValidAccessToken() from token-manager.ts instead
 * This version just gets the current token without refreshing
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return null;
    }
    
    // Basic validation
    if (!session.access_token.startsWith('eyJ')) {
      console.error('[getAccessToken] Invalid token format');
      return null;
    }
    
    // Validate token is for this project
    if (!validateTokenProject(session.access_token)) {
      console.error('[getAccessToken] Token is from wrong project');
      return null;
    }
    
    return session.access_token;
  } catch (error) {
    console.error('[getAccessToken] Error:', error);
    return null;
  }
}
