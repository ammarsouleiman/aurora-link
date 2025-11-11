/**
 * AUTO ERROR FIXER
 * 
 * Automatically detects and fixes common errors in AuroraLink
 * Run this on startup to catch and fix issues before they affect users
 */

// Helper to safely access localStorage
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fix 1: Check for corrupted localStorage
 */
function fixCorruptedStorage() {
  console.log('[AutoFix] Checking for corrupted storage...');
  
  try {
    // Try to access localStorage
    const testKey = 'aurora_test_' + Date.now();
    localStorage.setItem(testKey, 'test');
    const testValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    if (testValue !== 'test') {
      console.error('[AutoFix] ❌ Storage is corrupted');
      return false;
    }
    
    console.log('[AutoFix] ✅ Storage is working');
    return true;
  } catch (error) {
    console.error('[AutoFix] ❌ Storage access failed:', error);
    return false;
  }
}

/**
 * Fix 2: Validate all stored sessions
 */
function fixInvalidSessions() {
  console.log('[AutoFix] Validating stored sessions...');
  
  const projectId = 'aavljgcuaajnimeohelq';
  const sessionKey = `sb-${projectId}-auth-token`;
  const storedSession = safeGetItem(sessionKey);
  
  if (!storedSession) {
    console.log('[AutoFix] ℹ️  No session found (this is ok)');
    return true;
  }
  
  try {
    const session = JSON.parse(storedSession);
    
    // Check for required fields
    if (!session.access_token || !session.refresh_token) {
      console.error('[AutoFix] ❌ Session missing required fields');
      safeRemoveItem(sessionKey);
      console.log('[AutoFix] ✅ Removed invalid session');
      return false;
    }
    
    // Check token format
    if (!session.access_token.startsWith('eyJ')) {
      console.error('[AutoFix] ❌ Invalid token format');
      safeRemoveItem(sessionKey);
      console.log('[AutoFix] ✅ Removed invalid token');
      return false;
    }
    
    // Decode and validate token
    try {
      const parts = session.access_token.split('.');
      if (parts.length !== 3) {
        console.error('[AutoFix] ❌ Malformed JWT');
        safeRemoveItem(sessionKey);
        console.log('[AutoFix] ✅ Removed malformed token');
        return false;
      }
      
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const expectedIssuer = `https://${projectId}.supabase.co/auth/v1`;
      
      if (payload.iss !== expectedIssuer) {
        console.error('[AutoFix] ❌ Token from wrong project');
        console.error('[AutoFix] Expected:', expectedIssuer);
        console.error('[AutoFix] Got:', payload.iss);
        safeRemoveItem(sessionKey);
        console.log('[AutoFix] ✅ Removed wrong-project token');
        return false;
      }
      
      // Check expiration
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          console.error('[AutoFix] ❌ Token expired');
          safeRemoveItem(sessionKey);
          console.log('[AutoFix] ✅ Removed expired token');
          return false;
        }
      }
      
      console.log('[AutoFix] ✅ Session is valid');
      return true;
    } catch (decodeError) {
      console.error('[AutoFix] ❌ Failed to decode token');
      safeRemoveItem(sessionKey);
      console.log('[AutoFix] ✅ Removed undecryptable token');
      return false;
    }
  } catch (parseError) {
    console.error('[AutoFix] ❌ Failed to parse session');
    safeRemoveItem(sessionKey);
    console.log('[AutoFix] ✅ Removed unparseable session');
    return false;
  }
}

/**
 * Fix 3: Clean up orphaned storage keys
 */
function fixOrphanedKeys() {
  console.log('[AutoFix] Cleaning orphaned keys...');
  
  const projectId = 'aavljgcuaajnimeohelq';
  let cleaned = 0;
  
  try {
    // Get all keys
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    
    // Find and remove keys from wrong projects
    for (const key of keys) {
      if (key.startsWith('sb-') && key.includes('-auth-token')) {
        const match = key.match(/^sb-([^-]+)-auth-token$/);
        if (match) {
          const storedProjectId = match[1];
          if (storedProjectId !== projectId) {
            console.log(`[AutoFix] Removing key from wrong project: ${key}`);
            safeRemoveItem(key);
            cleaned++;
          }
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(`[AutoFix] ✅ Cleaned ${cleaned} orphaned keys`);
    } else {
      console.log('[AutoFix] ✅ No orphaned keys found');
    }
    
    return true;
  } catch (error) {
    console.error('[AutoFix] Error cleaning orphaned keys:', error);
    return false;
  }
}

/**
 * Fix 4: Verify critical files are accessible
 */
function fixCriticalPaths() {
  console.log('[AutoFix] Verifying critical paths...');
  
  const criticalChecks = [
    { name: 'localStorage', check: () => typeof localStorage !== 'undefined' },
    { name: 'sessionStorage', check: () => typeof sessionStorage !== 'undefined' },
    { name: 'fetch', check: () => typeof fetch !== 'undefined' },
    { name: 'atob', check: () => typeof atob !== 'undefined' },
    { name: 'btoa', check: () => typeof btoa !== 'undefined' },
  ];
  
  let allPassed = true;
  
  for (const { name, check } of criticalChecks) {
    try {
      if (check()) {
        console.log(`[AutoFix] ✅ ${name} available`);
      } else {
        console.error(`[AutoFix] ❌ ${name} not available`);
        allPassed = false;
      }
    } catch (error) {
      console.error(`[AutoFix] ❌ ${name} check failed:`, error);
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * Fix 5: Reset error counters if too high
 */
function fixErrorCounters() {
  console.log('[AutoFix] Checking error counters...');
  
  const errorCount = safeGetItem('aurora_auth_error_count');
  
  if (errorCount) {
    const count = parseInt(errorCount, 10);
    if (count > 10) {
      console.warn(`[AutoFix] ⚠️  Error counter very high: ${count}`);
      console.log('[AutoFix] Resetting error counter');
      safeRemoveItem('aurora_auth_error_count');
      console.log('[AutoFix] ✅ Error counter reset');
      return false;
    }
  }
  
  console.log('[AutoFix] ✅ Error counters ok');
  return true;
}

/**
 * Fix 6: Clean up expired cache entries
 */
function fixExpiredCache() {
  console.log('[AutoFix] Cleaning expired cache...');
  
  let cleaned = 0;
  
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    
    for (const key of keys) {
      if (key.startsWith('cache:')) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const { timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (age > maxAge) {
              safeRemoveItem(key);
              cleaned++;
            }
          }
        } catch {
          // If we can't parse it, remove it
          safeRemoveItem(key);
          cleaned++;
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(`[AutoFix] ✅ Cleaned ${cleaned} expired cache entries`);
    } else {
      console.log('[AutoFix] ✅ No expired cache entries');
    }
    
    return true;
  } catch (error) {
    console.error('[AutoFix] Error cleaning cache:', error);
    return false;
  }
}

/**
 * Main auto-fix function
 */
export function runAutoErrorFixer(): {
  success: boolean;
  fixes: string[];
  errors: string[];
} {
  console.log('[AutoFix] ========== AUTO ERROR FIXER STARTING ==========');
  
  const fixes: string[] = [];
  const errors: string[] = [];
  
  // Run all fixes
  const checks = [
    { name: 'Storage', fn: fixCorruptedStorage },
    { name: 'Sessions', fn: fixInvalidSessions },
    { name: 'Orphaned Keys', fn: fixOrphanedKeys },
    { name: 'Critical Paths', fn: fixCriticalPaths },
    { name: 'Error Counters', fn: fixErrorCounters },
    { name: 'Expired Cache', fn: fixExpiredCache },
  ];
  
  for (const { name, fn } of checks) {
    try {
      const result = fn();
      if (result) {
        fixes.push(name);
      } else {
        errors.push(name);
      }
    } catch (error) {
      console.error(`[AutoFix] ❌ ${name} failed:`, error);
      errors.push(name);
    }
  }
  
  console.log('[AutoFix] ========== AUTO ERROR FIXER COMPLETE ==========');
  console.log(`[AutoFix] ✅ Fixed: ${fixes.join(', ')}`);
  if (errors.length > 0) {
    console.log(`[AutoFix] ❌ Errors: ${errors.join(', ')}`);
  }
  
  return {
    success: errors.length === 0,
    fixes,
    errors,
  };
}

// Auto-run on import
runAutoErrorFixer();

export default { runAutoErrorFixer };
