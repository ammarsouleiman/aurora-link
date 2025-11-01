/**
 * Emergency Session Cleaner
 * 
 * This utility provides emergency session clearing functionality
 * for users experiencing persistent auth errors.
 * 
 * To use in browser console:
 * 1. Copy and paste this entire code into the console
 * 2. Run: emergencyClearSession()
 */

export function emergencyClearSession() {
  console.log('🚨 EMERGENCY SESSION CLEANER 🚨');
  console.log('================================');
  
  try {
    // Step 1: List all localStorage keys
    console.log('\n📋 Current localStorage keys:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      console.log(`  - ${key}`);
    }
    
    // Step 2: Clear localStorage
    console.log('\n🧹 Clearing localStorage...');
    localStorage.clear();
    console.log('  ✅ localStorage cleared');
    
    // Step 3: Clear sessionStorage
    console.log('\n🧹 Clearing sessionStorage...');
    sessionStorage.clear();
    console.log('  ✅ sessionStorage cleared');
    
    // Step 4: Clear cookies (if any)
    console.log('\n🧹 Clearing cookies...');
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    console.log('  ✅ Cookies cleared');
    
    // Step 5: Clear IndexedDB (if used)
    console.log('\n🧹 Clearing IndexedDB...');
    if (window.indexedDB) {
      window.indexedDB.databases().then((databases) => {
        databases.forEach((db) => {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
            console.log(`  ✅ Deleted database: ${db.name}`);
          }
        });
      });
    }
    
    console.log('\n================================');
    console.log('✅ EMERGENCY CLEAN COMPLETE');
    console.log('================================');
    console.log('\n🔄 Reloading page in 2 seconds...\n');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error during emergency clean:', error);
    console.log('\n⚠️  Manual steps required:');
    console.log('1. Open DevTools (F12)');
    console.log('2. Go to Application tab');
    console.log('3. Clear all storage manually');
    console.log('4. Reload the page');
  }
}

// Also expose as a global for easy access
if (typeof window !== 'undefined') {
  (window as any).emergencyClearSession = emergencyClearSession;
  console.log('💡 Emergency session cleaner loaded!');
  console.log('💡 Run: window.emergencyClearSession() if you have auth issues');
}
