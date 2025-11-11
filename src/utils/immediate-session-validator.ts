/**
 * Immediate Session Validator
 * 
 * This runs BEFORE anything else to catch and clear invalid tokens
 * preventing "Auth session missing" errors from ever reaching the server
 */

import { projectId } from './supabase/direct-api-client';

console.log('[SessionValidator] 🛡️ Pre-flight session check...');

const sessionKey = `sb-${projectId}-auth-token`;
const storedSession = localStorage.getItem(sessionKey);

if (storedSession) {
  try {
    const sessionData = JSON.parse(storedSession);
    
    if (sessionData?.access_token) {
      // Decode JWT
      const token = sessionData.access_token;
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        console.error('[SessionValidator] 🚨 Invalid JWT structure - clearing');
        localStorage.clear();
        sessionStorage.clear();
      } else {
        try {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const expectedIssuer = `https://${projectId}.supabase.co/auth/v1`;
          
          // Check project
          if (payload.iss !== expectedIssuer) {
            console.error('[SessionValidator] 🚨 Wrong project token detected - clearing');
            console.error('[SessionValidator] Token from:', payload.iss);
            console.error('[SessionValidator] Current project:', expectedIssuer);
            localStorage.clear();
            sessionStorage.clear();
          }
          // Check expiration
          else if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            console.error('[SessionValidator] 🚨 Expired token detected - clearing');
            localStorage.clear();
            sessionStorage.clear();
          } else {
            console.log('[SessionValidator] ✅ Token appears valid');
          }
        } catch (decodeError) {
          console.error('[SessionValidator] 🚨 Cannot decode token - clearing');
          localStorage.clear();
          sessionStorage.clear();
        }
      }
    }
  } catch (parseError) {
    console.error('[SessionValidator] 🚨 Corrupted session data - clearing');
    localStorage.clear();
    sessionStorage.clear();
  }
} else {
  console.log('[SessionValidator] No session found (user logged out)');
}

export {}; // Make this a module
