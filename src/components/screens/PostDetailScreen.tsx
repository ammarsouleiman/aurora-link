import { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, MoreVertical } from 'lucide-react';
import { Avatar } from '../Avatar';
import { feedApi } from '../../utils/api';
import { toast } from '../../utils/toast';
import type { Post, Comment, User } from '../../utils/types';

interface PostDetailScreenProps {
  postId: string;
  currentUser: User;
  onClose: () => void;
  onNavigate: (view: string, data?: any) => void;
}

export function PostDetailScreen({ postId, currentUser, onClose, onNavigate }: PostDetailScreenProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPostDetails();
  }, [postId]);

  const loadPostDetails = async () => {
    setLoading(true);
    try {
      const [postResponse, commentsResponse] = await Promise.all([
        feedApi.getPost(postId),
        feedApi.getComments(postId)
      ]);

      if (postResponse.success && postResponse.data) {
        // Handle both { post } and direct post object
        const postData = postResponse.data.post || postResponse.data;
        setPost(postData);
        setIsLiked(postData.is_liked || false);
      }

      if (commentsResponse.success && commentsResponse.data) {
        // Make sure we have an array
        const commentsData = commentsResponse.data.comments || commentsResponse.data;
        setComments(Array.isArray(commentsData) ? commentsData : []);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error loading post details:', error);
      setComments([]);
    }

    setLoading(false);
  };

  const handleLike = async () => {
    if (!post) return;

    const wasLiked = isLiked;
    
    // Optimistic update
    setIsLiked(!wasLiked);
    setPost({
      ...post,
      likes_count: post.likes_count + (wasLiked ? -1 : 1)
    });

    // Server update
    const response = wasLiked 
      ? await feedApi.unlikePost(postId)
      : await feedApi.likePost(postId);

    if (!response.success) {
      // Revert on error
      setIsLiked(wasLiked);
      setPost({
        ...post,
        likes_count: post.likes_count + (wasLiked ? 1 : -1)
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !post) return;

    setSubmitting(true);
    const response = await feedApi.addComment(postId, newComment.trim());

    if (response.success && response.data) {
      // Server returns { comment: {...}, comments_count: ... }
      const newCommentData = response.data.comment || response.data;
      setComments([...comments, newCommentData]);
      setNewComment('');
      setPost({
        ...post,
        comments_count: response.data.comments_count || post.comments_count + 1
      });
    } else {
      toast.error('Failed to post comment');
    }

    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!post) return;

    const response = await feedApi.deleteComment(commentId);
    if (response.success) {
      setComments(comments.filter(c => c.id !== commentId));
      setPost({
        ...post,
        comments_count: post.comments_count - 1
      });
      toast.success('Comment deleted');
    } else {
      toast.error('Failed to delete comment');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#25D366]"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <p className="text-gray-500">Post not found</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <h1 className="font-semibold text-lg">Post</h1>
        <div className="w-10"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Post Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Avatar
              name={post.user.full_name}
              imageUrl={post.user.avatar_url}
              size="md"
              onClick={() => onNavigate('profile-view', { userId: post.user.id })}
            />
            <div>
              <p className="font-semibold text-sm">{post.user.full_name}</p>
              {post.location && (
                <p className="text-xs text-gray-500">{post.location}</p>
              )}
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Post Media */}
        <div className="w-full bg-black">
          {post.type === 'reel' ? (
            <video
              src={post.media_url}
              className="w-full max-h-[400px] object-contain"
              controls
              playsInline
            />
          ) : (
            <img
              src={post.media_url}
              alt="Post"
              className="w-full max-h-[400px] object-contain"
            />
          )}
        </div>

        {/* Post Actions */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLike}
                className="transition-transform active:scale-110"
              >
                <Heart
                  className={`w-7 h-7 ${
                    isLiked ? 'fill-red-500 text-red-500' : 'text-gray-900'
                  }`}
                />
              </button>
            </div>
          </div>

          {post.likes_count > 0 && (
            <p className="font-semibold text-sm mb-2">
              {post.likes_count.toLocaleString()} {post.likes_count === 1 ? 'like' : 'likes'}
            </p>
          )}

          {post.caption && (
            <p className="text-sm mb-2">
              <span className="font-semibold mr-2">{post.user.full_name}</span>
              {post.caption}
            </p>
          )}
        </div>

        {/* Comments */}
        <div className="px-4 py-3 space-y-4 mb-20">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No comments yet</p>
              <p className="text-sm mt-1">Be the first to comment</p>
            </div>
          ) : (
            comments.filter(comment => comment.user).map(comment => (
              <div key={comment.id} className="flex items-start space-x-3">
                <Avatar
                  name={comment.user?.full_name || 'Unknown User'}
                  imageUrl={comment.user?.avatar_url}
                  size="sm"
                  onClick={() => onNavigate('profile-view', { userId: comment.user.id })}
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold mr-2">{comment.user?.full_name || 'Unknown User'}</span>
                        {comment.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimeAgo(comment.created_at)}
                      </p>
                    </div>
                    {comment.user?.id === currentUser.id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-red-500 ml-2"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comment Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <Avatar
            name={currentUser.full_name || currentUser.fullName}
            imageUrl={currentUser.avatar_url || currentUser.avatarUrl}
            size="sm"
          />
          <input
            ref={commentInputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
            placeholder="Add a comment..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
            disabled={submitting}
          />
          <button
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
            className="p-2 text-[#25D366] disabled:text-gray-300 transition-colors"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
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
