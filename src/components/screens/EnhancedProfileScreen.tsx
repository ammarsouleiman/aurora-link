import { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, UserMinus, MessageCircle, Grid, Film, X } from 'lucide-react';
import { Avatar } from '../Avatar';
import { feedApi, followApi } from '../../utils/api';
import { toast } from '../../utils/toast';
import type { User, UserProfile, Post } from '../../utils/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';

interface FollowerUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  is_following: boolean;
}

interface EnhancedProfileScreenProps {
  userId: string;
  currentUser: User;
  onBack: () => void;
  onNavigate: (view: string, data?: any) => void;
  onUserUpdate?: (updates: { followers_count?: number; following_count?: number }) => void;
}

export function EnhancedProfileScreen({ userId, currentUser, onBack, onNavigate, onUserUpdate }: EnhancedProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'not_following' | 'pending' | 'following'>('not_following');
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [showFollowersSheet, setShowFollowersSheet] = useState(false);
  const [followersMode, setFollowersMode] = useState<'followers' | 'following'>('followers');
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingStates, setFollowingStates] = useState<{ [key: string]: string }>({});

  const isOwnProfile = userId === currentUser.id;

  useEffect(() => {
    loadProfile();
    loadPosts();
    if (!isOwnProfile) {
      loadFollowStatus();
    }
  }, [userId]);

  // Add a polling mechanism to refresh profile data
  useEffect(() => {
    const interval = setInterval(() => {
      // Silently reload profile data to get updated counts
      loadProfile();
      if (!isOwnProfile) {
        loadFollowStatus();
      }
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [userId, isOwnProfile]);

  const loadProfile = async () => {
    // ALWAYS repair counts first
    console.log('[PROFILE] Repairing counts for user', userId);
    try {
      await followApi.repairCounts(userId);
      console.log('[PROFILE] ✅ Counts repaired');
    } catch (error) {
      console.error('[PROFILE] Failed to repair counts:', error);
    }
    
    // Then load the profile with corrected counts
    const response = await feedApi.getUserProfile(userId);
    if (response.success && response.data) {
      // Server returns { user: profile }, so we need to extract the user property
      const profileData = response.data.user || response.data;
      console.log('[PROFILE] Loaded profile data:', {
        id: profileData.id,
        username: profileData.username,
        posts_count: profileData.posts_count,
        followers_count: profileData.followers_count,
        following_count: profileData.following_count,
      });
      
      setProfile(profileData);
    }
  };

  const loadFollowStatus = async () => {
    const response = await followApi.getFollowStatus(userId);
    if (response.success && response.data) {
      setFollowStatus(response.data.status || 'not_following');
      // Store if they follow back for display
      if (profile) {
        setProfile({
          ...profile,
          follows_back: response.data.follows_back || false,
        });
      }
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await feedApi.getUserPosts(userId);
      if (response.success && response.data) {
        // Make sure we have an array
        const postsData = response.data.posts || response.data;
        setPosts(Array.isArray(postsData) ? postsData : []);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading user posts:', error);
      setPosts([]);
    }
    setLoading(false);
  };

  const loadFollowers = async (mode: 'followers' | 'following') => {
    setFollowersLoading(true);
    try {
      const response = mode === 'followers'
        ? await followApi.getFollowers(userId)
        : await followApi.getFollowing(userId);

      if (response.success && response.data) {
        const usersData: FollowerUser[] = response.data.followers || response.data.following || [];
        setFollowers(usersData);
        
        // Initialize following states
        const states: { [key: string]: string } = {};
        usersData.forEach(user => {
          states[user.id] = (user as any).follow_status || (user.is_following ? 'following' : 'not_following');
        });
        setFollowingStates(states);
      } else {
        setFollowers([]);
        toast.error(`Failed to load ${mode}`);
      }
    } catch (error) {
      console.error('Error loading followers/following:', error);
      setFollowers([]);
      toast.error(`Failed to load ${mode}`);
    } finally {
      setFollowersLoading(false);
    }
  };

  const handleFollowToggle = async (targetUserId: string) => {
    const currentStatus = followingStates[targetUserId] || 'not_following';
    
    if (currentStatus === 'following') {
      // Unfollow
      setFollowingStates(prev => ({ ...prev, [targetUserId]: 'not_following' }));
      const response = await followApi.unfollow(targetUserId);
      if (!response.success) {
        setFollowingStates(prev => ({ ...prev, [targetUserId]: 'following' }));
        toast.error('Failed to unfollow');
      }
    } else if (currentStatus === 'pending') {
      // Cancel request
      setFollowingStates(prev => ({ ...prev, [targetUserId]: 'not_following' }));
      const response = await followApi.cancelFollowRequest(targetUserId);
      if (!response.success) {
        setFollowingStates(prev => ({ ...prev, [targetUserId]: 'pending' }));
        toast.error('Failed to cancel request');
      }
    } else {
      // Send follow request
      setFollowingStates(prev => ({ ...prev, [targetUserId]: 'pending' }));
      const response = await followApi.follow(targetUserId);
      if (!response.success) {
        setFollowingStates(prev => ({ ...prev, [targetUserId]: 'not_following' }));
        toast.error('Failed to send follow request');
      } else {
        toast.success('Follow request sent');
      }
    }
  };

  const openFollowersSheet = (mode: 'followers' | 'following') => {
    setFollowersMode(mode);
    setShowFollowersSheet(true);
    loadFollowers(mode);
  };

  const handleFollow = async () => {
    if (followStatus === 'following') {
      // Unfollow
      setFollowStatus('not_following');
      const response = await followApi.unfollow(userId);
      if (!response.success) {
        setFollowStatus('following');
        toast.error('Failed to unfollow');
      } else {
        // Update target user's follower count from server response
        if (response.data?.following_profile && profile) {
          setProfile({
            ...profile,
            followers_count: response.data.following_profile.followers_count,
            follows_back: false,
          });
        }
        // Update current user's following count from server response
        if (response.data?.follower_profile && onUserUpdate) {
          onUserUpdate({
            following_count: response.data.follower_profile.following_count,
            followers_count: response.data.follower_profile.followers_count,
          });
          console.log('📊 Updated current user counts after unfollow:', response.data.follower_profile);
        }
        // Reload to get fresh counts from server
        await loadProfile();
        await loadFollowStatus();
      }
    } else if (followStatus === 'pending') {
      // Cancel request
      setFollowStatus('not_following');
      const response = await followApi.cancelFollowRequest(userId);
      if (!response.success) {
        setFollowStatus('pending');
        toast.error('Failed to cancel request');
      }
    } else {
      // Send follow request
      setFollowStatus('pending');
      const response = await followApi.follow(userId);
      if (!response.success) {
        setFollowStatus('not_following');
        toast.error('Failed to send follow request');
      } else {
        toast.success('Follow request sent');
        // Note: Don't increment following_count yet - only when accepted
        // Reload profile to check if mutual
        await loadProfile();
        await loadFollowStatus();
      }
    }
  };

  const handleMessage = () => {
    // Navigate to create DM conversation
    onNavigate('new-chat', { userId });
  };

  const filteredPosts = posts.filter(post => 
    activeTab === 'posts' ? post.type === 'photo' : post.type === 'reel'
  );

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#25D366]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-semibold text-lg">{profile.full_name}</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Profile Info */}
        <div className="px-4 py-6">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar
              name={profile.full_name}
              imageUrl={profile.avatar_url}
              size="xl"
            />
            <div className="flex-1 flex justify-around text-center">
              <div>
                <p className="font-semibold text-xl">{profile.posts_count || 0}</p>
                <p className="text-sm text-gray-600">Posts</p>
              </div>
              <button
                onClick={() => openFollowersSheet('followers')}
                className="hover:opacity-70 transition-opacity"
              >
                <p className="font-semibold text-xl">{profile.followers_count || 0}</p>
                <p className="text-sm text-gray-600">Followers</p>
              </button>
              <button
                onClick={() => openFollowersSheet('following')}
                className="hover:opacity-70 transition-opacity"
              >
                <p className="font-semibold text-xl">{profile.following_count || 0}</p>
                <p className="text-sm text-gray-600">Following</p>
              </button>
            </div>
          </div>

          {/* Bio */}
          {profile.status_message && (
            <div className="mb-4">
              <p className="text-sm">{profile.status_message}</p>
            </div>
          )}
          
          {/* Relationship Status */}
          {!isOwnProfile && (profile as any).follows_back && followStatus === 'following' && (
            <div className="mb-3 px-3 py-2 bg-gradient-to-r from-[#25D366]/10 to-[#128C7E]/10 rounded-lg border border-[#25D366]/30">
              <p className="text-sm text-center">
                <span className="text-[#128C7E] font-medium">✓ Friends</span>
                <span className="text-gray-600 ml-1">• You follow each other</span>
              </p>
            </div>
          )}
          
          {!isOwnProfile && (profile as any).follows_back && followStatus !== 'following' && (
            <div className="mb-3 px-3 py-2 bg-gray-100 rounded-lg">
              <p className="text-sm text-center text-gray-600">
                Follows you
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex space-x-2">
              <button
                onClick={handleFollow}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  followStatus === 'following'
                    ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    : followStatus === 'pending'
                    ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    : 'bg-[#25D366] text-white hover:bg-[#20BA5A]'
                }`}
              >
                {followStatus === 'following' ? (
                  <>
                    <UserMinus className="w-4 h-4 inline mr-2" />
                    Following
                  </>
                ) : followStatus === 'pending' ? (
                  <>
                    <X className="w-4 h-4 inline mr-2" />
                    Requested
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 inline mr-2" />
                    Follow
                  </>
                )}
              </button>
              <button
                onClick={handleMessage}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                <MessageCircle className="w-4 h-4 inline mr-2" />
                Message
              </button>
            </div>
          )}

          {isOwnProfile && (
            <button
              onClick={() => onNavigate('edit-profile')}
              className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200 flex">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400'
            }`}
          >
            <Grid className="w-5 h-5" />
            <span className="text-sm uppercase font-medium">Posts</span>
          </button>
          <button
            onClick={() => setActiveTab('reels')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 border-b-2 transition-colors ${
              activeTab === 'reels'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400'
            }`}
          >
            <Film className="w-5 h-5" />
            <span className="text-sm uppercase font-medium">Reels</span>
          </button>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-1">
          {!isOwnProfile && followStatus !== 'following' ? (
            /* Show privacy message for non-followers */
            <div className="col-span-3 flex flex-col items-center justify-center h-64 text-gray-500 px-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/20 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-[#128C7E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="font-medium text-gray-900 mb-1">This Account is Private</p>
              <p className="text-sm text-center text-gray-600">
                {followStatus === 'pending' 
                  ? 'Your follow request is pending. Once accepted, you\'ll be able to see their posts and reels.' 
                  : 'Follow this account to see their posts and reels.'}
              </p>
            </div>
          ) : loading ? (
            Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 animate-pulse"></div>
            ))
          ) : filteredPosts.length === 0 ? (
            <div className="col-span-3 flex flex-col items-center justify-center h-64 text-gray-500">
              <p>No {activeTab} yet</p>
              {isOwnProfile && (
                <p className="text-sm mt-1">Share your first {activeTab === 'posts' ? 'photo' : 'reel'}</p>
              )}
            </div>
          ) : (
            filteredPosts.map(post => (
              <button
                key={post.id}
                onClick={() => onNavigate('post-detail', { postId: post.id })}
                className="aspect-square bg-black relative overflow-hidden"
              >
                {post.type === 'reel' ? (
                  <>
                    <video
                      src={post.media_url}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </> 
                ) : (
                  <img
                    src={post.media_url}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Followers/Following Sheet */}
      <Sheet open={showFollowersSheet} onOpenChange={setShowFollowersSheet}>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <SheetHeader className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">
                {followersMode === 'followers' ? 'Followers' : 'Following'}
              </SheetTitle>
              <button
                onClick={() => setShowFollowersSheet(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto pb-20">
            {followersLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#25D366]/20 border-t-[#25D366]" />
                  <p className="text-gray-600 text-sm">Loading...</p>
                </div>
              </div>
            ) : followers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/20 flex items-center justify-center mb-4">
                  <UserPlus size={40} className="text-[#25D366]" />
                </div>
                <h2 className="text-xl mb-2 text-gray-800">
                  No {followersMode === 'followers' ? 'followers' : 'following'} yet
                </h2>
                <p className="text-gray-500 max-w-xs">
                  {followersMode === 'followers' 
                    ? 'When people follow this account, they\'ll appear here' 
                    : 'Start following people to see them here'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {followers.map(user => (
                  <div key={user.id} className="px-4 py-4 flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setShowFollowersSheet(false);
                        onNavigate('profile', { userId: user.id });
                      }} 
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <Avatar
                        name={user.full_name}
                        imageUrl={user.avatar_url}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                        <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                      </div>
                    </button>

                    {user.id !== currentUser.id && (
                      <button
                        onClick={() => handleFollowToggle(user.id)}
                        className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 text-sm ${
                          followingStates[user.id] === 'following'
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : followingStates[user.id] === 'pending'
                            ? 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                            : 'bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white hover:shadow-lg'
                        }`}
                      >
                        {followingStates[user.id] === 'following' ? (
                          <>
                            <UserMinus size={16} />
                            Following
                          </>
                        ) : followingStates[user.id] === 'pending' ? (
                          <>
                            <X size={16} />
                            Requested
                          </>
                        ) : (
                          <>
                            <UserPlus size={16} />
                            Follow
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
