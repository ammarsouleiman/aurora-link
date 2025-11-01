import { projectId, publicAnonKey } from './supabase/info';
import { createClient } from './supabase/client';
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
    console.log(`[API] ========== REQUEST START: ${endpoint} ==========`);
    
    // Public endpoints that don't require authentication
    const publicEndpoints = ['/auth/signup', '/auth/login', '/health'];
    const isPublicEndpoint = publicEndpoints.some(path => endpoint.includes(path));
    
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
    
    // Handle missing token for protected endpoints
    if (!accessToken && !isPublicEndpoint) {
      console.warn(`[API] ⚠️  No access token available for: ${endpoint}`);
      console.log(`[API] getAccessToken() returned null - session may have expired`);
      return {
        success: false,
        error: 'Authentication token not available. Please try again.',
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

    // Handle 401 Unauthorized - retry once with token refresh
    if (response.status === 401 && retryCount < 1 && !isPublicEndpoint) {
      console.warn(`[API] Got 401, will retry with fresh token...`);
      
      // Wait a moment and retry (token manager will handle refresh)
      await new Promise(resolve => setTimeout(resolve, 300));
      return makeRequest(endpoint, options, retryCount + 1, silent, useCache);
    }

    if (!response.ok) {
      const errorText = await response.text();
      
      if (!silent) {
        console.error(`[API Error] ${endpoint} (${response.status}):`, errorText);
      }
      
      // Special handling for 401 errors
      if (response.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please log in again.',
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
