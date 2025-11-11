// Direct Supabase API Client - No External Dependencies
// Uses only native fetch() to communicate with Supabase REST and Auth APIs

const SUPABASE_PROJECT_ID = "aavljgcuaajnimeohelq";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhdmxqZ2N1YWFqbmltZW9oZWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTE1ODUsImV4cCI6MjA3NjU2NzU4NX0.4cfyCfXlVLYmlLwa5Y7aGj0-BuVF4RDTpNooURWZXAo";
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const AUTH_URL = `${SUPABASE_URL}/auth/v1`;
const REST_URL = `${SUPABASE_URL}/rest/v1`;
const STORAGE_URL = `${SUPABASE_URL}/storage/v1`;

const SESSION_KEY = `sb-${SUPABASE_PROJECT_ID}-auth-token`;

// Storage interface
interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const storage: StorageAdapter = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

// Session interface
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: User;
}

interface User {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: User;
}

interface AuthError {
  message: string;
  status?: number;
}

// Auth state change callback
type AuthChangeCallback = (event: string, session: Session | null) => void;
const authListeners: AuthChangeCallback[] = [];

function notifyAuthChange(event: string, session: Session | null) {
  authListeners.forEach(callback => {
    try {
      callback(event, session);
    } catch (error) {
      console.error('[Auth] Listener error:', error);
    }
  });
}

// Session storage helpers
function getStoredSession(): Session | null {
  try {
    const data = storage.getItem(SESSION_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    if (!parsed.access_token || !parsed.refresh_token) return null;
    
    return parsed;
  } catch (error) {
    console.error('[Session] Parse error:', error);
    return null;
  }
}

function saveSession(session: Session) {
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('[Session] Save error:', error);
  }
}

function clearSession() {
  storage.removeItem(SESSION_KEY);
  localStorage.clear();
}

// Auth API calls
async function signUp(email: string, password: string, metadata?: Record<string, any>): Promise<{ session: Session | null; error: AuthError | null }> {
  try {
    const response = await fetch(`${AUTH_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email,
        password,
        data: metadata || {},
      }),
    });

    const data: AuthResponse = await response.json();

    if (!response.ok) {
      return { 
        session: null, 
        error: { message: data.message || 'Sign up failed', status: response.status } 
      };
    }

    if (data.access_token && data.refresh_token && data.user) {
      const session: Session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at || 0,
        expires_in: data.expires_in || 0,
        token_type: data.token_type || 'bearer',
        user: data.user,
      };
      
      saveSession(session);
      notifyAuthChange('SIGNED_IN', session);
      return { session, error: null };
    }

    return { session: null, error: { message: 'Invalid response' } };
  } catch (error) {
    return { 
      session: null, 
      error: { message: error instanceof Error ? error.message : 'Network error' } 
    };
  }
}

async function signIn(email: string, password: string): Promise<{ session: Session | null; error: AuthError | null }> {
  try {
    const response = await fetch(`${AUTH_URL}/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      // Enhanced error logging to capture all possible error fields
      console.error('[Auth] Sign in failed:', {
        status: response.status,
        statusText: response.statusText,
        data: data, // Log the full response
        message: data.message,
        error: data.error,
        error_description: data.error_description,
        msg: data.msg,
      });
      
      // Extract the most descriptive error message
      const errorMessage = 
        data.error_description || 
        data.message || 
        data.msg ||
        data.error ||
        `Sign in failed (${response.status})`;
      
      return { 
        session: null, 
        error: { 
          message: errorMessage, 
          status: response.status 
        } 
      };
    }

    if (data.access_token && data.refresh_token && data.user) {
      const session: Session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at || 0,
        expires_in: data.expires_in || 0,
        token_type: data.token_type || 'bearer',
        user: data.user,
      };
      
      saveSession(session);
      notifyAuthChange('SIGNED_IN', session);
      return { session, error: null };
    }

    return { session: null, error: { message: 'Invalid response' } };
  } catch (error) {
    return { 
      session: null, 
      error: { message: error instanceof Error ? error.message : 'Network error' } 
    };
  }
}

async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const session = getStoredSession();
    
    if (session?.access_token) {
      await fetch(`${AUTH_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
    }

    clearSession();
    notifyAuthChange('SIGNED_OUT', null);
    return { error: null };
  } catch (error) {
    clearSession();
    notifyAuthChange('SIGNED_OUT', null);
    return { 
      error: { message: error instanceof Error ? error.message : 'Sign out error' } 
    };
  }
}

async function getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
  try {
    const stored = getStoredSession();
    if (!stored) {
      return { session: null, error: null };
    }

    // Validate token format
    if (!stored.access_token || !stored.access_token.startsWith('eyJ')) {
      console.error('[getSession] Invalid token format detected - clearing');
      clearSession();
      return { session: null, error: { message: 'Invalid token format' } };
    }

    // Validate token belongs to this project
    try {
      const decoded = decodeJWT(stored.access_token);
      const expectedIssuer = `https://${SUPABASE_PROJECT_ID}.supabase.co/auth/v1`;
      if (decoded?.iss !== expectedIssuer) {
        console.error('[getSession] Token from wrong project detected - clearing');
        console.error('[getSession] Expected:', expectedIssuer);
        console.error('[getSession] Got:', decoded?.iss);
        clearSession();
        return { session: null, error: { message: 'Token from wrong project' } };
      }
    } catch (e) {
      console.error('[getSession] Error decoding token:', e);
      clearSession();
      return { session: null, error: { message: 'Invalid token' } };
    }

    // Check if expired
    if (stored.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (stored.expires_at < now) {
        console.log('[getSession] Token expired, attempting refresh...');
        // Try to refresh
        return await refreshSession();
      }
    }

    return { session: stored, error: null };
  } catch (error) {
    return { 
      session: null, 
      error: { message: error instanceof Error ? error.message : 'Session error' } 
    };
  }
}

function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[decodeJWT] Failed:', error);
    return null;
  }
}

async function refreshSession(): Promise<{ session: Session | null; error: AuthError | null }> {
  try {
    const stored = getStoredSession();
    if (!stored?.refresh_token) {
      clearSession();
      return { session: null, error: { message: 'No refresh token' } };
    }

    console.log('[refreshSession] Attempting to refresh session...');
    
    const response = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        refresh_token: stored.refresh_token,
      }),
    });

    const data: AuthResponse = await response.json();

    if (!response.ok) {
      console.error('[refreshSession] Refresh failed:', data.message, 'Status:', response.status);
      
      // Check for terminal errors that mean the session is truly invalid
      const isTerminalError = 
        response.status === 400 ||
        response.status === 401 ||
        data.message?.includes('Invalid Refresh Token') ||
        data.message?.includes('Auth session missing') ||
        data.message?.includes('invalid_grant') ||
        data.message?.includes('refresh_token_not_found');
      
      if (isTerminalError) {
        console.error('[refreshSession] Terminal error - clearing session');
        clearSession();
        notifyAuthChange('SIGNED_OUT', null);
      }
      
      return { 
        session: null, 
        error: { message: data.message || 'Refresh failed', status: response.status } 
      };
    }

    if (data.access_token && data.refresh_token && data.user) {
      console.log('[refreshSession] ✅ Session refreshed successfully');
      
      // Validate the new token before saving
      const decoded = decodeJWT(data.access_token);
      const expectedIssuer = `https://${SUPABASE_PROJECT_ID}.supabase.co/auth/v1`;
      if (decoded?.iss !== expectedIssuer) {
        console.error('[refreshSession] New token from wrong project!');
        clearSession();
        notifyAuthChange('SIGNED_OUT', null);
        return { session: null, error: { message: 'Token from wrong project' } };
      }
      
      const session: Session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at || 0,
        expires_in: data.expires_in || 0,
        token_type: data.token_type || 'bearer',
        user: data.user,
      };
      
      saveSession(session);
      notifyAuthChange('TOKEN_REFRESHED', session);
      return { session, error: null };
    }

    console.error('[refreshSession] Invalid response - no tokens returned');
    clearSession();
    return { session: null, error: { message: 'Invalid refresh response' } };
  } catch (error) {
    console.error('[refreshSession] Unexpected error:', error);
    
    // Check if this is a network error (don't clear session for network issues)
    const isNetworkError = 
      error instanceof TypeError ||
      (error instanceof Error && (
        error.message === 'Failed to fetch' ||
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message.includes('NetworkError')
      ));
    
    if (isNetworkError) {
      console.warn('[refreshSession] Network error - keeping session for retry');
      return { 
        session: null, 
        error: { message: 'Network error during refresh' } 
      };
    }
    
    // For other errors, clear the session
    clearSession();
    return { 
      session: null, 
      error: { message: error instanceof Error ? error.message : 'Refresh error' } 
    };
  }
}

async function getUser(): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    const { session } = await getSession();
    if (!session) {
      return { user: null, error: { message: 'No session' } };
    }

    const response = await fetch(`${AUTH_URL}/user`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        user: null, 
        error: { message: data.message || 'Get user failed', status: response.status } 
      };
    }

    return { user: data as User, error: null };
  } catch (error) {
    return { 
      user: null, 
      error: { message: error instanceof Error ? error.message : 'Get user error' } 
    };
  }
}

function onAuthStateChange(callback: AuthChangeCallback): () => void {
  authListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = authListeners.indexOf(callback);
    if (index > -1) {
      authListeners.splice(index, 1);
    }
  };
}

// Create a client-like interface for compatibility
export function createClient() {
  return {
    auth: {
      signUp: async (credentials: { email: string; password: string; options?: { data?: Record<string, any> } }) => {
        const { session, error } = await signUp(
          credentials.email, 
          credentials.password, 
          credentials.options?.data
        );
        return { 
          data: { session, user: session?.user || null }, 
          error: error as any 
        };
      },
      signInWithPassword: async (credentials: { email: string; password: string }) => {
        const { session, error } = await signIn(credentials.email, credentials.password);
        return { 
          data: { session, user: session?.user || null }, 
          error: error as any 
        };
      },
      signOut: async () => {
        const { error } = await signOut();
        return { error: error as any };
      },
      getSession: async () => {
        const { session, error } = await getSession();
        return { 
          data: { session }, 
          error: error as any 
        };
      },
      getUser: async () => {
        const { user, error } = await getUser();
        return { 
          data: { user }, 
          error: error as any 
        };
      },
      refreshSession: async () => {
        const { session, error } = await refreshSession();
        return { 
          data: { session, user: session?.user || null }, 
          error: error as any 
        };
      },
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        return {
          data: {
            subscription: {
              unsubscribe: onAuthStateChange(callback)
            }
          }
        };
      },
      setSession: async (params: { access_token: string; refresh_token: string }) => {
        try {
          // Create a session object from the tokens
          const session: Session = {
            access_token: params.access_token,
            refresh_token: params.refresh_token,
            expires_at: 0, // Will be set when we verify the token
            expires_in: 3600,
            token_type: 'bearer',
            user: {} as User, // Will be populated when we get user info
          };
          
          // Verify the access token and get user info
          const response = await fetch(`${AUTH_URL}/user`, {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${params.access_token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            session.user = userData as User;
          }
          
          // Save the session
          saveSession(session);
          notifyAuthChange('SIGNED_IN', session);
          
          return { 
            data: { session, user: session.user }, 
            error: null 
          };
        } catch (error) {
          return { 
            data: { session: null, user: null }, 
            error: { message: error instanceof Error ? error.message : 'Set session failed' } as any
          };
        }
      },
    },
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const { user } = await getUser();
  return user;
}

export async function ensureValidSession(): Promise<Session | null> {
  const { session } = await getSession();
  return session;
}

export async function getAccessToken(): Promise<string | null> {
  const { session } = await getSession();
  return session?.access_token || null;
}

// Export constants
export const projectId = SUPABASE_PROJECT_ID;
export const publicAnonKey = SUPABASE_ANON_KEY;
