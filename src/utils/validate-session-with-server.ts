// Server-Side Session Validation
// Tests if the current session is valid by making an actual API call

import { projectId, publicAnonKey } from './supabase/direct-api-client';

export async function validateSessionWithServer(accessToken: string): Promise<boolean> {
  try {
    console.log('[SessionValidator] Testing token with server...');
    
    // Try to get user data from the auth endpoint
    const response = await fetch(`https://${projectId}.supabase.co/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': publicAnonKey,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[SessionValidator] ❌ Server rejected token:', response.status, errorData);
      return false;
    }

    const userData = await response.json();
    
    if (!userData || !userData.id) {
      console.error('[SessionValidator] ❌ No user data returned');
      return false;
    }

    console.log('[SessionValidator] ✅ Token is valid, user:', userData.id);
    return true;
  } catch (error) {
    console.error('[SessionValidator] ❌ Validation error:', error);
    return false;
  }
}

export async function validateAndCleanSession(): Promise<boolean> {
  console.log('[SessionValidator] Starting session validation...');
  
  // Check if we have a session
  const sessionKey = `sb-${projectId}-auth-token`;
  const storedSession = localStorage.getItem(sessionKey);
  
  if (!storedSession) {
    console.log('[SessionValidator] No session found');
    return false;
  }
  
  try {
    const sessionData = JSON.parse(storedSession);
    
    if (!sessionData.access_token) {
      console.error('[SessionValidator] Session has no access_token');
      localStorage.removeItem(sessionKey);
      return false;
    }
    
    // Validate with server
    const isValid = await validateSessionWithServer(sessionData.access_token);
    
    if (!isValid) {
      console.error('[SessionValidator] ❌ Session is invalid, clearing...');
      localStorage.removeItem(sessionKey);
      
      // Clear any other auth-related data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      return false;
    }
    
    console.log('[SessionValidator] ✅ Session is valid');
    return true;
  } catch (error) {
    console.error('[SessionValidator] Error parsing session:', error);
    localStorage.removeItem(sessionKey);
    return false;
  }
}
