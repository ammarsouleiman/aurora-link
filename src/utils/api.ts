import { createClient, projectId, publicAnonKey, getAccessToken } from './supabase/direct-api-client';
import { getValidAccessToken } from './token-manager';
import { saveToCache, getFromCache } from './offline-cache';
import type { ApiResponse } from './types';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-29f6739b`;

async function makeRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0,
  silent = false, // Don't log errors for non-critical endpoints
  useCache = true // Use offline cache when server is unavailable
): Promise<ApiResponse<T>> {
  try {
    // CRITICAL: If nuclear clear just happened, block all non-public API calls
    const nuclearClearInProgress = sessionStorage.getItem('nuclear_clear_in_progress');
    const publicEndpoints = ['/auth/signup', '/auth/login', '/health'];
    const isPublicEndpoint = publicEndpoints.some(path => endpoint.includes(path));
    
    if (nuclearClearInProgress === 'true' && !isPublicEndpoint) {
      console.warn(`[API] 🚨 Blocking ${endpoint} - nuclear clear in progress`);
      console.warn('[API] User must log in again before making API calls');
      return {
        success: false,
        error: 'Session cleared. Please log in again.',
        requiresReauth: true,
      };
    }
    
    console.log(`[API] ========== REQUEST START: ${endpoint} ==========`);
    
    // Cacheable GET endpoints
    const cacheableEndpoints = ['/conversations/', '/profile/'];
    const isCacheable = useCache && 
                        (!options.method || options.method === 'GET') && 
                        cacheableEndpoints.some(path => endpoint.includes(path));
    
    console.log(`[API] Endpoint: ${endpoint}`);
    console.log(`[API] Is public: ${isPublicEndpoint}`);
    console.log(`[API] Retry count: ${retryCount}`);
    
    // Wait a bit for session to initialize if not public endpoint
    if (!isPublicEndpoint && retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Get access token using smart token manager
    // For protected endpoints, this will ensure we have a valid token
    const accessToken = await getValidAccessToken();
    
    // CRITICAL: Double-check that we're not using a token after nuclear clear
    if (accessToken && (nuclearClearInProgress === 'true')) {
      console.error('[API] 🚨 CRITICAL: Token exists but nuclear clear is in progress!');
      console.error('[API] This should never happen - clearing token and blocking request');
      console.error('[API] The user must complete login first');
      return {
        success: false,
        error: 'Session is being reset. Please wait for login screen.',
        requiresReauth: true,
      };
    }
    
    // Handle missing token for protected endpoints
    if (!accessToken && !isPublicEndpoint) {
      // First check if we actually have a session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // No session means user is logged out - this is expected
        console.log(`[API] No session available - user may need to log in`);
        return {
          success: false,
          error: 'Authentication required. Please log in.',
          requiresReauth: true,
        };
      }
      
      // We have a session but token manager couldn't get token
      // This might be a temporary issue, retry once
      if (retryCount === 0) {
        console.warn(`[API] ⚠️  No access token on first attempt for: ${endpoint}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 200));
        return makeRequest(endpoint, options, 1, silent, useCache);
      }
      
      console.warn(`[API] ⚠️  No access token available for: ${endpoint} after retry`);
      console.log(`[API] getAccessToken() returned null - session may have expired`);
      return {
        success: false,
        error: 'Authentication token not available. Please try logging in again.',
        requiresReauth: true,
      };
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken || publicAnonKey}`,
      ...options.headers,
    };

    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[API] ${options.method || 'GET'} ${url}`, accessToken ? '(authenticated)' : '(public)');
    
    if (accessToken) {
      console.log(`[API] Using access_token, preview:`, accessToken.substring(0, 30) + '...');
    } else {
      console.log(`[API] Using anon_key (public endpoint)`);
    }

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
      console.log(`[API Response] ${endpoint} - Status: ${response.status} ${response.statusText}`);
    } catch (fetchError) {
      // Log network errors only in development mode or for critical errors
      if (!silent) {
        console.log(`[API] Network connectivity issue on ${endpoint}`);
      }
      
      // Try to use cached data if available
      if (isCacheable) {
        const cacheKey = `${endpoint}`;
        const cached = getFromCache<T>(cacheKey);
        
        if (cached) {
          console.log('[API] 📦 Using cached data');
          return {
            success: true,
            data: cached,
            fromCache: true,
          };
        }
      }
      
      // Return a graceful error without alarming messaging
      return {
        success: false,
        error: 'Unable to complete request',
        details: fetchError instanceof Error ? fetchError.message : String(fetchError),
      };
    }

    // Handle 401 Unauthorized - try to refresh token first
    if (response.status === 401 && !isPublicEndpoint) {
      console.warn(`[API] ⚠️  401 Unauthorized on ${endpoint}`);
      
      // Try to refresh the token first before forcing logout
      if (retryCount === 0) {
        console.log('[API] 🔄 Attempting to refresh session...');
        
        try {
          const supabase = createClient();
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && session?.access_token) {
            console.log('[API] ✅ Session refreshed successfully, retrying request...');
            // Retry the request with the new token
            return makeRequest(endpoint, options, retryCount + 1, silent, useCache);
          } else {
            console.error('[API] ❌ Session refresh failed:', refreshError?.message);
          }
        } catch (refreshErr) {
          console.error('[API] ❌ Error refreshing session:', refreshErr);
        }
      }
      
      // If we've already retried or refresh failed, force logout
      console.error('[API] 🚨 Session is invalid - forcing logout');
      console.error('[API] Please log in again with your credentials');
      
      // Clear everything
      localStorage.clear();
      sessionStorage.clear();
      
      // Force reload to login screen after a brief delay
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 1500);
      
      return {
        success: false,
        error: 'Your session has expired. Please log in again.',
        requiresReauth: true,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      
      if (!silent) {
        console.error(`[API Error] ${endpoint} (${response.status}):`, errorText);
      }
      
      // Check for auth-related error messages in any status code
      if (errorText.includes('Unauthorized') || 
          errorText.includes('Auth session missing') ||
          errorText.includes('Invalid Refresh Token') ||
          errorText.includes('JWT expired')) {
        console.warn('[API] ⚠️  AUTH ERROR DETECTED IN RESPONSE');
        console.warn('[API] Error message:', errorText);
        
        // Try to refresh session first
        if (retryCount === 0) {
          console.log('[API] 🔄 Attempting to refresh session...');
          
          try {
            const supabase = createClient();
            const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (!refreshError && session?.access_token) {
              console.log('[API] ✅ Session refreshed, retrying request...');
              return makeRequest(endpoint, options, retryCount + 1, silent, useCache);
            }
          } catch (refreshErr) {
            console.error('[API] ❌ Error refreshing session:', refreshErr);
          }
        }
        
        // If refresh failed, force logout
        console.error('[API] 🔴 Session cannot be recovered - logging out');
        localStorage.clear();
        sessionStorage.clear();
        
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 1500);
        
        return {
          success: false,
          error: 'Authentication error. Please log in again.',
          requiresReauth: true,
        };
      }
      
      return {
        success: false,
        error: errorText || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    
    // Cache successful GET responses for cacheable endpoints
    if (isCacheable && data) {
      const cacheKey = `${endpoint}`;
      saveToCache(cacheKey, data);
      console.log('[API] 💾 Cached response for offline use');
    }
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    // Log minimal error information
    console.log(`[API] Request error on ${endpoint}`);
    
    return {
      success: false,
      error: 'Request failed',
    };
  }
}

// Auth API
export const authApi = {
  signup: (email: string, password: string, fullName: string, phoneNumber?: string) =>
    makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName, phone_number: phoneNumber }),
    }),
    
  login: async (email: string, password: string) => {
    // Login is handled by Supabase client directly
    return { success: true };
  },
};

// Messages API
export const messagesApi = {
  send: (conversationId: string, body: string, type: string = 'text', replyTo?: string, attachments?: any[]) =>
    makeRequest('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, body, type, reply_to: replyTo, attachments }),
    }),
    
  markAsRead: (messageIds: string[]) =>
    makeRequest('/messages/mark-read', {
      method: 'POST',
      body: JSON.stringify({ message_ids: messageIds }),
    }),
    
  react: (messageId: string, emoji: string) =>
    makeRequest('/messages/react', {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, emoji }),
    }),
    
  deleteForMe: (messageId: string) =>
    makeRequest('/messages/delete-for-me', {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId }),
    }),
    
  deleteForEveryone: (messageId: string) =>
    makeRequest('/messages/delete-for-everyone', {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId }),
    }),
};

// Conversations API
export const conversationsApi = {
  create: (type: 'dm' | 'group', memberIds: string[], title?: string) =>
    makeRequest('/conversations/create', {
      method: 'POST',
      body: JSON.stringify({ type, member_ids: memberIds, title }),
    }),
    
  list: () => makeRequest('/conversations'),
  
  get: (conversationId: string) =>
    makeRequest(`/conversations/${conversationId}`),
    
  delete: (conversationId: string) =>
    makeRequest('/conversations/delete', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    }),
};

// Upload API
export const uploadApi = {
  uploadFile: async (file: File, type: 'avatar' | 'attachment') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const accessToken = await getAccessToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },
};

// Typing indicator API
// These are non-critical endpoints - use silent mode to avoid spam
export const typingApi = {
  start: (conversationId: string) =>
    makeRequest('/typing/start', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    }, 0, true), // silent = true
    
  stop: (conversationId: string) =>
    makeRequest('/typing/stop', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    }, 0, true), // silent = true
};

// Presence API
export const presenceApi = {
  updateStatus: (isOnline: boolean) =>
    makeRequest('/presence/update', {
      method: 'POST',
      body: JSON.stringify({ is_online: isOnline }),
    }),
};

// Profile API
export const profileApi = {
  update: (updates: { full_name?: string; status_message?: string; avatar_url?: string }) =>
    makeRequest('/profile/update', {
      method: 'POST',
      body: JSON.stringify(updates),
    }),
    
  get: (userId: string) =>
    makeRequest(`/profile/${userId}`),
    
  repairCounts: () =>
    makeRequest('/follow/repair-counts', {
      method: 'POST',
    }),
    
  diagnostic: () =>
    makeRequest('/profile/diagnostic'),
};

// Block/Unblock API
export const blockApi = {
  block: (userId: string) =>
    makeRequest('/users/block', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
    
  unblock: (userId: string) =>
    makeRequest('/users/unblock', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
    
  getBlockedUsers: () =>
    makeRequest('/users/blocked'),
};

// User search API
export const userSearchApi = {
  searchByPhone: (phoneNumber: string) =>
    makeRequest('/users/search-by-phone', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    }),
};

// Calls API
export const callsApi = {
  // Initiate a call
  initiate: (recipientId: string, callType: 'voice' | 'video') =>
    makeRequest('/calls/initiate', {
      method: 'POST',
      body: JSON.stringify({ recipient_id: recipientId, call_type: callType }),
    }),
    
  // Send call signal (offer, answer, ICE candidate)
  signal: (callId: string, signalType: 'offer' | 'answer' | 'ice-candidate', signalData: any) =>
    makeRequest('/calls/signal', {
      method: 'POST',
      body: JSON.stringify({ call_id: callId, signal_type: signalType, signal_data: signalData }),
    }),
    
  // Accept a call
  accept: (callId: string) =>
    makeRequest('/calls/accept', {
      method: 'POST',
      body: JSON.stringify({ call_id: callId }),
    }),
    
  // Reject a call
  reject: (callId: string) =>
    makeRequest('/calls/reject', {
      method: 'POST',
      body: JSON.stringify({ call_id: callId }),
    }),
    
  // End a call
  end: (callId: string) =>
    makeRequest('/calls/end', {
      method: 'POST',
      body: JSON.stringify({ call_id: callId }),
    }),
    
  // Get call signals (poll for new signals)
  getSignals: (callId: string, afterTimestamp?: string) =>
    makeRequest(`/calls/${callId}/signals${afterTimestamp ? `?after=${afterTimestamp}` : ''}`),
    
  // Check for incoming calls
  checkIncoming: () =>
    makeRequest('/calls/incoming'),
};

// Helper function to filter expired stories (24 hours)
function filterExpiredStories(stories: any[]): any[] {
  const now = new Date();
  return stories.filter(story => {
    if (!story.expires_at) return true; // Keep stories without expiration
    const expiresAt = new Date(story.expires_at);
    return expiresAt > now; // Only keep stories that haven't expired
  });
}

// Helper function to filter expired story groups
function filterExpiredStoryGroups(storyGroups: any[]): any[] {
  return storyGroups
    .map(group => {
      if (!group.stories) return null;
      
      // Filter expired stories within the group
      const validStories = filterExpiredStories(group.stories);
      
      // If no valid stories remain, exclude the entire group
      if (validStories.length === 0) return null;
      
      return {
        ...group,
        stories: validStories,
      };
    })
    .filter(group => group !== null); // Remove null groups
}

// Stories API (WhatsApp Status)
export const storiesApi = {
  // Get all stories from contacts (grouped by user)
  getAllStories: async () => {
    const result = await makeRequest('/stories');
    
    // Filter expired stories client-side as backup
    if (result.success && result.data?.stories) {
      result.data.stories = filterExpiredStoryGroups(result.data.stories);
    }
    
    return result;
  },
    
  // Get stories from a specific user
  getUserStories: (userId: string) =>
    makeRequest(`/stories/user/${userId}`),
    
  // Create a new story
  create: (type: 'image' | 'video' | 'text', data: {
    media_url?: string;
    text_content?: string;
    background_color?: string;
    caption?: string;
  }) =>
    makeRequest('/stories/create', {
      method: 'POST',
      body: JSON.stringify({ type, ...data }),
    }),
    
  // Mark story as viewed
  view: (storyId: string) =>
    makeRequest('/stories/view', {
      method: 'POST',
      body: JSON.stringify({ story_id: storyId }),
    }),
    
  // Get views for a story (who viewed your story)
  getViews: (storyId: string) =>
    makeRequest(`/stories/${storyId}/views`),
    
  // Reply to a story
  reply: (storyId: string, message: string) =>
    makeRequest('/stories/reply', {
      method: 'POST',
      body: JSON.stringify({ story_id: storyId, message }),
    }),
    
  // Delete a story
  delete: (storyId: string) =>
    makeRequest('/stories/delete', {
      method: 'POST',
      body: JSON.stringify({ story_id: storyId }),
    }),
    
  // Get my stories
  getMyStories: async () => {
    const result = await makeRequest('/stories/my-stories');
    
    // Filter expired stories client-side as backup
    if (result.success && result.data?.stories) {
      result.data.stories = filterExpiredStories(result.data.stories);
    }
    
    return result;
  },
  
  // Manual cleanup of expired stories
  cleanup: () =>
    makeRequest('/stories/cleanup', {
      method: 'POST',
    }),
};

// Account API
export const accountApi = {
  // Delete user account and all associated data
  deleteAccount: () =>
    makeRequest('/account/delete', {
      method: 'POST',
    }),
};

// Feed API (Instagram-style posts)
export const feedApi = {
  // Get feed of posts from followed users
  getFeed: () =>
    makeRequest('/feed'),
    
  // Get explore feed (all posts)
  getExploreFeed: () =>
    makeRequest('/feed/explore'),
    
  // Get posts from a specific user
  getUserPosts: (userId: string) =>
    makeRequest(`/feed/user/${userId}`),
    
  // Get a single post
  getPost: (postId: string) =>
    makeRequest(`/feed/post/${postId}`),
    
  // Get user profile with stats
  getUserProfile: (userId: string) =>
    makeRequest(`/feed/profile/${userId}`),
    
  // Create a new post
  createPost: async (data: {
    file: File;
    type: 'photo' | 'reel';
    caption: string;
    location?: string;
  }) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('type', data.type);
    formData.append('caption', data.caption);
    if (data.location) {
      formData.append('location', data.location);
    }
    
    const accessToken = await getAccessToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}/feed/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }
      
      const responseData = await response.json();
      return { success: true, data: responseData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },
    
  // Delete a post
  deletePost: (postId: string) =>
    makeRequest(`/feed/post/${postId}`, {
      method: 'DELETE',
    }),
    
  // Like a post
  likePost: (postId: string) =>
    makeRequest('/feed/like', {
      method: 'POST',
      body: JSON.stringify({ post_id: postId }),
    }),
    
  // Unlike a post
  unlikePost: (postId: string) =>
    makeRequest('/feed/unlike', {
      method: 'POST',
      body: JSON.stringify({ post_id: postId }),
    }),
    
  // Save a post
  savePost: (postId: string) =>
    makeRequest('/feed/save', {
      method: 'POST',
      body: JSON.stringify({ post_id: postId }),
    }),
    
  // Unsave a post
  unsavePost: (postId: string) =>
    makeRequest('/feed/unsave', {
      method: 'POST',
      body: JSON.stringify({ post_id: postId }),
    }),
    
  // Get comments on a post
  getComments: (postId: string) =>
    makeRequest(`/feed/post/${postId}/comments`),
    
  // Add a comment
  addComment: (postId: string, text: string) =>
    makeRequest('/feed/comment', {
      method: 'POST',
      body: JSON.stringify({ post_id: postId, text }),
    }),
    
  // Delete a comment
  deleteComment: (commentId: string) =>
    makeRequest('/feed/comment/delete', {
      method: 'POST',
      body: JSON.stringify({ comment_id: commentId }),
    }),
    
  // Get reels feed
  getReels: () =>
    makeRequest('/feed/reels'),
    
  // Get notifications
  getNotifications: () =>
    makeRequest('/notifications'),
    
  // Mark notification as read
  markNotificationAsRead: (notificationId: string) =>
    makeRequest(`/notifications/${notificationId}/read`, {
      method: 'POST',
    }),
    
  // Mark all notifications as read
  markAllNotificationsAsRead: () =>
    makeRequest('/notifications/read-all', {
      method: 'POST',
    }),
    
  // Follow user
  followUser: (userId: string) =>
    makeRequest('/follow', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
    
  // Unfollow user
  unfollowUser: (userId: string) =>
    makeRequest('/unfollow', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
};

// Follow API
export const followApi = {
  // Send follow request to a user
  follow: (userId: string) =>
    makeRequest('/follow', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
    
  // Accept follow request
  acceptFollowRequest: (followerId: string) =>
    makeRequest('/follow/accept', {
      method: 'POST',
      body: JSON.stringify({ follower_id: followerId }),
    }),
    
  // Reject follow request
  rejectFollowRequest: (followerId: string) =>
    makeRequest('/follow/reject', {
      method: 'POST',
      body: JSON.stringify({ follower_id: followerId }),
    }),
    
  // Cancel follow request (by requester)
  cancelFollowRequest: (userId: string) =>
    makeRequest('/follow/cancel', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
    
  // Get pending follow requests
  getFollowRequests: () =>
    makeRequest('/follow/requests'),
    
  // Unfollow a user
  unfollow: (userId: string) =>
    makeRequest('/unfollow', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
    
  // Get followers
  getFollowers: (userId: string) =>
    makeRequest(`/followers/${userId}`),
    
  // Get following
  getFollowing: (userId: string) =>
    makeRequest(`/following/${userId}`),
    
  // Get follow status
  getFollowStatus: (userId: string) =>
    makeRequest(`/follow/status/${userId}`),
    
  // Repair follow counts for current user or specified user
  repairCounts: (userId?: string) =>
    makeRequest('/follow/repair-counts', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
    
  // Repair all users' counts (admin function)
  repairAllCounts: () =>
    makeRequest('/follow/repair-all-counts', {
      method: 'POST',
    }),
    
  // Initialize counts for current user if missing
  initCounts: () =>
    makeRequest('/follow/init-counts', {
      method: 'POST',
    }),
};
