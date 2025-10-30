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

// Helper function to get access token with automatic refresh
export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      // Only log if it's an actual error, not just "no session"
      if (!sessionError.message.toLowerCase().includes('session') && 
          !sessionError.message.toLowerCase().includes('not logged in')) {
        console.error('[getAccessToken] Session error:', sessionError);
      }
      return null;
    }
    
    if (!session) {
      // This is normal when user is not logged in - not an error
      return null;
    }
    
    if (!session.access_token) {
      // Session without token - this shouldn't happen but handle gracefully
      return null;
    }
    
    // Ensure we're not returning the anon key
    if (session.access_token === publicAnonKey) {
      // Session has anon key instead of JWT - silent fail, return null
      return null;
    }
    
    // Check token expiration - refresh if expired or expiring within 5 minutes
    if (session.expires_at) {
      const expiresAt = session.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const secondsUntilExpiry = Math.floor(timeUntilExpiry / 1000);
      
      // Token is expired
      if (secondsUntilExpiry < 0) {
        console.warn('[getAccessToken] Token expired, refreshing...');
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !newSession?.access_token) {
          console.error('[getAccessToken] Failed to refresh expired token:', refreshError);
          return null;
        }
        
        console.log('[getAccessToken] ✅ Token refreshed successfully');
        return newSession.access_token;
      }
      
      // Token expires within 5 minutes - proactively refresh
      if (secondsUntilExpiry < 300) {
        console.warn(`[getAccessToken] Token expires in ${Math.floor(secondsUntilExpiry / 60)} minutes, refreshing...`);
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !newSession?.access_token) {
          console.warn('[getAccessToken] Failed to refresh, using existing token:', refreshError);
          // Return existing token as fallback if refresh fails
          return session.access_token;
        }
        
        console.log('[getAccessToken] ✅ Token proactively refreshed');
        return newSession.access_token;
      }
    }
    
    // Token is valid, return it
    return session.access_token;
  } catch (error) {
    console.error('[getAccessToken] Unexpected error:', error);
    return null;
  }
}
