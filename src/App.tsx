// AuroraLink - Professional WhatsApp-style Messaging App v1.1
import { useState, useEffect, useRef } from 'react';
import { Toaster } from './components/ui/sonner';
import { SplashScreen } from './components/screens/SplashScreen';
import { OnboardingScreen } from './components/screens/OnboardingScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { ConversationScreen } from './components/screens/ConversationScreen';
import { NewChatScreen } from './components/screens/NewChatScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { CallScreen } from './components/screens/CallScreen';
import { StoryViewerScreen } from './components/screens/StoryViewerScreen';
import { StoryComposerScreen } from './components/screens/StoryComposerScreen';
import { ProfileViewScreen } from './components/screens/ProfileViewScreen';
import { IncomingCallDialog } from './components/IncomingCallDialog';
import { PermissionRequestDialog } from './components/PermissionRequestDialog';
import { AuthErrorBoundary } from './components/AuthErrorBoundary';
import { createClient, getCurrentUser } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import { presenceApi, callsApi, blockApi, conversationsApi } from './utils/api';
import { WebRTCManager } from './utils/webrtc';
import { toast } from './utils/toast';
import { emergencyClearSession } from './utils/emergency-session-cleaner';
import { initializeSessionRecovery, clearAuthSession } from './utils/session-recovery';
import { startBackgroundRefresh, stopBackgroundRefresh, clearTokenCache, getTokenCacheInfo } from './utils/token-manager';
import './utils/fix-auth-errors'; // Auto-loads console utilities
import type { User as UserType, ViewState, Call, UserStories } from './utils/types';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('onboarding');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthError, setShowAuthError] = useState(false);
  
  // Load error count from localStorage to persist across reloads
  const getAuthErrorCount = () => {
    try {
      const stored = localStorage.getItem('aurora_auth_error_count');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  };
  const [authErrorCount, setAuthErrorCount] = useState(getAuthErrorCount());
  const authErrorCountRef = useRef(authErrorCount);
  
  // Global helpers for manual session clearing (can be called from browser console)
  useEffect(() => {
    // Basic session clear
    (window as any).clearAuroraSession = async () => {
      console.log('[Manual Clear] Clearing session...');
      const supabase = createClient();
      await supabase.auth.signOut();
      localStorage.clear();
      console.log('[Manual Clear] ✅ Session cleared! Reloading page...');
      window.location.reload();
    };
    
    // Emergency clear (more thorough)
    (window as any).emergencyClearSession = emergencyClearSession;
    
    // Token cache debugging helper
    (window as any).checkTokenCache = () => {
      const info = getTokenCacheInfo();
      console.log('🔑 Token Cache Info:', info);
      return info;
    };
    
    // Log available commands
    console.log('💡 AuroraLink Session Clearing Commands:');
    console.log('  - window.clearAuroraSession() - Basic session clear');
    console.log('  - window.emergencyClearSession() - Emergency full clear');
    console.log('  - window.checkTokenCache() - Check token cache status');
    
    // AGGRESSIVE: Clear any sessions from wrong projects on EVERY app load
    const clearWrongProjectSessions = () => {
      console.log('[Session Cleaner] 🧹 Scanning for wrong-project sessions...');
      
      const correctProjectId = projectId;
      console.log('[Session Cleaner] Current project:', correctProjectId);
      
      // Scan all localStorage keys for Supabase session data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
          // Extract project ID from key: sb-{projectId}-auth-token
          const match = key.match(/^sb-([^-]+)-auth-token$/);
          if (match) {
            const storedProjectId = match[1];
            if (storedProjectId !== correctProjectId) {
              console.warn('[Session Cleaner] 🚨 Found session from WRONG project:', storedProjectId);
              console.warn('[Session Cleaner] Removing key:', key);
              localStorage.removeItem(key);
            }
          }
        }
      }
      
      console.log('[Session Cleaner] ✅ Scan complete');
    };
    
    clearWrongProjectSessions();
    
    return () => {
      delete (window as any).clearAuroraSession;
    };
  }, []);
  
  // Story state
  const [storyUsersList, setStoryUsersList] = useState<UserStories[]>([]);
  const [storyInitialIndex, setStoryInitialIndex] = useState(0);
  const [homeScreenKey, setHomeScreenKey] = useState(0); // For forcing HomeScreen refresh
  
  // Profile view state
  const [profileViewUser, setProfileViewUser] = useState<UserType | null>(null);
  const [profileViewLastSeen, setProfileViewLastSeen] = useState<string>('');
  const [returnToConversation, setReturnToConversation] = useState<string | null>(null);
  
  // Call state
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callRecipient, setCallRecipient] = useState<UserType | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<'voice' | 'video' | null>(null);
  const [pendingRecipient, setPendingRecipient] = useState<UserType | null>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);
  const callPollInterval = useRef<NodeJS.Timeout | null>(null);
  const signalPollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Helper to decode JWT to check project ID
    const decodeJWT = (token: string): any => {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
      } catch (error) {
        return null;
      }
    };
    
    // Immediately validate and clear any corrupted sessions on mount
    const validateStartupSession = async () => {
      try {
        console.log('[Startup] 🔍 Validating existing session...');
        console.log('[Startup] Current project ID:', projectId);
        
        // NEW: Use our session recovery utility
        const recoveryResult = await initializeSessionRecovery();
        
        if (recoveryResult.hadError && !recoveryResult.fixed) {
          console.log('[Startup] Session has unrecoverable errors - showing error boundary');
          
          // Clear the corrupted session
          clearAuthSession();
          
          // Increment auth error count to prevent infinite loops
          const newCount = authErrorCountRef.current + 1;
          authErrorCountRef.current = newCount;
          setAuthErrorCount(newCount);
          localStorage.setItem('aurora_auth_error_count', newCount.toString());
          console.log('[Startup] Auth error count:', newCount);
          
          // If we've had too many auth errors in a row, just skip error screen and go to auth
          if (newCount > 2) {
            console.error('[Startup] Too many auth errors detected - skipping error screen, going directly to auth');
            setLoading(false);
            setCurrentView('auth');
            return;
          }
          
          // Show error screen for first/second occurrence
          setShowAuthError(true);
          setLoading(false);
          return;
        }
        
        if (recoveryResult.fixed) {
          console.log('[Startup] ✅ Session was recovered automatically');
        } else {
          console.log('[Startup] ✅ No session errors detected');
        }
        
        // Check localStorage directly for session data
        const sessionKey = `sb-${projectId}-auth-token`;
        const storedSession = localStorage.getItem(sessionKey);
        
        if (storedSession) {
          try {
            const sessionData = JSON.parse(storedSession);
            if (sessionData?.access_token) {
              console.log('[Startup] Found stored session token, validating...');
              
              // Check token format
              if (!sessionData.access_token.startsWith('eyJ')) {
                console.error('[Startup] 🚨 Invalid token format - clearing immediately');
                localStorage.clear();
                toast.error('Session Cleared', {
                  description: 'Invalid session detected. Please log in again.',
                  duration: 5000,
                });
                return;
              }
              
              // Decode and check project
              const decoded = decodeJWT(sessionData.access_token);
              if (decoded) {
                const expectedIssuer = `https://${projectId}.supabase.co/auth/v1`;
                console.log('[Startup] Token issuer:', decoded.iss);
                console.log('[Startup] Expected issuer:', expectedIssuer);
                
                if (decoded.iss !== expectedIssuer) {
                  console.error('[Startup] 🚨 TOKEN FROM DIFFERENT PROJECT DETECTED!');
                  console.error('[Startup] This token belongs to:', decoded.iss);
                  console.error('[Startup] Current project:', expectedIssuer);
                  console.error('[Startup] Clearing mismatched session...');
                  
                  // Increment auth error count
                  const newCount = authErrorCountRef.current + 1;
                  authErrorCountRef.current = newCount;
                  setAuthErrorCount(newCount);
                  localStorage.setItem('aurora_auth_error_count', newCount.toString());
                  
                  clearAuthSession();
                  
                  // If repeated errors, just force to auth screen
                  if (newCount > 2) {
                    console.error('[Startup] Too many auth errors - forcing auth screen');
                    setLoading(false);
                    setCurrentView('auth');
                    return;
                  }
                  
                  setShowAuthError(true);
                  setLoading(false);
                  
                  return;
                }
                
                console.log('[Startup] ✅ Token project ID matches');
              }
            }
          } catch (parseError) {
            console.error('[Startup] Error parsing stored session:', parseError);
            localStorage.clear();
            return;
          }
        }
        
        // Now try with Supabase client
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && !error) {
          console.log('[Startup] Supabase session found, attempting refresh...');
          
          // Try a quick refresh to validate
          const { error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError && (
            refreshError.message.includes('Invalid Refresh Token') ||
            refreshError.message.includes('Auth session missing') ||
            refreshError.message.includes('invalid_grant') ||
            refreshError.message.includes('refresh_token_not_found') ||
            refreshError.name === 'AuthSessionMissingError'
          )) {
            console.error('[Startup] 🚨 Session refresh failed - token is invalid');
            console.error('[Startup] Error:', refreshError.message);
            console.error('[Startup] Error name:', refreshError.name);
            console.error('[Startup] Clearing invalid session...');
            
            await supabase.auth.signOut();
            localStorage.clear();
            
            toast.error('Session Invalid', {
              description: 'Previous session was invalid. Please log in again.',
              duration: 5000,
            });
          } else if (!refreshError) {
            console.log('[Startup] ✅ Session refresh successful');
          }
        }
      } catch (err) {
        console.error('[Startup] Error validating session:', err);
        // If there's any error, clear to be safe
        localStorage.clear();
      }
    };
    
    // Validate session immediately, then show splash and check auth
    validateStartupSession().then(() => {
      timer = setTimeout(() => {
        setShowSplash(false);
        checkAuth();
      }, 2500);
    });
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    // Session health check - validate and refresh session periodically
    if (currentUser && currentView === 'home') {
      const checkSessionHealth = async () => {
        try {
          const supabase = createClient();
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error || !session) {
            console.error('[Session Health] Session lost, logging out...');
            toast.error('Session expired', {
              description: 'Please log in again to continue.',
            });
            await handleLogout();
            return;
          }
          
          // Validate the token is a real JWT
          if (!session.access_token || !session.access_token.startsWith('eyJ')) {
            console.error('[Session Health] Invalid token format, logging out...');
            await handleLogout();
            return;
          }
          
          // Check if token is expired or expiring soon (within 5 minutes)
          if (session.expires_at) {
            const expiresAt = session.expires_at * 1000;
            const now = Date.now();
            const timeUntilExpiry = expiresAt - now;
            
            if (timeUntilExpiry < 0) {
              console.warn('[Session Health] Token expired, refreshing...');
              const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError || !newSession) {
                console.error('[Session Health] Refresh failed, logging out...');
                toast.error('Session expired', {
                  description: 'Please log in again to continue.',
                });
                await handleLogout();
              } else {
                console.log('[Session Health] ✅ Session refreshed successfully');
              }
            } else if (timeUntilExpiry < 5 * 60 * 1000) {
              // Proactively refresh if expiring within 5 minutes
              console.log('[Session Health] Token expiring soon, refreshing proactively...');
              const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (!refreshError && newSession) {
                console.log('[Session Health] ✅ Session proactively refreshed');
              } else {
                console.warn('[Session Health] Proactive refresh failed, will retry later');
              }
            }
          }
          
          // Validate token can actually be used by calling getUser()
          const { error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('[Session Health] Token validation failed:', userError.message);
            console.error('[Session Health] Error name:', userError.name);
            
            // If it's an AuthSessionMissingError, the token is completely invalid
            if (userError.name === 'AuthSessionMissingError' || userError.message.includes('Auth session missing')) {
              console.error('[Session Health] CRITICAL: Auth session missing error detected');
              console.error('[Session Health] This means the token is from a different project or corrupted');
              
              // Show the error boundary instead of just toasting
              clearAuthSession();
              setShowAuthError(true);
              return;
            } else {
              // For other errors, try refreshing once
              console.warn('[Session Health] Attempting one-time session refresh...');
              const { error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError) {
                console.error('[Session Health] Refresh failed, logging out');
                toast.error('Session Error', {
                  description: 'Could not refresh your session. Please log in again.',
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                await handleLogout();
              } else {
                console.log('[Session Health] ✅ Session refreshed successfully');
              }
            }
          }
        } catch (error) {
          console.error('[Session Health] Error checking session:', error);
        }
      };
      
      // Check immediately on mount
      checkSessionHealth();
      
      // Check session health every 30 seconds
      const sessionHealthInterval = setInterval(checkSessionHealth, 30000);
      
      return () => {
        clearInterval(sessionHealthInterval);
      };
    }
  }, [currentUser, currentView]);

  useEffect(() => {
    // Update presence when user changes
    if (currentUser && currentView === 'home') {
      const updatePresence = async () => {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.access_token) {
            const result = await presenceApi.updateStatus(true);
            if (!result.success) {
              console.error('[Presence] Failed to update status:', result.error);
            }
          } else {
            console.warn('[Presence] No valid session, skipping presence update');
          }
        } catch (error) {
          console.error('[Presence] Error updating presence:', error);
        }
      };
      
      updatePresence();

      // Update presence on visibility change
      const handleVisibilityChange = async () => {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.access_token) {
            if (document.hidden) {
              await presenceApi.updateStatus(false);
            } else {
              await presenceApi.updateStatus(true);
            }
          }
        } catch (error) {
          console.error('[Presence] Error in visibility change:', error);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        // Update presence to offline on cleanup
        const updateOffline = async () => {
          try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.access_token) {
              await presenceApi.updateStatus(false);
            }
          } catch (error) {
            console.error('[Presence] Error updating offline status:', error);
          }
        };
        updateOffline();
      };
    }
  }, [currentUser, currentView]);

  const checkAuth = async () => {
    setLoading(true);
    
    try {
      const supabase = createClient();
      
      console.log('[Auth] ========== CHECKING AUTH ==========');
      console.log('[Auth] Project ID:', projectId);
      
      // Get the current session
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Auth] ❌ Session error:', sessionError);
        // Clear corrupted session
        await supabase.auth.signOut();
        localStorage.clear();
        setLoading(false);
        return;
      }
      
      if (!session) {
        console.log('[Auth] ℹ️  No session found - user needs to log in');
        setLoading(false);
        return;
      }
      
      // Validate session has required fields
      if (!session.access_token || !session.user) {
        console.error('[Auth] ❌ Invalid session - missing token or user');
        await supabase.auth.signOut();
        localStorage.clear();
        setLoading(false);
        return;
      }
      
      // Validate token format
      if (!session.access_token.startsWith('eyJ')) {
        console.error('[Auth] ❌ Invalid token format - not a JWT');
        console.error('[Auth] 🚨 This session is corrupted or from a different project');
        await supabase.auth.signOut();
        localStorage.clear();
        setLoading(false);
        return;
      }
      
      // Decode token to verify project ID
      try {
        const parts = session.access_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const expectedIssuer = `https://${projectId}.supabase.co/auth/v1`;
          
          if (payload.iss !== expectedIssuer) {
            console.error('[Auth] 🚨 TOKEN PROJECT MISMATCH!');
            console.error('[Auth] Token issuer:', payload.iss);
            console.error('[Auth] Expected:', expectedIssuer);
            console.error('[Auth] This token is from a DIFFERENT Supabase project!');
            
            await supabase.auth.signOut();
            localStorage.clear();
            
            toast.error('Wrong Project', {
              description: 'Session is from a different project. Please log in to this project.',
              duration: 6000,
            });
            
            setLoading(false);
            return;
          }
          
          console.log('[Auth] ✅ Token project ID verified');
        }
      } catch (decodeError) {
        console.error('[Auth] Error decoding token:', decodeError);
        await supabase.auth.signOut();
        localStorage.clear();
        setLoading(false);
        return;
      }
      
      // Try to refresh the session to ensure it's valid
      console.log('[Auth] Attempting to refresh session...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('[Auth] ❌ Session refresh failed:', refreshError.message);
        console.error('[Auth] Error name:', refreshError.name);
        
        // Check for specific errors indicating invalid/corrupted session
        if (
          refreshError.message.includes('Invalid Refresh Token') ||
          refreshError.message.includes('Auth session missing') ||
          refreshError.message.includes('invalid_grant') ||
          refreshError.message.includes('refresh_token_not_found') ||
          refreshError.name === 'AuthSessionMissingError'
        ) {
          console.error('[Auth] 🚨 CRITICAL: Session is completely invalid or from different project');
          console.error('[Auth] Clearing all session data and forcing fresh login...');
          
          toast.error('Session Invalid', {
            description: 'Your session is invalid. Please log in again.',
            duration: 5000,
          });
          
          await supabase.auth.signOut();
          localStorage.clear();
          setLoading(false);
          setCurrentView('auth');
          return;
        }
        
        // For other refresh errors, log but continue to try
        console.warn('[Auth] ⚠️  Refresh failed but will try to use existing session');
      } else if (refreshData.session) {
        console.log('[Auth] ✅ Session refreshed successfully');
        // Use the refreshed session
        session = refreshData.session;
      }
      
      console.log('[Auth] ✅ Session found:', {
        user_id: session.user?.id,
        email: session.user?.email,
        has_access_token: !!session.access_token,
        token_format_valid: session.access_token?.startsWith('eyJ'),
        expires_at: session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A',
      });
      
      // Check if token is expired and refresh if needed
      if (session.expires_at) {
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        const secondsUntilExpiry = Math.floor((expiresAt - now) / 1000);
        
        console.log(`[Auth] Token expires in ${secondsUntilExpiry} seconds`);
        
        // If expired or expiring within 5 minutes, refresh
        if (secondsUntilExpiry < 300) {
          console.warn('[Auth] ⚠️  Session expiring soon, refreshing...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            console.error('[Auth] ❌ Failed to refresh session:', refreshError);
            console.error('[Auth] User should log out and log back in');
            toast.error('Session Expired', {
              description: 'Please log out and log back in to continue.',
            });
            setLoading(false);
            return;
          } else {
            console.log('[Auth] ✅ Session refreshed successfully');
            // Use the refreshed session
            const { data: { session: newSession } } = await supabase.auth.getSession();
            if (newSession) {
              console.log('[Auth] Using refreshed session');
            }
          }
        }
      }
      
      // Validate the user with the token
      console.log('[Auth] Validating user token...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[Auth] ❌ Failed to validate user:', userError);
        console.error('[Auth] This usually means the token is invalid or expired');
        toast.error('Authentication Error', {
          description: 'Please log out and log back in.',
        });
        setLoading(false);
        return;
      }
      
      if (!user) {
        console.error('[Auth] ❌ No user found despite having session');
        setLoading(false);
        return;
      }
      
      console.log('[Auth] ✅ User validated:', user.email);
      
      // Get the current session token for API calls
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const accessToken = currentSession?.access_token;
      
      if (!accessToken) {
        console.error('[Auth] ❌ No access token available after validation');
        setLoading(false);
        return;
      }
      
      // Final token validation
      if (!accessToken.startsWith('eyJ')) {
        console.error('[Auth] ❌ Invalid token format - not a JWT!');
        console.error('[Auth] Token preview:', accessToken.substring(0, 20));
        setLoading(false);
        return;
      }
      
      console.log('[Auth] ✅ Access token validated (JWT format correct)');
      console.log('[Auth] Token length:', accessToken.length);
      
      // Run diagnostic test if needed (commented out for production)
      // Uncomment this to test token verification
      /*
      console.log('[Auth] Running diagnostic test...');
      try {
        const diagResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-29f6739b/auth/diagnostic`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        const diagData = await diagResponse.json();
        console.log('[Auth] Diagnostic result:', diagData);
      } catch (diagError) {
        console.error('[Auth] Diagnostic failed:', diagError);
      }
      */
      
      // Load user profile from backend
      try {
        console.log('[Auth] 📡 Fetching user profile from backend...');
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-29f6739b/profile/${user.id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        console.log('[Auth] Backend response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            console.log('[Auth] ✅ Successfully loaded user profile from backend');
            setCurrentUser(data.user);
            setCurrentView('home');
            setLoading(false);
            return;
          } else {
            console.warn('[Auth] ⚠️  Response OK but no user data in response');
          }
        } else {
          const errorText = await response.text();
          console.error('[Auth] ❌ Backend returned error, status:', response.status);
          console.error('[Auth] Error response:', errorText);
          
          // If 401, the backend couldn't validate the token
          if (response.status === 401) {
            console.warn('[Auth] ⚠️  Backend authentication failed (401)');
            console.warn('[Auth] This usually means the JWT token is invalid or from a different project');
            
            // Try refreshing the session one time
            console.log('[Auth] Attempting session refresh...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (!refreshError && refreshData.session?.access_token) {
              console.log('[Auth] ✅ Session refreshed, retrying profile fetch...');
              
              // Retry with refreshed token
              const retryResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-29f6739b/profile/${user.id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${refreshData.session.access_token}`,
                  },
                }
              );
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                if (retryData.user) {
                  console.log('[Auth] ✅ Successfully loaded user profile after refresh');
                  setCurrentUser(retryData.user);
                  setCurrentView('home');
                  setLoading(false);
                  return;
                }
              } else {
                console.error('[Auth] ❌ Retry also failed with status:', retryResponse.status);
              }
            } else {
              console.error('[Auth] ❌ Session refresh failed:', refreshError);
            }
            
            // All attempts failed - clear session and show error
            console.error('[Auth] ❌ All authentication attempts failed');
            console.error('[Auth] Clearing corrupted session and showing error...');
            
            await supabase.auth.signOut();
            localStorage.clear();
            
            toast.error('Authentication Error', {
              description: 'Your session could not be validated. Please log in again.',
              duration: 5000,
            });
            
            setLoading(false);
            setCurrentView('auth');
            return;
          }
        }
      } catch (profileError) {
        console.error('[Auth] ❌ Network error fetching profile:', profileError);
        
        // On network error, show a helpful message
        toast.error('Connection Error', {
          description: 'Could not connect to the server. Please check your internet connection.',
          duration: 5000,
        });
      }
      
      // Fallback: create user object from auth metadata
      console.log('[Auth] ⚠️  Using fallback - creating user from auth metadata');
      const fallbackUser = {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'User',
        username: user.email?.split('@')[0] || 'user',
        email: user.email,
        phone_number: user.user_metadata?.phone_number,
        is_online: true,
      };
      
      console.log('[Auth] Created fallback user:', fallbackUser);
      setCurrentUser(fallbackUser);
      setCurrentView('home');
      
    } catch (error) {
      console.error('[Auth] ❌ Unexpected error in checkAuth:', error);
      if (error instanceof Error) {
        console.error('[Auth] Error message:', error.message);
        console.error('[Auth] Error stack:', error.stack);
      }
    } finally {
      console.log('[Auth] ========== AUTH CHECK COMPLETE ==========');
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setCurrentView('auth');
  };

  const handleAuthSuccess = async () => {
    console.log('[App] ========== AUTH SUCCESS HANDLER ==========');
    console.log('[App] Auth success callback triggered');
    
    // Reset auth error count on successful authentication
    authErrorCountRef.current = 0;
    setAuthErrorCount(0);
    localStorage.removeItem('aurora_auth_error_count');
    
    const supabase = createClient();
    
    // Strategy: Keep trying to get and validate a session until it works or we timeout
    const startTime = Date.now();
    const timeout = 10000; // 10 seconds max
    let validSession = null;
    let attemptCount = 0;
    
    while (!validSession && (Date.now() - startTime) < timeout) {
      attemptCount++;
      console.log(`[App] 🔄 Attempt ${attemptCount} to get and validate session...`);
      
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`[App] Session error:`, sessionError);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      if (!session) {
        console.warn(`[App] No session found, waiting 500ms...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      // Validate session has required fields
      if (!session.access_token || !session.user) {
        console.warn(`[App] Session incomplete (no token or user), waiting...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      // Validate token format (must be JWT)
      if (!session.access_token.startsWith('eyJ')) {
        console.error(`[App] ❌ Invalid token format - not a JWT!`);
        console.error(`[App] Token preview:`, session.access_token.substring(0, 50));
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      // Check if token is expired
      if (session.expires_at) {
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        
        if (expiresAt <= now) {
          console.warn(`[App] Token is expired, refreshing...`);
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            console.log(`[App] ✅ Session refreshed`);
            // Continue loop to validate refreshed session
            await new Promise(resolve => setTimeout(resolve, 300));
            continue;
          } else {
            console.error(`[App] Failed to refresh session:`, refreshError);
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
        }
      }
      
      // Try to validate the token by calling getUser()
      console.log(`[App] Validating token with getUser()...`);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error(`[App] Token validation failed:`, userError.message);
        
        // If session is invalid, try refreshing
        console.warn(`[App] Attempting to refresh session...`);
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshData.session) {
          console.log(`[App] ✅ Session refreshed after validation failure`);
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        } else {
          console.error(`[App] Failed to refresh after validation failure:`, refreshError);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
      }
      
      if (!user) {
        console.error(`[App] No user returned from getUser()`);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      // Success! We have a valid session
      validSession = session;
      console.log(`[App] ✅ Valid session obtained after ${attemptCount} attempts`);
      console.log('[App] Session details:', {
        user_id: user.id,
        email: user.email,
        token_length: session.access_token.length,
        expires_at: new Date(session.expires_at! * 1000).toLocaleString(),
      });
    }
    
    if (!validSession) {
      console.error('[App] ❌ Failed to obtain valid session after timeout');
      console.error('[App] User needs to try logging in again');
      toast.error('Session Error', {
        description: 'Could not establish session. Please try logging in again.',
      });
      return;
    }
    
    // Start background token refresh system
    console.log('[App] Starting background token refresh...');
    startBackgroundRefresh();
    
    // Now proceed with loading the app
    console.log('[App] Proceeding to load user data...');
    await checkAuth();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    
    // Clear all localStorage to ensure clean state
    localStorage.clear();
    
    // Stop background token refresh
    stopBackgroundRefresh();
    clearTokenCache();
    
    // Reset state
    setCurrentUser(null);
    setCurrentView('auth');
    setSelectedConversationId(null);
    setActiveCall(null);
    setIncomingCall(null);
    
    console.log('[Logout] User logged out, storage cleared');
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setCurrentView('conversation');
  };

  const handleNewChat = () => {
    setCurrentView('group-create');
  };

  const handleSettings = () => {
    setCurrentView('settings');
  };

  const handleBackToHome = () => {
    setSelectedConversationId(null);
    setCurrentView('home');
  };

  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setCurrentView('conversation');
  };

  const handleUserUpdate = (user: UserType) => {
    setCurrentUser(user);
  };

  const handleViewStory = (userStoriesList: UserStories[], initialIndex: number) => {
    setStoryUsersList(userStoriesList);
    setStoryInitialIndex(initialIndex);
    setCurrentView('story-view');
  };

  const handleCreateStory = () => {
    setCurrentView('story-create');
  };

  const handleStoryViewerClose = async () => {
    setCurrentView('home');
    // Small delay to ensure views are recorded before refreshing
    await new Promise(resolve => setTimeout(resolve, 300));
    // Refresh home screen to update story states
    setHomeScreenKey(prev => prev + 1);
  };

  const handleStoryCreated = () => {
    setCurrentView('home');
    // Refresh home screen to show new story
    setHomeScreenKey(prev => prev + 1);
  };

  const handleViewProfile = (user: UserType, lastSeen?: string) => {
    setProfileViewUser(user);
    setProfileViewLastSeen(lastSeen || '');
    setReturnToConversation(selectedConversationId);
    setCurrentView('profile-view');
  };

  const handleProfileBack = () => {
    if (returnToConversation) {
      setCurrentView('conversation');
    } else {
      setCurrentView('home');
    }
  };

  const handleBlockUser = async (userId: string) => {
    const result = await blockApi.block(userId);
    if (result.success) {
      toast.success('User blocked');
      // Update current user's blocked list
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          blocked_users: [...(currentUser.blocked_users || []), userId]
        });
      }
    } else {
      toast.error('Failed to block user');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    const result = await blockApi.unblock(userId);
    if (result.success) {
      toast.success('User unblocked');
      // Update current user's blocked list
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          blocked_users: (currentUser.blocked_users || []).filter(id => id !== userId)
        });
      }
    } else {
      toast.error('Failed to unblock user');
    }
  };

  const handleDeleteChat = async (conversationId: string) => {
    const result = await conversationsApi.delete(conversationId);
    if (result.success) {
      toast.success('Chat deleted');
      setCurrentView('home');
      setSelectedConversationId(null);
      setReturnToConversation(null);
      // Refresh home screen to update conversation list
      setHomeScreenKey(prev => prev + 1);
    } else {
      toast.error('Failed to delete chat');
    }
  };

  // Call polling is disabled while calling feature is in "Coming Soon" mode
  useEffect(() => {
    // Disabled - calling feature coming soon
  }, [currentUser, currentView, incomingCall, activeCall]);

  const handleInitiateCall = async (recipient: UserType, callType: 'voice' | 'video') => {
    // Show "Coming Soon" message
    toast.info('Coming Soon! 🚀', {
      description: `${callType === 'video' ? 'Video' : 'Voice'} calling feature will be available soon. Stay tuned!`,
    });
  };

  // These handlers are disabled while calling is in "Coming Soon" mode
  const handleGrantPermissions = async () => {
    // Not used - calling is disabled
  };

  const handleCancelPermissions = () => {
    // Not used - calling is disabled
  };

  const handleAcceptCall = async () => {
    // Calling feature is disabled - show coming soon message
    setIncomingCall(null);
    toast.info('Coming Soon! 🚀', {
      description: 'Voice and video calling will be available soon. Stay tuned!',
    });
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    
    console.log('[Call] Rejecting call:', incomingCall.id);
    await callsApi.reject(incomingCall.id);
    setIncomingCall(null);
    toast('Call declined');
  };

  const handleEndCall = async () => {
    console.log('[Call] Ending call');
    
    // End call in backend
    if (activeCall) {
      await callsApi.end(activeCall.id);
    }
    
    // Stop signal polling
    if (signalPollInterval.current) {
      clearInterval(signalPollInterval.current);
      signalPollInterval.current = null;
    }
    
    // Cleanup WebRTC
    if (webrtcManager.current) {
      webrtcManager.current.cleanup();
      webrtcManager.current = null;
    }
    
    // Reset state
    setActiveCall(null);
    setCallRecipient(null);
    setLocalStream(null);
    setRemoteStream(null);
    setCurrentView('home');
    
    toast('Call ended');
  };

  const startSignalPolling = (callId: string) => {
    let lastTimestamp = new Date().toISOString();
    
    signalPollInterval.current = setInterval(async () => {
      const result = await callsApi.getSignals(callId, lastTimestamp);
      if (result.success && result.data?.signals) {
        for (const signal of result.data.signals) {
          handleSignal(signal);
          lastTimestamp = signal.created_at;
        }
      }
    }, 1000);
  };

  const handleSignal = async (signal: any) => {
    if (!webrtcManager.current) return;
    
    console.log('[Call] Received signal:', signal.signal_type);
    
    try {
      switch (signal.signal_type) {
        case 'offer':
          await webrtcManager.current.handleOffer(signal.signal_data);
          // Send answer
          const answer = await webrtcManager.current.createAnswer();
          if (activeCall) {
            await callsApi.signal(activeCall.id, 'answer', answer);
          }
          break;
          
        case 'answer':
          await webrtcManager.current.handleAnswer(signal.signal_data);
          break;
          
        case 'ice-candidate':
          await webrtcManager.current.handleIceCandidate(signal.signal_data);
          break;
      }
    } catch (error) {
      console.error('[Call] Error handling signal:', error);
    }
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-surface to-muted relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Loading content */}
        <div className="relative flex flex-col items-center gap-6 z-10">
          {/* Animated logo */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-2xl shadow-primary/30 flex items-center justify-center animate-pulse">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            {/* Rotating ring */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="w-full h-full rounded-2xl border-4 border-transparent border-t-primary border-r-accent" />
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AuroraLink
            </h2>
            <p className="text-muted-foreground text-sm">Loading your messages...</p>
          </div>

          {/* Loading dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe bg-background text-foreground overflow-x-hidden w-full max-w-full touch-manipulation no-overscroll">
      {currentView === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}

      {currentView === 'auth' && (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      )}

      {currentView === 'home' && currentUser && (
        <HomeScreen
          key={homeScreenKey}
          currentUser={currentUser}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onSettings={handleSettings}
          onLogout={handleLogout}
          onViewStory={handleViewStory}
          onCreateStory={handleCreateStory}
        />
      )}

      {currentView === 'conversation' && currentUser && selectedConversationId && (
        <ConversationScreen
          conversationId={selectedConversationId}
          currentUser={currentUser}
          onBack={handleBackToHome}
          onInitiateCall={handleInitiateCall}
          onViewProfile={handleViewProfile}
          onDeleteChat={() => handleDeleteChat(selectedConversationId)}
        />
      )}

      {currentView === 'group-create' && currentUser && (
        <NewChatScreen
          currentUser={currentUser}
          onBack={handleBackToHome}
          onConversationCreated={handleConversationCreated}
        />
      )}

      {currentView === 'settings' && currentUser && (
        <SettingsScreen
          currentUser={currentUser}
          onBack={handleBackToHome}
          onUserUpdate={handleUserUpdate}
        />
      )}

      {currentView === 'story-view' && currentUser && storyUsersList.length > 0 && (
        <StoryViewerScreen
          userStoriesList={storyUsersList}
          initialUserIndex={storyInitialIndex}
          currentUser={currentUser}
          onClose={handleStoryViewerClose}
          onRefresh={handleStoryViewerClose}
        />
      )}

      {currentView === 'story-create' && currentUser && (
        <StoryComposerScreen
          currentUser={currentUser}
          onClose={handleBackToHome}
          onSuccess={handleStoryCreated}
        />
      )}

      {currentView === 'profile-view' && currentUser && profileViewUser && (
        <ProfileViewScreen
          user={profileViewUser}
          currentUser={currentUser}
          onBack={handleProfileBack}
          onSendMessage={() => {
            if (returnToConversation) {
              setCurrentView('conversation');
            }
          }}
          onInitiateCall={(callType) => handleInitiateCall(profileViewUser, callType)}
          onBlock={() => handleBlockUser(profileViewUser.id)}
          onUnblock={() => handleUnblockUser(profileViewUser.id)}
          onDelete={returnToConversation ? () => handleDeleteChat(returnToConversation) : undefined}
          isBlocked={currentUser.blocked_users?.includes(profileViewUser.id)}
          lastSeen={profileViewLastSeen}
        />
      )}

      {currentView === 'call' && currentUser && activeCall && callRecipient && webrtcManager.current && (
        <CallScreen
          callType={activeCall.call_type}
          recipientUser={callRecipient}
          currentUser={currentUser}
          isInitiator={activeCall.caller_id === currentUser.id}
          onEndCall={handleEndCall}
          onCallConnected={() => console.log('[Call] Connected')}
          onCallFailed={(error) => {
            console.error('[Call] Failed:', error);
            toast.error('Call failed', { description: error });
            handleEndCall();
          }}
          peerConnection={webrtcManager.current.getPeerConnection()!}
          localStream={localStream}
          remoteStream={remoteStream}
        />
      )}

      {/* Incoming call dialog overlay */}
      {incomingCall && incomingCall.caller && (
        <IncomingCallDialog
          caller={incomingCall.caller}
          callType={incomingCall.call_type}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Permission request dialog */}
      {showPermissionDialog && pendingCallType && (
        <PermissionRequestDialog
          open={showPermissionDialog}
          callType={pendingCallType}
          onGrantPermissions={handleGrantPermissions}
          onCancel={handleCancelPermissions}
        />
      )}

      {/* Auth error boundary */}
      <AuthErrorBoundary
        show={showAuthError}
        onClearSession={async () => {
          console.log('[Auth Error] ========== USER REQUESTED SESSION CLEAR ==========');
          
          try {
            // Sign out from Supabase first
            const supabase = createClient();
            await supabase.auth.signOut();
            console.log('[Auth Error] Supabase sign out complete');
          } catch (error) {
            console.error('[Auth Error] Error during sign out:', error);
          }
          
          // Use the comprehensive session clearing utility
          clearAuthSession();
          console.log('[Auth Error] Session cleared');
          
          // Reset auth error counter to prevent loop detection on next load
          authErrorCountRef.current = 0;
          setAuthErrorCount(0);
          localStorage.removeItem('aurora_auth_error_count');
          console.log('[Auth Error] Auth error counter reset');
          
          // Reset auth error state
          setShowAuthError(false);
          console.log('[Auth Error] Auth error state reset');
          
          toast.success('Session Cleared', {
            description: 'Reloading application...',
            duration: 1000,
          });
          
          // Give the user time to see the toast, then reload
          setTimeout(() => {
            console.log('[Auth Error] Reloading page...');
            window.location.reload();
          }, 1000);
        }}
      />

      <Toaster />
    </div>
  );
}
