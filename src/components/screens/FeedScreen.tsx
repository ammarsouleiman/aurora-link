import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Trash2, X } from 'lucide-react';
import { Avatar } from '../Avatar';
import { feedApi } from '../../utils/api';
import { toast } from '../../utils/toast';
import type { Post, User } from '../../utils/types';

interface FeedScreenProps {
  currentUser: User;
  onNavigate: (view: string, data?: any) => void;
}

export function FeedScreen({ currentUser, onNavigate }: FeedScreenProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [showOptions, setShowOptions] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const response = await feedApi.getFeed();
      if (response.success && response.data) {
        // Make sure we have an array
        const postsData = response.data.posts || response.data;
        const postsArray = Array.isArray(postsData) ? postsData : [];
        setPosts(postsArray);
        // Load liked and saved states
        const liked = new Set(postsArray.filter((p: Post) => p.is_liked).map((p: Post) => p.id));
        const saved = new Set(postsArray.filter((p: Post) => p.is_saved).map((p: Post) => p.id));
        setLikedPosts(liked);
        setSavedPosts(saved);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      setPosts([]);
    }
    setLoading(false);
  };

  const handleLike = async (postId: string) => {
    const isLiked = likedPosts.has(postId);
    
    // Optimistic update
    if (isLiked) {
      setLikedPosts(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likes_count: p.likes_count - 1 } : p
      ));
    } else {
      setLikedPosts(prev => new Set(prev).add(postId));
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
      ));
    }

    // Server update
    if (isLiked) {
      await feedApi.unlikePost(postId);
    } else {
      await feedApi.likePost(postId);
    }
  };

  const handleSave = async (postId: string) => {
    const isSaved = savedPosts.has(postId);
    
    if (isSaved) {
      setSavedPosts(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      await feedApi.unsavePost(postId);
      toast.success('Removed from saved');
    } else {
      setSavedPosts(prev => new Set(prev).add(postId));
      await feedApi.savePost(postId);
      toast.success('Saved to collection');
    }
  };

  const handleComment = (postId: string) => {
    onNavigate('post-detail', { postId });
  };

  const handleShare = (postId: string) => {
    // TODO: Implement share functionality
    console.log('Share post:', postId);
    toast.info('Share feature coming soon');
  };

  const handleDeleteConfirm = async (postId: string) => {
    try {
      setDeleting(true);
      await feedApi.deletePost(postId);
      
      // Remove from list
      setPosts(prev => prev.filter(p => p.id !== postId));
      setShowDeleteConfirm(null);
      setShowOptions(null);
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-[#f5f5f5] to-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#25D366]/20 border-t-[#25D366]"></div>
          <p className="text-gray-600 text-sm">Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#f5f5f5] to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#25D366] to-[#128C7E] px-5 py-4 shadow-lg">
        <h1 className="text-white text-2xl tracking-wide" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          AuroraLink
        </h1>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto pb-20">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6 text-center">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <p className="mb-2 text-gray-700">No posts yet</p>
              <p className="text-sm text-gray-500">Follow people to see their posts here</p>
            </div>
          </div>
        ) : (
          posts.map(post => {
            const isOwnPost = currentUser.id === post.user.id;
            
            return (
              <div key={post.id} className="mb-3 bg-white shadow-sm">
                {/* Post Header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="ring-2 ring-[#25D366]/20 rounded-full p-0.5">
                      <Avatar
                        name={post.user.full_name}
                        imageUrl={post.user.avatar_url}
                        size="md"
                        onClick={() => onNavigate('profile-view', { userId: post.user.id })}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{post.user.full_name}</p>
                      {post.location && (
                        <p className="text-xs text-gray-500">{post.location}</p>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setShowOptions(showOptions === post.id ? null : post.id)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-700" />
                    </button>
                    
                    {/* Options dropdown */}
                    {showOptions === post.id && (
                      <div className="absolute right-0 mt-1 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden min-w-[160px] z-20">
                        {isOwnPost && (
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(post.id);
                              setShowOptions(null);
                            }}
                            className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                          >
                            <Trash2 size={18} />
                            <span className="text-sm font-medium">Delete</span>
                          </button>
                        )}
                        <button
                          onClick={() => setShowOptions(null)}
                          className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm">Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Media */}
                <div className="w-full bg-black">
                  {post.type === 'reel' ? (
                    <video
                      src={post.media_url}
                      className="w-full max-h-[600px] object-contain"
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={post.media_url}
                      alt="Post"
                      className="w-full max-h-[600px] object-contain"
                    />
                  )}
                </div>

                {/* Post Actions */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-5">
                      <button
                        onClick={() => handleLike(post.id)}
                        className="transition-transform active:scale-110"
                      >
                        <Heart
                          className={`w-7 h-7 transition-colors ${
                            likedPosts.has(post.id)
                              ? 'fill-red-500 text-red-500'
                              : 'text-gray-900 hover:text-gray-600'
                          }`}
                          strokeWidth={2}
                        />
                      </button>
                      <button
                        onClick={() => handleComment(post.id)}
                        className="transition-transform active:scale-110"
                      >
                        <MessageCircle className="w-7 h-7 text-gray-900 hover:text-gray-600" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleShare(post.id)}
                        className="transition-transform active:scale-110"
                      >
                        <Send className="w-7 h-7 text-gray-900 hover:text-gray-600" strokeWidth={2} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleSave(post.id)}
                      className="transition-transform active:scale-110"
                    >
                      <Bookmark
                        className={`w-7 h-7 transition-colors ${
                          savedPosts.has(post.id)
                            ? 'fill-[#25D366] text-[#25D366]'
                            : 'text-gray-900 hover:text-gray-600'
                        }`}
                        strokeWidth={2}
                      />
                    </button>
                  </div>

                  {/* Likes Count */}
                  {post.likes_count > 0 && (
                    <p className="font-semibold text-sm mb-2 text-gray-900">
                      {post.likes_count.toLocaleString()} {post.likes_count === 1 ? 'like' : 'likes'}
                    </p>
                  )}

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-sm mb-2 text-gray-900">
                      <span className="font-semibold mr-2">{post.user.full_name}</span>
                      <span className="text-gray-700">{post.caption}</span>
                    </p>
                  )}

                  {/* Comments Preview */}
                  {post.comments_count > 0 && (
                    <button
                      onClick={() => handleComment(post.id)}
                      className="text-sm text-gray-500 mb-2 hover:text-gray-700"
                    >
                      View all {post.comments_count} comments
                    </button>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    {formatTimeAgo(post.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-gray-900 text-xl font-semibold mb-3">Delete Post?</h3>
            <p className="text-gray-600 text-sm mb-6">
              This post will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(showDeleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 font-medium shadow-lg"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close options */}
      {showOptions && (
        <div 
          className="fixed inset-0 z-10"
          onClick={() => setShowOptions(null)}
        />
      )}
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
