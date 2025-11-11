# Build 9.1.2 - Missing API Routes Fix

## Issues Fixed
Fixed 404 "Route not found" errors for two Instagram feed API endpoints:
1. `GET /feed/post/:postId/comments` - Returns comments for a specific post
2. `GET /feed/profile/:userId` - Returns user profile with stats (followers, following, posts count)

## Root Cause
The frontend code in `PostDetailScreen.tsx` and the API client in `utils/api.ts` were calling these routes, but they were not implemented on the server side in `/supabase/functions/server/index.tsx`.

### Frontend Calls (from api.ts)
- Line 671: `getComments: (postId: string) => makeRequest(\`/feed/post/${postId}/comments\`)`
- Line 591: `getUserProfile: (userId: string) => makeRequest(\`/feed/profile/${userId}\`)`

### Missing Server Routes
The server had:
- ✅ `GET /feed/post/:postId` - Returns post WITH comments
- ❌ `GET /feed/post/:postId/comments` - Missing (just comments)
- ✅ `GET /profile/:userId` - Returns profile with stats  
- ❌ `GET /feed/profile/:userId` - Missing (same as above but different path)

## Changes Made

### 1. Added GET /feed/post/:postId/comments
**Location:** `/supabase/functions/server/index.tsx` (after line 2623)

This route:
- Retrieves all comments for a specific post from KV store using prefix `comment:${postId}:`
- Enriches each comment with user data (full_name, avatar_url, etc.)
- Sorts comments by creation time (oldest first)
- Returns `{ comments: Comment[] }`

**Implementation:**
```typescript
app.get('/make-server-29f6739b/feed/post/:postId/comments', async (c) => {
  try {
    const postId = c.req.param('postId');
    const currentUser = await verifyUser(c.req.header('Authorization'));
    if (!currentUser) return c.json({ error: 'Unauthorized' }, 401);
    
    // Get comments
    const comments = await safeKvGetByPrefix(`comment:${postId}:`);
    
    // Add user data to comments
    for (const comment of comments) {
      const commentUser = await safeKvGet(`user:${comment.user_id}`);
      comment.user = commentUser;
    }
    
    // Sort comments by created_at asc (oldest first)
    comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    return c.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});
```

### 2. Added GET /feed/profile/:userId
**Location:** `/supabase/functions/server/index.tsx` (after line 3115)

This route:
- Retrieves user profile from KV store
- Calculates stats: posts count, followers count, following count
- Checks if current user follows/is followed by the profile user
- Returns enriched profile with all stats and relationship status

**Implementation:**
```typescript
app.get('/make-server-29f6739b/feed/profile/:userId', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('Authorization'));
    if (!currentUser) return c.json({ error: 'Unauthorized' }, 401);
    
    const userId = c.req.param('userId');
    
    // Get user profile
    const user = await safeKvGet(`user:${userId}`);
    if (!user) return c.json({ error: 'User not found' }, 404);
    
    // Get stats
    const posts = await safeKvGetByPrefix(`post:${userId}:`);
    const followers = await safeKvGet(`followers:${userId}`, []);
    const following = await safeKvGet(`following:${userId}`, []);
    
    // Check follow status
    const currentUserFollowing = await safeKvGet(`following:${currentUser.id}`, []);
    const currentUserFollowers = await safeKvGet(`followers:${currentUser.id}`, []);
    
    const profile = {
      ...user,
      posts_count: posts.length,
      followers_count: followers.length,
      following_count: following.length,
      is_following: currentUserFollowing.includes(userId),
      is_followed_by: currentUserFollowers.includes(userId),
    };
    
    return c.json({ user: profile });
  } catch (error) {
    console.error('Get feed profile error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});
```

## Error Logs Before Fix
```
[API Error] /feed/post/post_1762774195248_flybufuxy/comments (404): {"error":"Route not found"}
[API Error] /feed/profile/5ed11d99-b8ce-4f40-8b06-aa48a78e6a69 (404): {"error":"Route not found"}
404 - Route not found: GET http://aavljgcuaajnimeohelq.supabase.co/make-server-29f6739b/feed/post/post_1762774195248_flybufuxy/comments
404 - Route not found: GET http://aavljgcuaajnimeohelq.supabase.co/make-server-29f6739b/feed/profile/5ed11d99-b8ce-4f40-8b06-aa48a78e6a69
```

## Testing Checklist
- [x] Server routes added correctly
- [x] Routes return correct data structure matching frontend expectations
- [x] Authentication required for both routes
- [x] Error handling implemented
- [x] Comments sorted by creation time
- [x] User data enriched for comments
- [x] Profile stats calculated correctly
- [x] Follow status calculated for profile

## Impact
- Post detail screen can now load comments successfully
- Profile views can now load user stats and follow status
- No more 404 errors in console for these endpoints

## Files Modified
- `/supabase/functions/server/index.tsx` - Added 2 new GET routes

## Version
Build 9.1.2 - November 10, 2025
