import { useState, useEffect } from 'react';
import { Search, Play } from 'lucide-react';
import { feedApi, userSearchApi } from '../../utils/api';
import type { Post, User } from '../../utils/types';

interface ExploreScreenProps {
  currentUser: User;
  onNavigate: (view: string, data?: any) => void;
}

export function ExploreScreen({ currentUser, onNavigate }: ExploreScreenProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadExplorePosts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadExplorePosts = async () => {
    setLoading(true);
    try {
      const response = await feedApi.getExploreFeed();
      if (response.success && response.data) {
        // Make sure we have an array
        const postsData = response.data.posts || response.data;
        setPosts(Array.isArray(postsData) ? postsData : []);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading explore posts:', error);
      setPosts([]);
    }
    setLoading(false);
  };

  const searchUsers = async () => {
    setSearching(true);
    // Implement user search
    // For now, use phone search as fallback
    if (searchQuery.startsWith('+')) {
      const response = await userSearchApi.searchByPhone(searchQuery);
      if (response.success && response.data) {
        setSearchResults([response.data]);
      }
    }
    setSearching(false);
  };

  const handlePostClick = (postId: string) => {
    onNavigate('post-detail', { postId });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#f5f5f5] to-white">
      {/* Header with Search */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-4 shadow-lg">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people..."
            className="w-full pl-12 pr-4 py-3 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {searchQuery.trim() ? (
          /* Search Results */
          <div className="p-4">
            {searching ? (
              <div className="flex justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#25D366]/20 border-t-[#25D366]"></div>
                  <p className="text-gray-600 text-sm">Searching...</p>
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => onNavigate('profile-view', { userId: user.id })}
                    className="w-full flex items-center space-x-4 p-4 bg-white hover:bg-gray-50 rounded-2xl transition-all shadow-sm border border-gray-100"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-full flex items-center justify-center ring-2 ring-white shadow-md">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-semibold text-white">
                          {user.full_name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">{user.full_name}</p>
                      {user.phone_number && (
                        <p className="text-sm text-gray-500">{user.phone_number}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 inline-block">
                  <p className="text-gray-600">No users found</p>
                  <p className="text-sm text-gray-400 mt-1">Try a different search</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Explore Grid */
          <div className="grid grid-cols-3 gap-0.5 bg-gray-200">
            {loading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gradient-to-br from-gray-300 to-gray-200 animate-pulse"></div>
              ))
            ) : posts.length === 0 ? (
              <div className="col-span-3 flex flex-col items-center justify-center h-96 bg-white">
                <div className="bg-gradient-to-br from-[#25D366]/10 to-[#128C7E]/10 rounded-3xl p-8">
                  <p className="text-gray-600">No posts to explore</p>
                  <p className="text-sm text-gray-400 mt-1">Check back later</p>
                </div>
              </div>
            ) : (
              posts.map(post => (
                <button
                  key={post.id}
                  onClick={() => handlePostClick(post.id)}
                  className="aspect-square bg-black relative overflow-hidden group"
                >
                  {post.type === 'reel' ? (
                    <>
                      <video
                        src={post.media_url}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full">
                          <Play size={24} className="text-[#25D366]" fill="currentColor" />
                        </div>
                      </div>
                      {/* Play indicator */}
                      <div className="absolute top-2 right-2">
                        <Play size={20} className="text-white drop-shadow-lg" fill="white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        src={post.media_url}
                        alt="Post"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
