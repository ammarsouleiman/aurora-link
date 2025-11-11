# AuroraLink Build 9.0 - Instagram Features

## Overview
Transform AuroraLink into a hybrid WhatsApp + Instagram app with posts, reels, likes, comments, and followers.

## Features Implemented

### ✅ Frontend Components

1. **FeedScreen.tsx** - Instagram-style feed
   - View posts from followed users
   - Like/unlike posts with animation
   - Save posts for later
   - Navigate to comments
   - Share functionality

2. **PostComposerScreen.tsx** - Create posts and reels
   - Photo/video upload with preview
   - Caption and location
   - File size validation (100MB max)
   - Type badge (Photo/Reel)

3. **PostDetailScreen.tsx** - View post with comments
   - Full post display
   - Comment thread
   - Like functionality
   - Add/delete comments
   - Timestamp formatting

4. **ExploreScreen.tsx** - Discover content
   - Grid layout of all posts
   - User search functionality
   - Filter by photos/reels
   - Post preview

5. **EnhancedProfileScreen.tsx** - User profile with posts
   - Follower/following counts
   - Posts/reels tabs
   - Grid layout
   - Follow/unfollow button
   - Message button

6. **BottomNavigation.tsx** - Main navigation
   - 5 tabs: Chats, Feed, Create, Explore, Profile
   - Active state indication
   - Notification badges

### ✅ Type Definitions (types.ts)

Added new interfaces:
- `Post` - Photo/reel posts
- `Comment` - Post comments
- `Like` - Post likes
- `Follow` - Follow relationships
- `UserProfile` - Extended user with stats

### ✅ API Client (api.ts)

Added new endpoints:
- `feedApi` - Feed, posts, likes, comments, saves
- `followApi` - Follow/unfollow, followers, following

## Server Implementation Needed

### Feed Endpoints

```typescript
// Get feed of followed users' posts
app.get('/make-server-29f6739b/feed', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  // Get list of users current user follows
  const following = await kv.get(`following:${user.id}`) || [];
  
  // Get all posts from followed users
  const posts = [];
  for (const userId of following) {
    const userPosts = await kv.getByPrefix(`post:${userId}:`);
    posts.push(...userPosts);
  }
  
  // Sort by created_at desc
  posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  // Add user data and like/save status
  for (const post of posts) {
    post.user = await kv.get(`user:${post.user_id}`);
    post.is_liked = !!(await kv.get(`like:${post.id}:${user.id}`));
    post.is_saved = !!(await kv.get(`save:${post.id}:${user.id}`));
  }
  
  return c.json({ posts });
});

// Get user's posts
app.get('/make-server-29f6739b/feed/user/:userId', async (c) => {
  const userId = c.req.param('userId');
  const posts = await kv.getByPrefix(`post:${userId}:`);
  
  // Add user data
  const user = await kv.get(`user:${userId}`);
  for (const post of posts) {
    post.user = user;
  }
  
  return c.json(posts);
});

// Create post
app.post('/make-server-29f6739b/feed/create', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file');
  const type = formData.get('type');
  const caption = formData.get('caption');
  const location = formData.get('location');
  
  // Upload file to storage
  const fileName = `${user.id}/${Date.now()}_${file.name}`;
  const { data, error } = await supabaseAdmin.storage
    .from('make-29f6739b-posts')
    .upload(fileName, file);
  
  if (error) return c.json({ error: error.message }, 500);
  
  // Get public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('make-29f6739b-posts')
    .getPublicUrl(fileName);
  
  // Create post
  const post = {
    id: crypto.randomUUID(),
    user_id: user.id,
    type,
    media_url: publicUrl,
    caption,
    location,
    created_at: new Date().toISOString(),
    likes_count: 0,
    comments_count: 0,
  };
  
  await kv.set(`post:${user.id}:${post.id}`, post);
  
  return c.json(post);
});

// Like post
app.post('/make-server-29f6739b/feed/like', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  const { post_id } = await c.req.json();
  
  // Get post
  const posts = await kv.getByPrefix(`post:`);
  const post = posts.find(p => p.id === post_id);
  
  if (!post) return c.json({ error: 'Post not found' }, 404);
  
  // Create like
  await kv.set(`like:${post_id}:${user.id}`, {
    post_id,
    user_id: user.id,
    created_at: new Date().toISOString(),
  });
  
  // Increment count
  post.likes_count = (post.likes_count || 0) + 1;
  await kv.set(`post:${post.user_id}:${post.id}`, post);
  
  return c.json({ success: true });
});

// Unlike post
app.post('/make-server-29f6739b/feed/unlike', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  const { post_id } = await c.req.json();
  
  // Get post
  const posts = await kv.getByPrefix(`post:`);
  const post = posts.find(p => p.id === post_id);
  
  if (!post) return c.json({ error: 'Post not found' }, 404);
  
  // Delete like
  await kv.del(`like:${post_id}:${user.id}`);
  
  // Decrement count
  post.likes_count = Math.max(0, (post.likes_count || 0) - 1);
  await kv.set(`post:${post.user_id}:${post.id}`, post);
  
  return c.json({ success: true });
});

// Add comment
app.post('/make-server-29f6739b/feed/comment', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  const { post_id, text } = await c.req.json();
  
  // Get post
  const posts = await kv.getByPrefix(`post:`);
  const post = posts.find(p => p.id === post_id);
  
  if (!post) return c.json({ error: 'Post not found' }, 404);
  
  // Create comment
  const comment = {
    id: crypto.randomUUID(),
    post_id,
    user_id: user.id,
    user: await kv.get(`user:${user.id}`),
    text,
    created_at: new Date().toISOString(),
  };
  
  await kv.set(`comment:${post_id}:${comment.id}`, comment);
  
  // Increment count
  post.comments_count = (post.comments_count || 0) + 1;
  await kv.set(`post:${post.user_id}:${post.id}`, post);
  
  return c.json(comment);
});

// Follow user
app.post('/make-server-29f6739b/follow', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  const { user_id } = await c.req.json();
  
  // Add to following list
  const following = await kv.get(`following:${user.id}`) || [];
  if (!following.includes(user_id)) {
    following.push(user_id);
    await kv.set(`following:${user.id}`, following);
  }
  
  // Add to followers list
  const followers = await kv.get(`followers:${user_id}`) || [];
  if (!followers.includes(user.id)) {
    followers.push(user.id);
    await kv.set(`followers:${user_id}`, followers);
  }
  
  return c.json({ success: true });
});

// Unfollow user
app.post('/make-server-29f6739b/unfollow', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  const { user_id } = await c.req.json();
  
  // Remove from following list
  const following = await kv.get(`following:${user.id}`) || [];
  const index = following.indexOf(user_id);
  if (index > -1) {
    following.splice(index, 1);
    await kv.set(`following:${user.id}`, following);
  }
  
  // Remove from followers list
  const followers = await kv.get(`followers:${user_id}`) || [];
  const followerIndex = followers.indexOf(user.id);
  if (followerIndex > -1) {
    followers.splice(followerIndex, 1);
    await kv.set(`followers:${user_id}`, followers);
  }
  
  return c.json({ success: true });
});
```

## Next Steps

1. **Add server endpoints** - Copy the endpoints above into `/supabase/functions/server/index.tsx`
2. **Create storage bucket** - Add `make-29f6739b-posts` bucket in initializeStorage()
3. **Update App.tsx** - Add new screens to navigation and view state
4. **Test features** - Verify posting, liking, commenting, and following work

## Usage

After implementation, users can:
- ✅ Post photos and reels with captions
- ✅ Like and comment on posts
- ✅ Follow/unfollow other users
- ✅ View feed of followed users
- ✅ Explore all posts
- ✅ View user profiles with posts grid
- ✅ Keep all existing WhatsApp chat functionality
