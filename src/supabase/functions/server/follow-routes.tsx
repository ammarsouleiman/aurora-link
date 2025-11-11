// Follow system routes for AuroraLink
// Handles follow requests with accept/reject, followers/following lists

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export function addFollowRoutes(app: Hono, verifyUser: Function) {
  
  // Send follow request to a user
  app.post('/make-server-29f6739b/follow', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { user_id } = await c.req.json();
      
      if (!user_id) {
        return c.json({ error: 'User ID is required' }, 400);
      }

      if (user_id === user.id) {
        return c.json({ error: 'Cannot follow yourself' }, 400);
      }

      // Check if already following (accepted)
      const existingFollow = await kv.get(`follow:${user.id}:${user_id}`);
      if (existingFollow && existingFollow.status === 'accepted') {
        return c.json({ error: 'Already following this user' }, 400);
      }

      // Check if there's already a pending request
      const existingRequest = await kv.get(`follow_request:${user.id}:${user_id}`);
      if (existingRequest && existingRequest.status === 'pending') {
        return c.json({ error: 'Follow request already sent' }, 400);
      }

      // Create follow request (pending approval)
      const requestId = `freq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const followRequest = {
        id: requestId,
        follower_id: user.id,
        following_id: user_id,
        status: 'pending', // pending, accepted, rejected
        created_at: new Date().toISOString(),
      };

      await kv.set(`follow_request:${user.id}:${user_id}`, followRequest);

      // Create notification for the target user
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const notification = {
        id: notificationId,
        user_id: user_id, // recipient
        type: 'follow_request',
        actor_id: user.id,
        request_id: requestId,
        created_at: new Date().toISOString(),
        read: false,
      };
      await kv.set(`notification:${user_id}:${notificationId}`, notification);

      console.log(`📨 User ${user.id} sent follow request to ${user_id}`);

      return c.json({ success: true, request: followRequest, status: 'pending' });
    } catch (error) {
      console.error('Follow request error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // Accept follow request
  app.post('/make-server-29f6739b/follow/accept', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { follower_id } = await c.req.json();
      
      if (!follower_id) {
        return c.json({ error: 'Follower ID is required' }, 400);
      }

      // Get the follow request
      const followRequest = await kv.get(`follow_request:${follower_id}:${user.id}`);
      if (!followRequest) {
        return c.json({ error: 'Follow request not found' }, 404);
      }

      // If already accepted, check if follow relationship exists
      if (followRequest.status === 'accepted') {
        const existingFollow = await kv.get(`follow:${follower_id}:${user.id}`);
        if (existingFollow) {
          console.log(`ℹ️ Follow request already accepted: ${follower_id} -> ${user.id}`);
          
          // Get updated profiles with current counts
          const followerProfile = await kv.get(`user:${follower_id}`) || {};
          const followingProfile = await kv.get(`user:${user.id}`) || {};
          
          // Check if users follow each other (friends)
          const followsBack = await kv.get(`follow:${user.id}:${follower_id}`);
          const areFriends = !!(followsBack && followsBack.status === 'accepted');
          
          return c.json({ 
            success: true, 
            follow: existingFollow, 
            already_processed: true,
            follower_profile: {
              id: followerProfile.id,
              following_count: followerProfile.following_count || 0,
              followers_count: followerProfile.followers_count || 0,
            },
            following_profile: {
              id: followingProfile.id,
              following_count: followingProfile.following_count || 0,
              followers_count: followingProfile.followers_count || 0,
            },
            are_friends: areFriends,
          });
        }
      }

      if (followRequest.status !== 'pending') {
        return c.json({ error: 'Request already processed', status: followRequest.status }, 400);
      }

      // Update request status
      followRequest.status = 'accepted';
      followRequest.accepted_at = new Date().toISOString();
      await kv.set(`follow_request:${follower_id}:${user.id}`, followRequest);

      // Create the actual follow relationship
      const follow = {
        id: followRequest.id,
        follower_id: follower_id,
        following_id: user.id,
        status: 'accepted',
        created_at: new Date().toISOString(),
      };
      await kv.set(`follow:${follower_id}:${user.id}`, follow);

      // Update follower/following counts
      // follower_id is following user.id
      // So: follower gets +1 following_count, user gets +1 followers_count
      const followerProfile = await kv.get(`user:${follower_id}`) || {};
      const followingProfile = await kv.get(`user:${user.id}`) || {};

      followerProfile.following_count = (followerProfile.following_count || 0) + 1;
      followingProfile.followers_count = (followingProfile.followers_count || 0) + 1;

      await kv.set(`user:${follower_id}`, followerProfile);
      await kv.set(`user:${user.id}`, followingProfile);

      // Check if users now follow each other (friends)
      const followsBack = await kv.get(`follow:${user.id}:${follower_id}`);
      const areFriends = !!(followsBack && followsBack.status === 'accepted');

      // Delete the original follow_request notification from the current user's notifications
      const allNotifications = await kv.getByPrefix(`notification:${user.id}:`);
      for (const notif of allNotifications) {
        if (notif.type === 'follow_request' && notif.actor_id === follower_id) {
          await kv.del(`notification:${user.id}:${notif.id}`);
          console.log(`🗑️ Deleted follow_request notification ${notif.id} for user ${user.id}`);
        }
      }

      // Create notification for the follower that their request was accepted
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const notification = {
        id: notificationId,
        user_id: follower_id, // recipient
        type: 'follow_accepted',
        actor_id: user.id,
        created_at: new Date().toISOString(),
        read: false,
      };
      await kv.set(`notification:${follower_id}:${notificationId}`, notification);

      console.log(`✅ User ${user.id} accepted follow request from ${follower_id}`);
      console.log(`   ${follower_id} following_count: ${followerProfile.following_count}`);
      console.log(`   ${user.id} followers_count: ${followingProfile.followers_count}`);
      console.log(`   Are friends: ${areFriends}`);

      return c.json({ 
        success: true, 
        follow,
        follower_profile: {
          id: followerProfile.id,
          following_count: followerProfile.following_count,
          followers_count: followerProfile.followers_count,
        },
        following_profile: {
          id: followingProfile.id,
          following_count: followingProfile.following_count,
          followers_count: followingProfile.followers_count,
        },
        are_friends: areFriends,
      });
    } catch (error) {
      console.error('Accept follow error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // Reject follow request
  app.post('/make-server-29f6739b/follow/reject', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { follower_id } = await c.req.json();
      
      if (!follower_id) {
        return c.json({ error: 'Follower ID is required' }, 400);
      }

      // Get the follow request
      const followRequest = await kv.get(`follow_request:${follower_id}:${user.id}`);
      if (!followRequest) {
        return c.json({ error: 'Follow request not found' }, 404);
      }

      // If already rejected, just return success
      if (followRequest.status === 'rejected') {
        console.log(`ℹ️ Follow request already rejected: ${follower_id} -> ${user.id}`);
        return c.json({ success: true, already_processed: true });
      }

      if (followRequest.status !== 'pending' && followRequest.status !== 'accepted') {
        return c.json({ error: 'Request already processed', status: followRequest.status }, 400);
      }

      // If the request was somehow accepted but now being rejected, clean up the follow relationship
      if (followRequest.status === 'accepted') {
        const existingFollow = await kv.get(`follow:${follower_id}:${user.id}`);
        if (existingFollow) {
          // Remove the follow relationship
          await kv.del(`follow:${follower_id}:${user.id}`);
          
          // Decrement counts
          const followerProfile = await kv.get(`user:${follower_id}`) || {};
          const followingProfile = await kv.get(`user:${user.id}`) || {};
          
          followerProfile.following_count = Math.max(0, (followerProfile.following_count || 0) - 1);
          followingProfile.followers_count = Math.max(0, (followingProfile.followers_count || 0) - 1);
          
          await kv.set(`user:${follower_id}`, followerProfile);
          await kv.set(`user:${user.id}`, followingProfile);
        }
      }

      // Update request status
      followRequest.status = 'rejected';
      followRequest.rejected_at = new Date().toISOString();
      await kv.set(`follow_request:${follower_id}:${user.id}`, followRequest);

      // Delete the request notification
      const allNotifications = await kv.getByPrefix(`notification:${user.id}:`);
      for (const notif of allNotifications) {
        if (notif.type === 'follow_request' && notif.actor_id === follower_id) {
          await kv.del(`notification:${user.id}:${notif.id}`);
        }
      }

      console.log(`❌ User ${user.id} rejected follow request from ${follower_id}`);

      return c.json({ success: true });
    } catch (error) {
      console.error('Reject follow error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // Cancel follow request (by the requester)
  app.post('/make-server-29f6739b/follow/cancel', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { user_id } = await c.req.json();
      
      if (!user_id) {
        return c.json({ error: 'User ID is required' }, 400);
      }

      // Delete the follow request
      await kv.del(`follow_request:${user.id}:${user_id}`);

      console.log(`🚫 User ${user.id} cancelled follow request to ${user_id}`);

      return c.json({ success: true });
    } catch (error) {
      console.error('Cancel follow request error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // Get pending follow requests for current user
  app.get('/make-server-29f6739b/follow/requests', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get all follow requests where current user is the recipient
      const allRequests = await kv.getByPrefix('follow_request:');
      const pendingRequests = [];

      for (const request of allRequests) {
        if (request.following_id === user.id && request.status === 'pending') {
          // Get requester profile
          const requesterProfile = await kv.get(`user:${request.follower_id}`);
          if (requesterProfile) {
            pendingRequests.push({
              id: request.id,
              user: {
                id: requesterProfile.id,
                full_name: requesterProfile.full_name,
                username: requesterProfile.username || requesterProfile.email?.split('@')[0] || 'user',
                avatar_url: requesterProfile.avatar_url,
              },
              created_at: request.created_at,
            });
          }
        }
      }

      // Sort by creation date (newest first)
      pendingRequests.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log(`📨 User ${user.id} has ${pendingRequests.length} pending requests`);

      return c.json({ requests: pendingRequests });
    } catch (error) {
      console.error('Get follow requests error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // Unfollow a user
  app.post('/make-server-29f6739b/unfollow', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { user_id } = await c.req.json();
      
      if (!user_id) {
        return c.json({ error: 'User ID is required' }, 400);
      }

      // Check if following
      const existingFollow = await kv.get(`follow:${user.id}:${user_id}`);
      if (!existingFollow) {
        return c.json({ error: 'Not following this user' }, 400);
      }

      // Remove follow relationship
      await kv.del(`follow:${user.id}:${user_id}`);
      
      // Also remove the follow request
      await kv.del(`follow_request:${user.id}:${user_id}`);

      // Update follower/following counts
      const followerProfile = await kv.get(`user:${user.id}`) || {};
      const followingProfile = await kv.get(`user:${user_id}`) || {};

      followerProfile.following_count = Math.max(0, (followerProfile.following_count || 0) - 1);
      followingProfile.followers_count = Math.max(0, (followingProfile.followers_count || 0) - 1);

      await kv.set(`user:${user.id}`, followerProfile);
      await kv.set(`user:${user_id}`, followingProfile);

      console.log(`✅ User ${user.id} unfollowed ${user_id}`);
      console.log(`   ${user.id} following_count: ${followerProfile.following_count}`);
      console.log(`   ${user_id} followers_count: ${followingProfile.followers_count}`);

      return c.json({ 
        success: true,
        follower_profile: {
          id: followerProfile.id,
          following_count: followerProfile.following_count,
          followers_count: followerProfile.followers_count,
        },
        following_profile: {
          id: followingProfile.id,
          following_count: followingProfile.following_count,
          followers_count: followingProfile.followers_count,
        },
      });
    } catch (error) {
      console.error('Unfollow user error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // Get followers list (only accepted follows)
  app.get('/make-server-29f6739b/followers/:userId', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const userId = c.req.param('userId');
      
      // Get all accepted follow relationships where this user is being followed
      const allFollows = await kv.getByPrefix('follow:');
      const followers = [];

      for (const follow of allFollows) {
        if (follow.following_id === userId && follow.status === 'accepted') {
          // This is an accepted follower
          const followerProfile = await kv.get(`user:${follow.follower_id}`);
          if (followerProfile) {
            // Check if current user is following this follower
            const isFollowing = await kv.get(`follow:${user.id}:${follow.follower_id}`);
            
            // Check if there's a pending request from current user
            const pendingRequest = await kv.get(`follow_request:${user.id}:${follow.follower_id}`);
            const hasPendingRequest = pendingRequest && pendingRequest.status === 'pending';
            
            followers.push({
              id: followerProfile.id,
              full_name: followerProfile.full_name,
              username: followerProfile.username || followerProfile.email?.split('@')[0] || 'user',
              avatar_url: followerProfile.avatar_url,
              is_following: !!(isFollowing && isFollowing.status === 'accepted'),
              follow_status: hasPendingRequest ? 'pending' : (isFollowing ? 'following' : 'not_following'),
            });
          }
        }
      }

      console.log(`📊 User ${userId} has ${followers.length} followers`);

      return c.json({ followers });
    } catch (error) {
      console.error('Get followers error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // Get following list (only accepted follows)
  app.get('/make-server-29f6739b/following/:userId', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const userId = c.req.param('userId');
      
      // Get all accepted follow relationships where this user is following others
      const allFollows = await kv.getByPrefix('follow:');
      const following = [];

      for (const follow of allFollows) {
        if (follow.follower_id === userId && follow.status === 'accepted') {
          // This user is following someone (accepted)
          const followingProfile = await kv.get(`user:${follow.following_id}`);
          if (followingProfile) {
            // Check if current user is following this person
            const isFollowing = await kv.get(`follow:${user.id}:${follow.following_id}`);
            
            // Check if there's a pending request from current user
            const pendingRequest = await kv.get(`follow_request:${user.id}:${follow.following_id}`);
            const hasPendingRequest = pendingRequest && pendingRequest.status === 'pending';
            
            following.push({
              id: followingProfile.id,
              full_name: followingProfile.full_name,
              username: followingProfile.username || followingProfile.email?.split('@')[0] || 'user',
              avatar_url: followingProfile.avatar_url,
              is_following: !!(isFollowing && isFollowing.status === 'accepted'),
              follow_status: hasPendingRequest ? 'pending' : (isFollowing ? 'following' : 'not_following'),
            });
          }
        }
      }

      console.log(`📊 User ${userId} is following ${following.length} users`);

      return c.json({ following });
    } catch (error) {
      console.error('Get following error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // Get follow status between two users
  app.get('/make-server-29f6739b/follow/status/:userId', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const userId = c.req.param('userId');
      
      // Check if current user is following target user
      const follow = await kv.get(`follow:${user.id}:${userId}`);
      const followRequest = await kv.get(`follow_request:${user.id}:${userId}`);
      
      // Check if target user is following current user
      const followsBack = await kv.get(`follow:${userId}:${user.id}`);

      let status = 'not_following';
      if (follow && follow.status === 'accepted') {
        status = 'following';
      } else if (followRequest && followRequest.status === 'pending') {
        status = 'pending';
      }

      return c.json({ 
        status,
        follows_back: !!(followsBack && followsBack.status === 'accepted'),
      });
    } catch (error) {
      console.error('Get follow status error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // Repair follow counts for a user by recalculating from actual follow relationships
  app.post('/make-server-29f6739b/follow/repair-counts', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { user_id } = await c.req.json();
      const targetUserId = user_id || user.id; // Default to current user if not specified

      console.log(`🔧 Repairing follow counts for user ${targetUserId}...`);

      // Get all follow relationships
      const allFollows = await kv.getByPrefix('follow:');
      
      // Count followers (people following this user)
      let followersCount = 0;
      for (const follow of allFollows) {
        if (follow.following_id === targetUserId && follow.status === 'accepted') {
          followersCount++;
        }
      }
      
      // Count following (people this user is following)
      let followingCount = 0;
      for (const follow of allFollows) {
        if (follow.follower_id === targetUserId && follow.status === 'accepted') {
          followingCount++;
        }
      }

      // Get all posts by this user
      const allPosts = await kv.getByPrefix('post:');
      let postsCount = 0;
      for (const post of allPosts) {
        if (post.user_id === targetUserId) {
          postsCount++;
        }
      }

      // Update user profile with correct counts
      const userProfile = await kv.get(`user:${targetUserId}`) || {};
      const oldFollowersCount = userProfile.followers_count || 0;
      const oldFollowingCount = userProfile.following_count || 0;
      const oldPostsCount = userProfile.posts_count || 0;

      userProfile.followers_count = followersCount;
      userProfile.following_count = followingCount;
      userProfile.posts_count = postsCount;

      await kv.set(`user:${targetUserId}`, userProfile);

      console.log(`✅ Repaired counts for user ${targetUserId}:`);
      console.log(`   Followers: ${oldFollowersCount} → ${followersCount}`);
      console.log(`   Following: ${oldFollowingCount} → ${followingCount}`);
      console.log(`   Posts: ${oldPostsCount} → ${postsCount}`);

      return c.json({ 
        success: true,
        old_counts: {
          followers: oldFollowersCount,
          following: oldFollowingCount,
          posts: oldPostsCount,
        },
        new_counts: {
          followers: followersCount,
          following: followingCount,
          posts: postsCount,
        },
      });
    } catch (error) {
      console.error('Repair counts error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // Initialize counts for current user if missing (called on app load)
  app.post('/make-server-29f6739b/follow/init-counts', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get user profile
      const userProfile = await kv.get(`user:${user.id}`) || {};
      
      // Check if counts are missing or undefined
      const needsInit = 
        userProfile.followers_count === undefined ||
        userProfile.following_count === undefined ||
        userProfile.posts_count === undefined;
      
      if (!needsInit) {
        // Counts already exist
        return c.json({ 
          success: true,
          initialized: false,
          counts: {
            followers: userProfile.followers_count,
            following: userProfile.following_count,
            posts: userProfile.posts_count,
          },
        });
      }

      // Initialize missing counts to 0
      if (userProfile.followers_count === undefined) userProfile.followers_count = 0;
      if (userProfile.following_count === undefined) userProfile.following_count = 0;
      if (userProfile.posts_count === undefined) userProfile.posts_count = 0;

      await kv.set(`user:${user.id}`, userProfile);

      console.log(`✅ Initialized counts for user ${user.id} to 0`);

      return c.json({ 
        success: true,
        initialized: true,
        counts: {
          followers: userProfile.followers_count,
          following: userProfile.following_count,
          posts: userProfile.posts_count,
        },
      });
    } catch (error) {
      console.error('Init counts error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });

  // Repair all users' counts (admin function)
  app.post('/make-server-29f6739b/follow/repair-all-counts', async (c) => {
    try {
      const user = await verifyUser(c.req.header('Authorization'));
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      console.log(`🔧 Repairing follow counts for ALL users...`);

      // Get all users
      const allUsers = await kv.getByPrefix('user:');
      
      // Get all follow relationships once
      const allFollows = await kv.getByPrefix('follow:');
      
      // Get all posts once
      const allPosts = await kv.getByPrefix('post:');

      const repairs = [];

      for (const userProfile of allUsers) {
        const userId = userProfile.id;
        
        // Count followers
        let followersCount = 0;
        for (const follow of allFollows) {
          if (follow.following_id === userId && follow.status === 'accepted') {
            followersCount++;
          }
        }
        
        // Count following
        let followingCount = 0;
        for (const follow of allFollows) {
          if (follow.follower_id === userId && follow.status === 'accepted') {
            followingCount++;
          }
        }

        // Count posts
        let postsCount = 0;
        for (const post of allPosts) {
          if (post.user_id === userId) {
            postsCount++;
          }
        }

        const oldCounts = {
          followers: userProfile.followers_count || 0,
          following: userProfile.following_count || 0,
          posts: userProfile.posts_count || 0,
        };

        // Update user profile
        userProfile.followers_count = followersCount;
        userProfile.following_count = followingCount;
        userProfile.posts_count = postsCount;

        await kv.set(`user:${userId}`, userProfile);

        repairs.push({
          user_id: userId,
          old: oldCounts,
          new: {
            followers: followersCount,
            following: followingCount,
            posts: postsCount,
          },
        });

        console.log(`✅ Repaired user ${userId}: followers ${oldCounts.followers}→${followersCount}, following ${oldCounts.following}→${followingCount}, posts ${oldCounts.posts}→${postsCount}`);
      }

      console.log(`✅ Repaired counts for ${repairs.length} users`);

      return c.json({ 
        success: true,
        repaired_count: repairs.length,
        repairs,
      });
    } catch (error) {
      console.error('Repair all counts error:', error);
      return c.json({ error: 'Server error' }, 500);
    }
  });
}
