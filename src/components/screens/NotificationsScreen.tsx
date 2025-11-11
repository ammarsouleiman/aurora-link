import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageCircle, UserPlus, Check, X, Sparkles } from 'lucide-react';
import { Avatar } from '../Avatar';
import { feedApi, followApi } from '../../utils/api';
import { toast } from '../../utils/toast';
import { formatDistanceToNow } from '../../utils/time';

interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'follow_request' | 'follow_accepted';
  actor_id: string;
  post_id?: string;
  comment_id?: string;
  read: boolean;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
  };
  post?: {
    id: string;
    media_url: string;
    type: string;
  };
}

interface NotificationsScreenProps {
  onBack: () => void;
  onViewProfile: (userId: string) => void;
  onViewPost: (postId: string) => void;
  onUserUpdate?: (updates: { followers_count?: number; following_count?: number }) => void;
}

export function NotificationsScreen({ onBack, onViewProfile, onViewPost, onUserUpdate }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingFollowRequest, setProcessingFollowRequest] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const result = await feedApi.getNotifications();
      if (result.success && result.data?.notifications) {
        setNotifications(result.data.notifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const result = await feedApi.markNotificationAsRead(notificationId);
      
      // Only update state if the request was successful
      // If it fails with 404, the notification was already deleted, which is fine
      if (result.success) {
        setNotifications(prev => prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        ));
      }
    } catch (error) {
      // Silently ignore 404 errors (notification was deleted)
      console.log('Notification may have been deleted:', notificationId);
    }
  };

  const markAllAsRead = async () => {
    try {
      await feedApi.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleAcceptFollowRequest = async (notificationId: string, actorId: string) => {
    try {
      setProcessingFollowRequest(notificationId);
      // Accept the follow request
      const result = await followApi.acceptFollowRequest(actorId);
      if (result.success) {
        // No need to call markAsRead - backend deletes the notification
        
        // Check if they're now friends (mutual followers)
        const areFriends = result.data?.are_friends;
        if (areFriends) {
          toast.success('Follow request accepted! You are now friends 🎉');
        } else {
          toast.success('Follow request accepted ✅');
        }
        
        // Update current user's follower count
        if (result.data?.following_profile && onUserUpdate) {
          onUserUpdate({
            followers_count: result.data.following_profile.followers_count,
            following_count: result.data.following_profile.following_count,
          });
          console.log('📊 Updated current user counts:');
          console.log(`   Following: ${result.data.following_profile.following_count}`);
          console.log(`   Followers: ${result.data.following_profile.followers_count}`);
        }
        
        // Log the updated counts for debugging
        if (result.data?.follower_profile && result.data?.following_profile) {
          console.log('📊 Updated counts after accepting follow request:');
          console.log(`   Follower (${actorId}): ${result.data.follower_profile.following_count} following, ${result.data.follower_profile.followers_count} followers`);
          console.log(`   You: ${result.data.following_profile.following_count} following, ${result.data.following_profile.followers_count} followers`);
          console.log(`   Are friends: ${areFriends}`);
        }
        
        // Remove notification from list immediately
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      } else {
        // Check if already processed
        if (result.error?.includes('already processed') || result.data?.already_processed) {
          // Silently remove the notification since it was already handled
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
          toast.info('This request was already processed');
        } else {
          toast.error('Failed to accept follow request');
        }
      }
    } catch (error) {
      console.error('Failed to accept follow request:', error);
      toast.error('Failed to accept follow request');
    } finally {
      setProcessingFollowRequest(null);
    }
  };

  const handleRejectFollowRequest = async (notificationId: string, actorId: string) => {
    try {
      setProcessingFollowRequest(notificationId);
      // Reject the follow request
      const result = await followApi.rejectFollowRequest(actorId);
      if (result.success) {
        // No need to call markAsRead - backend deletes the notification
        toast.success('Follow request rejected');
        
        // Remove notification from list immediately
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      } else {
        // Check if already processed
        if (result.error?.includes('already processed')) {
          // Silently remove the notification since it was already handled
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
          toast.info('This request was already processed');
        } else {
          toast.error('Failed to reject follow request');
        }
      }
    } catch (error) {
      console.error('Failed to reject follow request:', error);
      toast.error('Failed to reject follow request');
    } finally {
      setProcessingFollowRequest(null);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.type === 'like' || notification.type === 'comment') {
      if (notification.post_id) {
        onViewPost(notification.post_id);
      }
    } else if (notification.type === 'follow' || notification.type === 'follow_accepted') {
      if (notification.actor_id) {
        onViewProfile(notification.actor_id);
      }
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'follow':
        return 'started following you';
      case 'follow_request':
        return 'requested to follow you';
      case 'follow_accepted':
        return 'accepted your follow request';
      default:
        return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return (
          <div className="p-2 rounded-full bg-gradient-to-br from-red-500 to-pink-500 shadow-lg">
            <Heart size={18} className="text-white" fill="currentColor" />
          </div>
        );
      case 'comment':
        return (
          <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <MessageCircle size={18} className="text-white" />
          </div>
        );
      case 'follow':
      case 'follow_request':
      case 'follow_accepted':
        return (
          <div className="p-2 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] shadow-lg">
            <UserPlus size={18} className="text-white" />
          </div>
        );
      default:
        return null;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="h-screen bg-gradient-to-b from-[#f5f5f5] to-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 -ml-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          <div>
            <h1 className="text-white text-xl font-medium">Activity</h1>
            {unreadCount > 0 && (
              <p className="text-white/80 text-xs">{unreadCount} unread</p>
            )}
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-white hover:bg-white/20 px-4 py-2 rounded-full transition-colors font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#25D366]/20 border-t-[#25D366]" />
              <p className="text-gray-600 text-sm">Loading activity...</p>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/20 flex items-center justify-center mb-4">
              <Sparkles size={40} className="text-[#25D366]" />
            </div>
            <h2 className="text-xl mb-2 text-gray-800">No activity yet</h2>
            <p className="text-gray-500 max-w-xs">
              When someone likes or comments on your posts, you'll see it here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-4 ${
                  !notification.read 
                    ? 'bg-gradient-to-r from-[#25D366]/5 to-[#128C7E]/5' 
                    : 'bg-white'
                } hover:bg-gray-50 transition-colors`}
              >
                <div className="flex items-start gap-3">
                  {/* Unread indicator dot */}
                  {!notification.read && (
                    <div className="flex-shrink-0 pt-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-md animate-pulse" />
                    </div>
                  )}
                  
                  {/* Avatar with icon overlay */}
                  <div className="relative flex-shrink-0">
                    <button onClick={() => notification.actor && onViewProfile(notification.actor.id)}>
                      <div className="ring-2 ring-white rounded-full">
                        <Avatar
                          user={notification.actor || { id: '', full_name: 'Unknown' }}
                          size="lg"
                        />
                      </div>
                    </button>
                    <div className="absolute -bottom-1 -right-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="flex-1 text-left"
                      >
                        <p className="text-sm leading-relaxed">
                          <span className="font-semibold text-gray-900">
                            {notification.actor?.full_name || 'Someone'}
                          </span>
                          {' '}
                          <span className="text-gray-600">
                            {getNotificationText(notification)}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at))}
                        </p>
                      </button>

                      {/* Post thumbnail */}
                      {notification.post && (
                        <button
                          onClick={() => notification.post_id && onViewPost(notification.post_id)}
                          className="flex-shrink-0"
                        >
                          <img
                            src={notification.post.media_url}
                            alt="Post"
                            className="w-12 h-12 rounded-lg object-cover ring-2 ring-gray-200"
                          />
                        </button>
                      )}
                    </div>

                    {/* Follow request actions */}
                    {notification.type === 'follow_request' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleAcceptFollowRequest(notification.id, notification.actor_id)}
                          disabled={processingFollowRequest === notification.id}
                          className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                        >
                          <Check size={18} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectFollowRequest(notification.id, notification.actor_id)}
                          disabled={processingFollowRequest === notification.id}
                          className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                        >
                          <X size={18} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
