// Startup Message - Shows user-friendly info in console

export function showStartupMessage() {
  if (typeof window === 'undefined') return;
  
  const styles = {
    title: 'color: #0057FF; font-size: 24px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,87,255,0.3);',
    subtitle: 'color: #00D4A6; font-size: 14px; font-weight: 600;',
    info: 'color: #666; font-size: 12px;',
    success: 'color: #00D4A6; font-size: 12px; font-weight: bold;',
    warning: 'color: #FF9500; font-size: 12px; font-weight: bold;',
  };
  
  console.log('%c🌟 AuroraLink', styles.title);
  console.log('%cProduction Build v8.0.5', styles.subtitle);
  console.log('%c─────────────────────────────────────────', styles.info);
  console.log('%c✅ Zero external dependencies', styles.success);
  console.log('%c✅ Direct API authentication', styles.success);
  console.log('%c✅ No CDN dependencies', styles.success);
  console.log('%c✅ Production ready', styles.success);
  console.log('%c─────────────────────────────────────────', styles.info);
  console.log('%c💡 Console Commands Available:', styles.info);
  console.log('%c   window.forceReauth() - Force fresh login', styles.info);
  console.log('%c   window.checkTokenCache() - Check token status', styles.info);
  console.log('%c   window.emergencyClearSession() - Emergency clear', styles.info);
  console.log('%c─────────────────────────────────────────', styles.info);
}

// Auto-run on import
if (typeof window !== 'undefined') {
  // Delay slightly to ensure it appears after other startup logs
  setTimeout(showStartupMessage, 100);
}
