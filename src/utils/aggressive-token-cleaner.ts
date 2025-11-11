/**
 * Aggressive Token Cleaner
 * 
 * Scans ALL localStorage keys for Supabase tokens and validates them
 * Clears ANY invalid, expired, or mismatched tokens
 * This runs at import time to catch issues before the app even starts
 */

import { projectId } from './supabase/direct-api-client';

console.log('[AggressiveTokenCleaner] 🔍 Scanning localStorage for invalid tokens...');

// Helper to decode JWT
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Helper to check if a value looks like a JWT
function looksLikeJWT(value: string): boolean {
  return typeof value === 'string' && 
         value.startsWith('eyJ') && 
         value.split('.').length === 3;
}

// Scan all localStorage keys
let foundInvalidToken = false;
let clearedKeys: string[] = [];

try {
  const allKeys = Object.keys(localStorage);
  console.log('[AggressiveTokenCleaner] Found', allKeys.length, 'localStorage keys');
  
  for (const key of allKeys) {
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;
      
      // Check if this looks like a Supabase key
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
        console.log('[AggressiveTokenCleaner] Checking key:', key);
        
        // Try to parse as JSON
        let parsedValue: any;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Not JSON, might be a plain token
          parsedValue = value;
        }
        
        // Check if this contains a JWT token
        let tokenToCheck: string | null = null;
        
        if (typeof parsedValue === 'string' && looksLikeJWT(parsedValue)) {
          tokenToCheck = parsedValue;
        } else if (parsedValue?.access_token && looksLikeJWT(parsedValue.access_token)) {
          tokenToCheck = parsedValue.access_token;
        } else if (parsedValue?.token && looksLikeJWT(parsedValue.token)) {
          tokenToCheck = parsedValue.token;
        }
        
        if (tokenToCheck) {
          console.log('[AggressiveTokenCleaner] Found token in key:', key);
          
          const decoded = decodeJWT(tokenToCheck);
          if (!decoded) {
            console.error('[AggressiveTokenCleaner] 🚨 Invalid JWT format in key:', key);
            foundInvalidToken = true;
            clearedKeys.push(key);
            continue;
          }
          
          // Check issuer
          const expectedIssuer = `https://${projectId}.supabase.co/auth/v1`;
          if (decoded.iss && decoded.iss !== expectedIssuer) {
            console.error('[AggressiveTokenCleaner] 🚨 Wrong project token in key:', key);
            console.error('[AggressiveTokenCleaner]   Token from:', decoded.iss);
            console.error('[AggressiveTokenCleaner]   Expected:', expectedIssuer);
            foundInvalidToken = true;
            clearedKeys.push(key);
            continue;
          }
          
          // Check expiration
          if (decoded.exp) {
            const now = Math.floor(Date.now() / 1000);
            if (decoded.exp < now) {
              const expiredAgo = now - decoded.exp;
              console.error('[AggressiveTokenCleaner] 🚨 Expired token in key:', key);
              console.error('[AggressiveTokenCleaner]   Expired', expiredAgo, 'seconds ago');
              foundInvalidToken = true;
              clearedKeys.push(key);
              continue;
            }
          }
          
          console.log('[AggressiveTokenCleaner] ✅ Token in key', key, 'appears valid');
        }
      }
    } catch (keyError) {
      console.error('[AggressiveTokenCleaner] Error checking key:', key, keyError);
    }
  }
  
  // If we found any invalid tokens, clear EVERYTHING to be safe
  if (foundInvalidToken) {
    console.error('[AggressiveTokenCleaner] 🚨🚨🚨 INVALID TOKENS DETECTED - CLEARING ALL STORAGE 🚨🚨🚨');
    console.error('[AggressiveTokenCleaner] Cleared keys:', clearedKeys);
    
    localStorage.clear();
    sessionStorage.clear();
    
    // Store a flag so the app knows to show a message
    sessionStorage.setItem('invalid_token_cleared', 'true');
    
    console.log('[AggressiveTokenCleaner] ✅ All storage cleared. User will need to log in again.');
  } else {
    console.log('[AggressiveTokenCleaner] ✅ All tokens are valid (or no tokens found)');
  }
} catch (error) {
  console.error('[AggressiveTokenCleaner] Error during scan:', error);
}

export {}; // Make this a module
