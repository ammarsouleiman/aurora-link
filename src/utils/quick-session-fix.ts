/**
 * Quick Session Fix Utility
 * 
 * Provides immediate session clearing commands in the browser console
 */

// Make available globally for easy access
(window as any).fixAuthNow = () => {
  console.log('🔧 [QUICK FIX] Clearing all session data...');
  
  // Clear everything
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear cookies (if any)
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  console.log('✅ [QUICK FIX] Session cleared!');
  console.log('🔄 [QUICK FIX] Reloading page...');
  
  setTimeout(() => {
    window.location.href = window.location.origin;
  }, 500);
};

// Log the command
console.log('');
console.log('🔧 QUICK FIX AVAILABLE:');
console.log('   If you see auth errors, run: fixAuthNow()');
console.log('');

export {};
