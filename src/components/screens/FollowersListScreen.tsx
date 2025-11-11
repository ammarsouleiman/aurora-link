import { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, UserMinus, RefreshCw } from 'lucide-react';
import { Avatar } from '../Avatar';
import { feedApi, followApi } from '../../utils/api';
import { toast } from '../../utils/toast';

interface FollowerUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  is_following: boolean;
}

interface FollowersListScreenProps {
  userId: string;
  currentUserId: string;
  mode: 'followers' | 'following';
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

export function FollowersListScreen({ userId, currentUserId, mode, onBack, onViewProfile }: FollowersListScreenProps) {
  const [users, setUsers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingStates, setFollowingStates] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadUsers();
  }, [userId, mode]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // First, repair counts for this user to ensure they're accurate
      console.log(`[FOLLOWERS] Repairing counts for user ${userId}...`);
      await followApi.repairCounts(userId);
      
      // Then fetch the actual followers/following list
      const response = mode === 'followers'
        ? await followApi.getFollowers(userId)
        : await followApi.getFollowing(userId);
      
      if (response.success && response.data) {
        const usersData: FollowerUser[] = response.data.followers || response.data.following || [];
        console.log(`[FOLLOWERS] Loaded ${usersData.length} ${mode} for user ${userId}`);
        setUsers(usersData);
        
        // Initialize following states
        const states: { [key: string]: boolean } = {};
        usersData.forEach(user => {
          states[user.id] = user.is_following || false;
        });
        setFollowingStates(states);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error(`Failed to load ${mode}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetUserId: string) => {
    const wasFollowing = followingStates[targetUserId];
    
    // Optimistic update
    setFollowingStates(prev => ({ ...prev, [targetUserId]: !wasFollowing }));

    const response = wasFollowing
      ? await followApi.unfollow(targetUserId)
      : await followApi.follow(targetUserId);

    if (!response.success) {
      // Revert on error
      setFollowingStates(prev => ({ ...prev, [targetUserId]: wasFollowing }));
      toast.error('Failed to update follow status');
    }
  };

  const isOwnProfile = userId === currentUserId;

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          <h1 className="text-white text-xl font-medium ml-3">
            {mode === 'followers' ? 'Followers' : 'Following'}
          </h1>
        </div>
        <button
          onClick={async () => {
            setRefreshing(true);
            await loadUsers();
            setRefreshing(false);
          }}
          disabled={refreshing}
          className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw 
            size={20} 
            className={`text-white ${refreshing ? 'animate-spin' : ''}`} 
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#25D366]/20 border-t-[#25D366]" />
              <p className="text-gray-600 text-sm">Loading...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/20 flex items-center justify-center mb-4">
              <UserPlus size={40} className="text-[#25D366]" />
            </div>
            <h2 className="text-xl mb-2 text-gray-800">
              No {mode === 'followers' ? 'followers' : 'following'} yet
            </h2>
            <p className="text-gray-500 max-w-xs">
              {mode === 'followers' 
                ? 'When people follow this account, they\'ll appear here' 
                : 'Start following people to see them here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map(user => (
              <div key={user.id} className="px-4 py-4 flex items-center gap-3">
                <button onClick={() => onViewProfile(user.id)} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar
                    user={{
                      id: user.id,
                      full_name: user.full_name,
                      avatar_url: user.avatar_url
                    }}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                  </div>
                </button>

                {user.id !== currentUserId && (
                  <button
                    onClick={() => handleFollowToggle(user.id)}
                    className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                      followingStates[user.id]
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white hover:shadow-lg'
                    }`}
                  >
                    {followingStates[user.id] ? (
                      <>
                        <UserMinus size={16} />
                        Following
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
    </div>
  );
}
