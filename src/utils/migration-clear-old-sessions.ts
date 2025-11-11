// One-time migration: Clear all old sessions from before the direct API client update
// This ensures users don't have corrupted sessions from the old @supabase/supabase-js client

const MIGRATION_KEY = 'aurora_migration_v2_direct_api';
const MIGRATION_VERSION = '2024-11-01-direct-api-v2'; // Updated version to force re-run

export function runSessionMigration(): boolean {
  try {
    const completedMigration = localStorage.getItem(MIGRATION_KEY);
    
    if (completedMigration === MIGRATION_VERSION) {
      // Migration already completed
      return false;
    }
    
    console.log('[Migration] 🔄 Running one-time session migration...');
    console.log('[Migration] Version:', MIGRATION_VERSION);
    console.log('[Migration] Clearing all old authentication sessions');
    
    // AGGRESSIVE: Clear ALL localStorage except the migration key
    // This ensures no corrupted sessions remain
    console.log('[Migration] ⚠️  Performing COMPLETE localStorage clear...');
    
    const keysToKeep = [MIGRATION_KEY]; // Only keep the migration flag
    const allKeys: string[] = [];
    
    // Collect all keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.includes(key)) {
        allKeys.push(key);
      }
    }
    
    // Remove all keys except those we want to keep
    let removedCount = 0;
    allKeys.forEach(key => {
      console.log('[Migration] Removing:', key);
      localStorage.removeItem(key);
      removedCount++;
    });
    
    console.log('[Migration] ✅ Cleared', removedCount, 'items from localStorage');
    
    // Mark migration as complete
    localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
    console.log('[Migration] ✅ Migration complete');
    
    return true;
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    return false;
  }
}

// Auto-run on import
if (typeof window !== 'undefined') {
  const didMigrate = runSessionMigration();
  
  if (didMigrate) {
    console.log('[Migration] 💡 COMPLETE localStorage clear executed.');
    console.log('[Migration] 💡 All users will need to log in again.');
    console.log('[Migration] 💡 This is a ONE-TIME migration for the new auth system.');
    
    // Show a user-friendly message
    // We can't use toast here since it's not initialized yet, but we can set a flag
    sessionStorage.setItem('show_migration_message', 'true');
    
    // Also log to console for visibility
    console.warn('╔════════════════════════════════════════════════════════════╗');
    console.warn('║  AuroraLink Authentication System Upgrade                 ║');
    console.warn('║  All old sessions have been cleared for security          ║');
    console.warn('║  Please log in again to continue                          ║');
    console.warn('╚════════════════════════════════════════════════════════════╝');
  }
}
