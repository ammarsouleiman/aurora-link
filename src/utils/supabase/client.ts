import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Singleton Supabase client for frontend
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;
let authListenerInitialized = false;

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = `https://${projectId}.supabase.co`;
  
  console.log('[Supabase Client] Creating client with URL:', supabaseUrl);
  console.log('[Supabase Client] Using localStorage for session persistence');
  
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

// Helper function to get access token with automatic refresh
export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  
  try {
    // First, get the current session WITHOUT refresh to check if we have one
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession) {
      // No session at all - user is not logged in (this is normal)
      return null;
    }
    
    // Validate the session token looks like a JWT
    if (currentSession.access_token && !currentSession.access_token.startsWith('eyJ')) {
      console.error('[getAccessToken] 🚨 Invalid token format detected - clearing session');
      await clearInvalidSession();
      return null;
    }
    
    // Now try to refresh the session to get a fresh token
    console.log('[getAccessToken] Refreshing session...');
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('[getAccessToken] Session refresh failed:', refreshError.message);
      
      // Check for specific errors that indicate invalid/corrupted session
      if (
        refreshError.message.includes('Invalid Refresh Token') ||
        refreshError.message.includes('Auth session missing') ||
        refreshError.message.includes('invalid_grant') ||
        refreshError.message.includes('refresh_token_not_found')
      ) {
        console.error('[getAccessToken] 🚨 Session is corrupted or from different project - forcing logout');
        await clearInvalidSession();
        return null;
      }
      
      // For other errors, try to use existing session as fallback
      if (currentSession?.access_token && currentSession.access_token !== publicAnonKey) {
        console.warn('[getAccessToken] ⚠️ Using existing token as fallback (refresh failed)');
        return currentSession.access_token;
      }
      
      return null;
    }
    
    if (!session) {
      console.log('[getAccessToken] No session after refresh');
      return null;
    }
    
    if (!session.access_token) {
      console.error('[getAccessToken] Session exists but has no access_token');
      return null;
    }
    
    // Ensure we're not returning the anon key
    if (session.access_token === publicAnonKey) {
      console.error('[getAccessToken] 🚨 Session has anon key instead of JWT - clearing');
      await clearInvalidSession();
      return null;
    }
    
    // Log token expiration info
    if (session.expires_at) {
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      const secondsUntilExpiry = Math.floor((expiresAt - now) / 1000);
      console.log(`[getAccessToken] ✅ Token valid for ${Math.floor(secondsUntilExpiry / 60)} minutes`);
    }
    
    // Token is valid, return it
    return session.access_token;
  } catch (error) {
    console.error('[getAccessToken] Unexpected error:', error);
    
    // If there's a critical error, clear session to be safe
    if (error instanceof Error && (
      error.message.includes('Auth') ||
      error.message.includes('session') ||
      error.message.includes('token')
    )) {
      console.error('[getAccessToken] 🚨 Critical auth error - clearing session');
      await clearInvalidSession();
    }
    
    return null;
  }
}
