/**
 * ONE-CLICK AUTH ERROR FIX
 * 
 * This utility provides a simple way to fix authentication session errors.
 * Run this when you see "Auth session missing" or "Invalid token" errors.
 */

import { emergencySessionClear, clearAuthSession, recoverSession, diagnoseAndFixSessionErrors } from './session-recovery';
import { createClient } from './supabase/client';

/**
 * ONE-CLICK FIX: Clears all auth data and forces fresh login
 * 
 * Use this when you see these errors:
 * - "Auth session missing!"
 * - "The token is invalid or expired"
 * - "The user needs to log in again"
 * - "The token might be from a different Supabase project"
 */
export async function fixAuthErrorsNow(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 ONE-CLICK AUTH ERROR FIX');
  console.log('='.repeat(60) + '\n');
  
  console.log('Step 1/4: Diagnosing session issues...');
  const diagnosis = await diagnoseAndFixSessionErrors();
  
  if (!diagnosis.hadError) {
    console.log('✅ No auth errors found! Your session is healthy.');
    return;
  }
  
  console.log('❌ Auth error detected:', diagnosis.errorType);
  
  if (diagnosis.fixed) {
    console.log('✅ Session was recovered automatically!');
    console.log('You can continue using the app.');
    return;
  }
  
  console.log('\nStep 2/4: Attempting session recovery...');
  const recovered = await recoverSession();
  
  if (recovered) {
    console.log('✅ Session recovered successfully!');
    console.log('Please refresh the page to continue.');
    return;
  }
  
  console.log('❌ Session recovery failed.');
  console.log('\nStep 3/4: Clearing invalid auth data...');
  
  try {
    // Try graceful sign out first
    const supabase = createClient();
    await supabase.auth.signOut();
    console.log('✅ Signed out successfully');
  } catch (error) {
    console.log('⚠️  Sign out failed (this is expected for invalid sessions)');
  }
  
  // Clear all auth data
  clearAuthSession();
  console.log('✅ Auth data cleared');
  
  console.log('\nStep 4/4: Preparing for fresh login...');
  console.log('✅ All auth errors have been cleared!');
  console.log('\n' + '='.repeat(60));
  console.log('🎉 FIX COMPLETE!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Refresh this page (Cmd+R or Ctrl+R)');
  console.log('2. You will see the login screen');
  console.log('3. Log in with your credentials');
  console.log('4. Everything should work normally now!');
  console.log('\n');
}

/**
 * Check if auth errors are present
 */
export async function hasAuthErrors(): Promise<boolean> {
  const diagnosis = await diagnoseAndFixSessionErrors();
  return diagnosis.hadError && !diagnosis.fixed;
}

/**
 * Get a report of current auth status
 */
export async function getAuthStatusReport(): Promise<string> {
  console.log('Generating auth status report...\n');
  
  const diagnosis = await diagnoseAndFixSessionErrors();
  
  let report = '='.repeat(60) + '\n';
  report += '📊 AUTH STATUS REPORT\n';
  report += '='.repeat(60) + '\n\n';
  
  if (!diagnosis.hadError) {
    report += '✅ STATUS: Healthy\n';
    report += 'No authentication errors detected.\n';
    report += 'Your session is valid and working properly.\n';
  } else if (diagnosis.fixed) {
    report += '✅ STATUS: Recovered\n';
    report += 'An issue was detected but has been fixed automatically.\n';
    report += 'Your session is now working properly.\n';
  } else {
    report += '❌ STATUS: Error\n';
    report += `Error Type: ${diagnosis.errorType}\n`;
    report += `Action Needed: ${diagnosis.action}\n\n`;
    report += 'Your session has an error that requires manual intervention.\n';
    report += 'Run fixAuthErrorsNow() to resolve this issue.\n';
  }
  
  report += '\n' + '='.repeat(60);
  
  return report;
}

/**
 * QUICK FIX - Just clear and reload
 */
export function quickFix() {
  console.log('🚀 QUICK FIX: Clearing auth data and reloading...\n');
  clearAuthSession();
  console.log('✅ Auth data cleared!');
  console.log('🔄 Reloading page in 2 seconds...\n');
  
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}

/**
 * NUCLEAR OPTION - Clear everything
 */
export function nuclearFix() {
  console.log('☢️  NUCLEAR FIX: Clearing ALL local data...\n');
  console.log('⚠️  WARNING: This will clear EVERYTHING in localStorage!');
  console.log('This should only be used as a last resort.\n');
  
  emergencySessionClear();
  
  console.log('✅ Complete!\n');
  console.log('Please refresh the page (Cmd+R or Ctrl+R)');
}

// Make functions available globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).fixAuthErrorsNow = fixAuthErrorsNow;
  (window as any).hasAuthErrors = hasAuthErrors;
  (window as any).getAuthStatusReport = getAuthStatusReport;
  (window as any).quickFix = quickFix;
  (window as any).nuclearFix = nuclearFix;
  
  console.log('\n' + '='.repeat(60));
  console.log('🔧 AUTH ERROR FIX UTILITIES LOADED');
  console.log('='.repeat(60));
  console.log('\nAvailable commands in console:');
  console.log('  • fixAuthErrorsNow()     - Complete fix (recommended)');
  console.log('  • quickFix()             - Fast clear & reload');
  console.log('  • getAuthStatusReport()  - Check current status');
  console.log('  • hasAuthErrors()        - Check if errors exist');
  console.log('  • nuclearFix()           - Clear EVERYTHING (last resort)');
  console.log('\n' + '='.repeat(60) + '\n');
}

export default {
  fixAuthErrorsNow,
  hasAuthErrors,
  getAuthStatusReport,
  quickFix,
  nuclearFix,
};
