// Force Re-Authentication Utility
// Clears all sessions and forces users to log in fresh

export function forceReauth(reason: string = 'Session validation failed') {
  console.log('[ForceReauth] 🔄 Forcing re-authentication:', reason);
  
  // Clear all auth-related data
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      // Remove Supabase auth tokens
      if (key.startsWith('sb-') && key.includes('-auth-token')) {
        keysToRemove.push(key);
      }
      // Remove any other auth-related keys
      if (key.includes('auth') || key.includes('session') || key.includes('token')) {
        keysToRemove.push(key);
      }
    }
  }
  
  // Remove all identified keys
  keysToRemove.forEach(key => {
    console.log('[ForceReauth] Removing:', key);
    localStorage.removeItem(key);
  });
  
  console.log('[ForceReauth] ✅ Cleared', keysToRemove.length, 'auth-related items');
  console.log('[ForceReauth] Reloading application...');
  
  // Force reload to fresh state
  window.location.href = '/';
}

// Export as window function for console access
if (typeof window !== 'undefined') {
  (window as any).forceReauth = forceReauth;
}
