# 📱 Offline Mode - Complete Implementation

## Problem Fixed

Users were seeing "Failed to fetch" errors when trying to load conversations while the Supabase Edge Function server was offline or not deployed. This would show error toasts and prevent them from viewing their messages.

Error example:
```
URL being called: https://aavljgcuaajnimeohelq.supabase.co/functions/v1/make-server-29f6739b/conversations/conv_1761982571560_p2vfyfvif
```

## Solution Implemented

### ✅ Offline Caching System

Created a complete offline caching system that stores API responses in localStorage and serves them when the server is unavailable.

## Files Changed

### 1. `/utils/offline-cache.ts` (NEW)

Complete caching utility with:

```typescript
// Save data to cache
saveToCache<T>(key: string, data: T): void

// Get data from cache
getFromCache<T>(key: string, maxAge?: number): T | null

// Clear specific cache entry
clearCache(key: string): void

// Clear all cache
clearAllCache(): void

// Get cache statistics
getCacheStats(): { entries, totalSize, oldestEntry }
```

**Features**:
- ✅ Automatic cache versioning
- ✅ 24-hour default expiry
- ✅ Size tracking
- ✅ Graceful error handling
- ✅ No crashes if localStorage is full

### 2. `/utils/api.ts` (UPDATED)

Enhanced API utility with offline support:

**Added caching for GET requests**:
```typescript
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0,
  silent = false,
  useCache = true  // NEW: Enable offline caching
)
```

**Cacheable endpoints**:
- ✅ `/conversations/:id` - Conversation details and messages
- ✅ `/profile/:userId` - User profiles

**How it works**:

1. **When server is online**:
   - Makes API request normally
   - Saves successful GET responses to cache
   - Returns fresh data

2. **When server is offline**:
   - Network error occurs
   - Checks cache for matching endpoint
   - Returns cached data if available
   - Sets `fromCache: true` flag

**Console output**:
```
[API] 📦 Server offline - using cached data
[API] 💾 Cached response for offline use
```

### 3. `/utils/types.ts` (UPDATED)

Enhanced API response type:

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  fromCache?: boolean;  // NEW: Indicates offline data
}
```

### 4. `/components/screens/ConversationScreen.tsx` (UPDATED)

Enhanced conversation loading with offline support:

**Before**:
```typescript
const result = await conversationsApi.get(conversationId);
if (result.success && result.data) {
  setConversation(result.data.conversation);
  setMessages(result.data.messages || []);
} else {
  toast.error('Failed to load conversation');  // Always shows error
}
```

**After**:
```typescript
const result = await conversationsApi.get(conversationId);
if (result.success && result.data) {
  setConversation(result.data.conversation);
  setMessages(result.data.messages || []);
  
  // Show indicator if using cached data
  if (result.fromCache) {
    toast.info('Using offline data', {
      description: 'Server is not accessible. Showing cached conversation.',
      duration: 3000,
    });
  }
  
  // Mark as read (only if not from cache)
  if (!result.fromCache) {
    // Mark messages as read...
  }
} else {
  // Only show error if it's not a network error
  if (!result.error?.includes('Network error')) {
    toast.error('Failed to load conversation');
  }
}
```

**Polling enhancement**:
- Skips updating messages if using cached data
- Prevents overwriting real messages with stale cache

## How It Works

### First Visit (Server Online) ✅

1. User opens conversation
2. App fetches from server: `/conversations/conv_123`
3. Data is returned successfully
4. **Data is saved to cache**: `localStorage['cache:/conversations/conv_123']`
5. Messages displayed normally

### Second Visit (Server Offline) 🔌

1. User opens conversation
2. App tries to fetch from server
3. **Network error**: "Failed to fetch"
4. App checks cache: `getFromCache('/conversations/conv_123')`
5. **Cache hit!** Data found (less than 24 hours old)
6. Returns cached data with `fromCache: true`
7. **Toast shows**: "Using offline data - Server is not accessible"
8. Messages displayed from cache

### Server Becomes Online Again 🌐

1. User refreshes or navigates
2. Server is accessible
3. Fresh data fetched and cached
4. Normal operation resumes

## User Experience

### When Server is Online ✅
- Normal operation
- All features work
- Data is automatically cached in background
- No indication to user

### When Server Goes Offline ⚠️
- **ServerStatusBanner** shows at top: "Unable to connect to server"
- Conversations load from cache (if visited before)
- Toast shows: "Using offline data"
- User can still:
  - ✅ View cached conversations
  - ✅ Read cached messages
  - ✅ See cached profiles
  - ❌ Send new messages (requires server)
  - ❌ View new conversations (not cached yet)

### Visual Indicators

**For cached data**:
```
ℹ️ Using offline data
Server is not accessible. Showing cached conversation.
```

**For server offline**:
```
⚠️ Unable to connect to server
The backend server is not accessible. Please check your connection or try again later.
[Retry Button]
```

## Cache Management

### Automatic Management
- ✅ 24-hour expiry (configurable per request)
- ✅ Version checking (old versions auto-deleted)
- ✅ Automatic cleanup on expiry

### Manual Management

```javascript
// Check cache stats
import { getCacheStats } from './utils/offline-cache';
console.log(getCacheStats());
// {
//   entries: 5,
//   totalSize: 45231,
//   oldestEntry: 1730123456789
// }

// Clear specific cache
import { clearCache } from './utils/offline-cache';
clearCache('/conversations/conv_123');

// Clear all cache
import { clearAllCache } from './utils/offline-cache';
clearAllCache();
```

## Benefits

### For Users 👥
- ✅ Can view previously loaded conversations offline
- ✅ Clear visual feedback about offline status
- ✅ No confusing error messages
- ✅ Graceful degradation of features

### For Developers 🛠️
- ✅ Simple API: just works automatically
- ✅ Opt-in per endpoint
- ✅ Debug-friendly console logs
- ✅ Easy to disable (`useCache: false`)

### For Reliability 🔒
- ✅ App doesn't crash when server is down
- ✅ Users can still access their data
- ✅ Reduces server load (cached data)
- ✅ Better UX during server maintenance

## Technical Details

### Cache Storage Format

```typescript
localStorage['cache:/conversations/conv_123'] = JSON.stringify({
  data: { /* API response */ },
  timestamp: 1730123456789,
  version: 'v1'
});
```

### Cache Key Format
- Pattern: `cache:{endpoint}`
- Examples:
  - `cache:/conversations/conv_1761982571560_p2vfyfvif`
  - `cache:/profile/user_abc123`

### Cache Size Limits
- LocalStorage limit: ~5-10 MB per domain
- Each conversation: ~10-50 KB
- Estimated capacity: ~100-500 conversations

### Cache Expiry
- Default: 24 hours
- Configurable per request
- Automatic cleanup on access

## Testing

### Test Offline Mode

1. **Simulate server offline**:
   ```javascript
   // In browser console
   localStorage.setItem('force_offline', 'true');
   window.location.reload();
   ```

2. **View cached conversations**:
   - Visit a conversation while online
   - Wait for it to load
   - Disconnect internet
   - Reload page
   - Conversation should load from cache

3. **Check cache contents**:
   ```javascript
   // View all cache keys
   Object.keys(localStorage).filter(k => k.startsWith('cache:'));
   
   // View cache stats
   getCacheStats();
   ```

4. **Clear cache**:
   ```javascript
   clearAllCache();
   ```

### Test Cache Expiry

```javascript
// Set a cache entry with short expiry
import { saveToCache, getFromCache } from './utils/offline-cache';

saveToCache('test', { foo: 'bar' });
getFromCache('test', 5000); // 5 second expiry

// Wait 6 seconds...
getFromCache('test', 5000); // Returns null
```

## Limitations

### What Works Offline ✅
- Viewing previously loaded conversations
- Reading cached messages
- Viewing cached user profiles
- Browsing cached data

### What Doesn't Work Offline ❌
- Sending new messages
- Creating new conversations
- Updating profile
- Loading new (not-yet-cached) data
- Real-time updates
- Voice/video calls

## Future Enhancements

Potential improvements:
- 🔮 Service Worker for true offline PWA
- 🔮 IndexedDB for larger cache capacity
- 🔮 Queue messages for sending when back online
- 🔮 Background sync when connection returns
- 🔮 Smarter cache eviction (LRU)
- 🔮 Compression for cache efficiency

## Debugging

### Console Logs to Watch

**Successful cache save**:
```
[API] GET https://...supabase.co/.../conversations/conv_123 (authenticated)
[API Response] /conversations/conv_123 - Status: 200 OK
[API] 💾 Cached response for offline use
```

**Successful cache hit**:
```
[API] ❌ Network error during fetch: TypeError: Failed to fetch
[Offline Cache] ✅ Using cached data for: /conversations/conv_123 (age: 45s)
[API] 📦 Server offline - using cached data
```

**Cache miss**:
```
[API] ❌ Network error during fetch: TypeError: Failed to fetch
[API] No cached data available for offline use
```

### Common Issues

**Issue**: "No cached data available"
- **Cause**: User hasn't visited that conversation while online
- **Fix**: Visit conversation while server is online first

**Issue**: Cache not working
- **Cause**: LocalStorage is full or disabled
- **Fix**: Clear cache with `clearAllCache()`

**Issue**: Stale data shown
- **Cause**: Cache hasn't expired yet (24 hours)
- **Fix**: Clear specific cache or wait for expiry

## Summary

The app now has a complete offline mode that:
- ✅ **Automatically caches** conversation data when online
- ✅ **Serves cached data** when server is offline
- ✅ **Shows clear indicators** about offline status
- ✅ **Gracefully degrades** features when offline
- ✅ **Provides helpful feedback** to users

Users can now view their conversations even when the server is down or not deployed, providing a much better experience!
