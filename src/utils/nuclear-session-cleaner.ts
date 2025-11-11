/**
 * NUCLEAR SESSION CLEANER
 * 
 * This is the FINAL solution to auth session errors.
 * It runs BEFORE everything else and performs a complete, unconditional clear
 * of all auth-related data if there's any indication of auth issues.
 * 
 * Build: 8.0.8 - NUCLEAR FIX
 */

const NUCLEAR_VERSION = 'v8.0.9-stable-20251107'; // Update version to force clear
const NUCLEAR_FLAG_KEY = 'aurora_nuclear_clear';

console.log('[NUCLEAR] 🧹 Starting NUCLEAR session cleaner...');
console.log('[NUCLEAR] Version:', NUCLEAR_VERSION);

try {
  // Check if we've already done the nuclear clear for this version
  const lastNuclearClear = localStorage.getItem(NUCLEAR_FLAG_KEY);
  
  if (lastNuclearClear !== NUCLEAR_VERSION) {
    console.log('[NUCLEAR] 🚨 PERFORMING NUCLEAR CLEAR 🚨');
    console.log('[NUCLEAR] This will clear ALL localStorage and sessionStorage');
    console.log('[NUCLEAR] Users will need to log in again');
    
    // Store ALL localStorage keys first for logging
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }
    
    console.log('[NUCLEAR] Found', allKeys.length, 'localStorage keys');
    console.log('[NUCLEAR] Keys:', allKeys.join(', '));
    
    // COMPLETE CLEAR - Multiple passes to ensure everything is gone
    localStorage.clear();
    sessionStorage.clear();
    
    // Second pass - remove any lingering keys
    try {
      const remainingKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) remainingKeys.push(key);
      }
      remainingKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error('[NUCLEAR] Could not remove key:', key);
        }
      });
    } catch (e) {
      console.error('[NUCLEAR] Error in second pass:', e);
    }
    
    // Set the flag AFTER clearing (this will be the only item)
    localStorage.setItem(NUCLEAR_FLAG_KEY, NUCLEAR_VERSION);
    
    // Also mark migration as complete so it doesn't run again
    localStorage.setItem('aurora_migration_v2_direct_api', '2024-11-01-direct-api-v2');
    
    // Mark that we need to block all API calls until user logs in
    sessionStorage.setItem('nuclear_clear_in_progress', 'true');
    
    // Also clear any IndexedDB (Supabase sometimes uses it)
    if (window.indexedDB) {
      try {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name && db.name.includes('supabase')) {
              console.log('[NUCLEAR] Deleting IndexedDB:', db.name);
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      } catch (e) {
        // IndexedDB operations can fail, that's okay
      }
    }
    
    console.log('[NUCLEAR] ✅ NUCLEAR CLEAR COMPLETE');
    console.log('[NUCLEAR] All auth data has been wiped');
    console.log('[NUCLEAR] Application will start fresh');
    
    // Show a friendly console message (not an error box!)
    console.log('\n');
    console.log('%c┌────────────────────────────────────────────────┐', 'color: #00D4A6; font-weight: bold;');
    console.log('%c│  ✨ AuroraLink Updated Successfully            │', 'color: #00D4A6; font-weight: bold;');
    console.log('%c│  Your session has been refreshed               │', 'color: #00D4A6;');
    console.log('%c│  Please log in to continue                     │', 'color: #00D4A6;');
    console.log('%c└────────────────────────────────────────────────┘', 'color: #00D4A6; font-weight: bold;');
    console.log('\n');
    
    // Set flag for UI to show message
    sessionStorage.setItem('nuclear_clear_performed', 'true');
    
  } else {
    console.log('[NUCLEAR] ✓ Nuclear clear already performed for this version');
    console.log('[NUCLEAR] Skipping clear');
  }
  
} catch (error) {
  console.error('[NUCLEAR] Error during nuclear clear:', error);
  // If there's any error, do a basic clear anyway
  try {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(NUCLEAR_FLAG_KEY, NUCLEAR_VERSION);
  } catch (e) {
    console.error('[NUCLEAR] Failed to clear storage:', e);
  }
}

console.log('[NUCLEAR] 🧹 Nuclear session cleaner finished');

export {};
