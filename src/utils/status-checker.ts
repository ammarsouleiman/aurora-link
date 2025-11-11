/**
 * STATUS CHECKER
 * 
 * Comprehensive system health check
 * Run window.checkAuroraStatus() in console to diagnose issues
 */

import { projectId, publicAnonKey } from './supabase/direct-api-client';

interface StatusResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

/**
 * Check 1: Environment availability
 */
function checkEnvironment(): StatusResult[] {
  const results: StatusResult[] = [];
  
  // Check browser APIs
  const apis = [
    { name: 'localStorage', obj: typeof window !== 'undefined' && typeof localStorage !== 'undefined' },
    { name: 'sessionStorage', obj: typeof sessionStorage !== 'undefined' },
    { name: 'fetch', obj: typeof fetch !== 'undefined' },
    { name: 'indexedDB', obj: typeof indexedDB !== 'undefined' },
    { name: 'WebRTC', obj: typeof RTCPeerConnection !== 'undefined' },
  ];
  
  for (const { name, obj } of apis) {
    results.push({
      category: 'Environment',
      status: obj ? 'pass' : 'fail',
      message: `${name} ${obj ? 'available' : 'NOT available'}`,
    });
  }
  
  return results;
}

/**
 * Check 2: Storage health
 */
function checkStorage(): StatusResult[] {
  const results: StatusResult[] = [];
  
  try {
    // Test localStorage
    const testKey = 'aurora_test_' + Date.now();
    localStorage.setItem(testKey, 'test');
    const testValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    if (testValue === 'test') {
      results.push({
        category: 'Storage',
        status: 'pass',
        message: 'localStorage read/write working',
      });
    } else {
      results.push({
        category: 'Storage',
        status: 'fail',
        message: 'localStorage read/write FAILED',
      });
    }
  } catch (error) {
    results.push({
      category: 'Storage',
      status: 'fail',
      message: 'localStorage access FAILED',
      details: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Check storage usage
  try {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        totalSize += key.length + (value?.length || 0);
      }
    }
    
    const sizeKB = (totalSize / 1024).toFixed(2);
    const storageLimitKB = 5120; // ~5MB typical limit
    const usagePercent = ((totalSize / 1024 / storageLimitKB) * 100).toFixed(1);
    
    results.push({
      category: 'Storage',
      status: parseFloat(usagePercent) > 80 ? 'warning' : 'pass',
      message: `Storage usage: ${sizeKB} KB (${usagePercent}%)`,
      details: { totalSize, sizeKB, usagePercent },
    });
  } catch (error) {
    results.push({
      category: 'Storage',
      status: 'warning',
      message: 'Could not calculate storage usage',
    });
  }
  
  return results;
}

/**
 * Check 3: Session status
 */
function checkSession(): StatusResult[] {
  const results: StatusResult[] = [];
  
  const sessionKey = `sb-${projectId}-auth-token`;
  const storedSession = localStorage.getItem(sessionKey);
  
  if (!storedSession) {
    results.push({
      category: 'Session',
      status: 'pass',
      message: 'No session stored (user not logged in)',
    });
    return results;
  }
  
  try {
    const session = JSON.parse(storedSession);
    
    // Check required fields
    if (!session.access_token || !session.refresh_token) {
      results.push({
        category: 'Session',
        status: 'fail',
        message: 'Session missing required fields',
        details: {
          hasAccessToken: !!session.access_token,
          hasRefreshToken: !!session.refresh_token,
        },
      });
      return results;
    }
    
    // Check token format
    if (!session.access_token.startsWith('eyJ')) {
      results.push({
        category: 'Session',
        status: 'fail',
        message: 'Invalid token format (not a JWT)',
      });
      return results;
    }
    
    // Decode token
    try {
      const parts = session.access_token.split('.');
      if (parts.length !== 3) {
        results.push({
          category: 'Session',
          status: 'fail',
          message: 'Malformed JWT token',
        });
        return results;
      }
      
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // Check issuer
      const expectedIssuer = `https://${projectId}.supabase.co/auth/v1`;
      if (payload.iss !== expectedIssuer) {
        results.push({
          category: 'Session',
          status: 'fail',
          message: 'Token from wrong Supabase project',
          details: {
            expected: expectedIssuer,
            actual: payload.iss,
          },
        });
        return results;
      }
      
      // Check expiration
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = payload.exp - now;
        const hoursUntilExpiry = (timeUntilExpiry / 3600).toFixed(1);
        
        if (timeUntilExpiry < 0) {
          results.push({
            category: 'Session',
            status: 'fail',
            message: 'Token expired',
            details: {
              expiredHoursAgo: Math.abs(parseFloat(hoursUntilExpiry)),
            },
          });
        } else if (timeUntilExpiry < 3600) {
          results.push({
            category: 'Session',
            status: 'warning',
            message: `Token expires soon (${Math.floor(timeUntilExpiry / 60)} minutes)`,
          });
        } else {
          results.push({
            category: 'Session',
            status: 'pass',
            message: `Token valid (${hoursUntilExpiry} hours remaining)`,
          });
        }
      } else {
        results.push({
          category: 'Session',
          status: 'warning',
          message: 'Token has no expiration',
        });
      }
      
      // Check user info
      if (payload.sub) {
        results.push({
          category: 'Session',
          status: 'pass',
          message: 'User ID present in token',
          details: { userId: payload.sub },
        });
      } else {
        results.push({
          category: 'Session',
          status: 'fail',
          message: 'No user ID in token',
        });
      }
      
    } catch (decodeError) {
      results.push({
        category: 'Session',
        status: 'fail',
        message: 'Failed to decode token',
        details: decodeError instanceof Error ? decodeError.message : String(decodeError),
      });
    }
    
  } catch (parseError) {
    results.push({
      category: 'Session',
      status: 'fail',
      message: 'Failed to parse session data',
      details: parseError instanceof Error ? parseError.message : String(parseError),
    });
  }
  
  return results;
}

/**
 * Check 4: Network connectivity
 */
async function checkNetwork(): Promise<StatusResult[]> {
  const results: StatusResult[] = [];
  
  // Check Supabase health
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-29f6739b/health`,
      { 
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json();
      results.push({
        category: 'Network',
        status: 'pass',
        message: 'Server health check passed',
        details: data,
      });
    } else {
      results.push({
        category: 'Network',
        status: 'fail',
        message: `Server returned ${response.status}`,
      });
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      results.push({
        category: 'Network',
        status: 'fail',
        message: 'Server health check timeout (5s)',
      });
    } else {
      results.push({
        category: 'Network',
        status: 'fail',
        message: 'Server unreachable',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // Check Supabase REST API
  try {
    const response = await fetch(`https://${projectId}.supabase.co/rest/v1/`, {
      headers: {
        'apikey': publicAnonKey,
      },
    });
    
    results.push({
      category: 'Network',
      status: response.ok ? 'pass' : 'warning',
      message: `Supabase REST API ${response.ok ? 'accessible' : 'returned ' + response.status}`,
    });
  } catch (error) {
    results.push({
      category: 'Network',
      status: 'fail',
      message: 'Supabase REST API unreachable',
      details: error instanceof Error ? error.message : String(error),
    });
  }
  
  return results;
}

/**
 * Check 5: App state
 */
function checkAppState(): StatusResult[] {
  const results: StatusResult[] = [];
  
  // Check nuclear clear status
  const nuclearVersion = localStorage.getItem('aurora_nuclear_clear');
  if (nuclearVersion) {
    results.push({
      category: 'App State',
      status: 'pass',
      message: `Nuclear clear performed: ${nuclearVersion}`,
    });
  } else {
    results.push({
      category: 'App State',
      status: 'warning',
      message: 'Nuclear clear not yet performed',
    });
  }
  
  // Check error count
  const errorCount = localStorage.getItem('aurora_auth_error_count');
  if (errorCount) {
    const count = parseInt(errorCount, 10);
    results.push({
      category: 'App State',
      status: count > 5 ? 'warning' : 'pass',
      message: `Auth error count: ${count}`,
    });
  } else {
    results.push({
      category: 'App State',
      status: 'pass',
      message: 'No auth errors recorded',
    });
  }
  
  // Check cache entries
  let cacheCount = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cache:')) {
      cacheCount++;
    }
  }
  
  results.push({
    category: 'App State',
    status: 'pass',
    message: `Cache entries: ${cacheCount}`,
  });
  
  return results;
}

/**
 * Main status check function
 */
export async function checkAuroraStatus(): Promise<void> {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  AURORALINK STATUS CHECK');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
  const allResults: StatusResult[] = [];
  
  // Run synchronous checks
  allResults.push(...checkEnvironment());
  allResults.push(...checkStorage());
  allResults.push(...checkSession());
  allResults.push(...checkAppState());
  
  // Run async checks
  console.log('⏳ Running network checks (this may take a moment)...');
  const networkResults = await checkNetwork();
  allResults.push(...networkResults);
  
  // Group results by category
  const categories: Record<string, StatusResult[]> = {};
  for (const result of allResults) {
    if (!categories[result.category]) {
      categories[result.category] = [];
    }
    categories[result.category].push(result);
  }
  
  // Print results
  for (const [category, results] of Object.entries(categories)) {
    console.log('');
    console.log(`━━━ ${category} ━━━`);
    for (const result of results) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${result.message}`);
      if (result.details) {
        console.log('   Details:', result.details);
      }
    }
  }
  
  // Summary
  const passed = allResults.filter(r => r.status === 'pass').length;
  const warnings = allResults.filter(r => r.status === 'warning').length;
  const failed = allResults.filter(r => r.status === 'fail').length;
  const total = allResults.length;
  
  console.log('');
  console.log('━━━ Summary ━━━');
  console.log(`✅ Passed: ${passed}/${total}`);
  if (warnings > 0) console.log(`⚠️  Warnings: ${warnings}/${total}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}/${total}`);
  
  console.log('');
  
  // Overall status
  if (failed > 0) {
    console.log('🔴 Overall Status: ISSUES DETECTED');
    console.log('');
    console.log('Recommended Actions:');
    console.log('1. Fix failed checks above');
    console.log('2. Try: window.emergencyClearSession()');
    console.log('3. Reload the page');
  } else if (warnings > 0) {
    console.log('🟡 Overall Status: WORKING WITH WARNINGS');
  } else {
    console.log('🟢 Overall Status: ALL SYSTEMS OPERATIONAL');
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
}

// Install globally
if (typeof window !== 'undefined') {
  (window as any).checkAuroraStatus = checkAuroraStatus;
  console.log('💡 Type window.checkAuroraStatus() to run diagnostics');
}

export default { checkAuroraStatus };
