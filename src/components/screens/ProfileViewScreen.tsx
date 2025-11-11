import { useState, useEffect } from 'react';
import { ArrowLeft, Phone, Video, MessageCircle, Star, Ban, Trash2, UserX, User as UserIcon, UserPlus, UserMinus, X } from '../ui/icons';
import { Button } from '../ui/button';
import { Avatar } from '../Avatar';
import { Separator } from '../ui/separator';
import { formatPhoneNumber } from '../../utils/phone';
import { followApi } from '../../utils/api';
import { toast } from '../../utils/toast';
import type { User as UserType } from '../../utils/types';

interface ProfileViewScreenProps {
  user: UserType;
  currentUser: UserType;
  onBack: () => void;
  onSendMessage?: () => void;
  onInitiateCall?: (callType: 'voice' | 'video') => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  onDelete?: () => void;
  onViewProfile?: () => void; // Navigate to enhanced profile to see posts/reels
  isBlocked?: boolean;
  lastSeen?: string;
}

export function ProfileViewScreen({
  user,
  currentUser,
  onBack,
  onSendMessage,
  onInitiateCall,
  onBlock,
  onUnblock,
  onDelete,
  onViewProfile,
  isBlocked = false,
  lastSeen,
}: ProfileViewScreenProps) {
  const isOnline = user.is_online;
  const statusText = isOnline ? 'online' : (lastSeen || 'offline');
  
  const [followStatus, setFollowStatus] = useState<'not_following' | 'pending' | 'following'>('not_following');
  const [followsBack, setFollowsBack] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowStatus();
  }, [user.id]);

  const loadFollowStatus = async () => {
    setLoading(true);
    try {
      const response = await followApi.getFollowStatus(user.id);
      if (response.success && response.data) {
        setFollowStatus(response.data.status || 'not_following');
        setFollowsBack(response.data.follows_back || false);
      }
    } catch (error) {
      console.error('Error loading follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (followStatus === 'following') {
      // Unfollow
      setFollowStatus('not_following');
      const response = await followApi.unfollow(user.id);
      if (!response.success) {
        setFollowStatus('following');
        toast.error('Failed to unfollow');
      } else {
        toast.success('Unfollowed');
        setFollowsBack(false);
      }
    } else if (followStatus === 'pending') {
      // Cancel request
      setFollowStatus('not_following');
      const response = await followApi.cancelFollowRequest(user.id);
      if (!response.success) {
        setFollowStatus('pending');
        toast.error('Failed to cancel request');
      } else {
        toast.success('Follow request cancelled');
      }
    } else {
      // Send follow request
      setFollowStatus('pending');
      const response = await followApi.follow(user.id);
      if (!response.success) {
        setFollowStatus('not_following');
        toast.error('Failed to send follow request');
      } else {
        toast.success('Follow request sent');
        // Reload to check if now mutual
        await loadFollowStatus();
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div 
        className="bg-surface border-b border-border px-4 py-3 flex items-center gap-4 shadow-sm shrink-0 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 rounded-full hover:bg-[var(--hover-surface)] shrink-0 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex-1">
          <h2 className="truncate">Contact Info</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Profile Photo Section - WhatsApp Style */}
        <div 
          className="bg-surface pb-6 flex flex-col items-center animate-in fade-in zoom-in-95 duration-400 delay-100"
        >
          {/* Large Profile Photo - WhatsApp exact style */}
          <div className="w-full bg-background/50 flex items-center justify-center py-12 mb-6">
            <div className="relative group cursor-pointer">
              {/* Main profile photo */}
              <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-full overflow-hidden shadow-2xl ring-1 ring-border/20 transition-all duration-300 group-hover:shadow-3xl group-hover:scale-[1.02]">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-full h-full object-cover object-center"
                    style={{
                      imageRendering: 'auto',
                      WebkitFontSmoothing: 'antialiased',
                    }}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-accent`}>
                    <span className="text-8xl font-semibold text-white select-none">
                      {user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                
                {/* Online status indicator */}
                {isOnline && (
                  <div className="absolute bottom-6 right-6 w-12 h-12 bg-success rounded-full border-[5px] border-surface shadow-xl" />
                )}
              </div>
              
              {/* Subtle hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/5 transition-all duration-300 pointer-events-none" />
            </div>
          </div>

          {/* User Name */}
          <h1 className="text-2xl font-medium mb-1 text-center px-4">
            {user.full_name}
          </h1>

          {/* Phone Number */}
          <p className="text-base text-muted-foreground mb-1">
            {user.phone_number ? formatPhoneNumber(user.phone_number) : 'No phone number'}
          </p>

          {/* Online Status */}
          <p className="text-sm text-muted-foreground">
            {statusText}
          </p>
        </div>

        {/* Action Buttons - WhatsApp Style */}
        <div 
          className="bg-background px-6 py-6 flex justify-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-200"
        >
          {onSendMessage && (
            <button
              onClick={onSendMessage}
              className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Message</span>
            </button>
          )}

          {onInitiateCall && (
            <>
              <button
                onClick={() => onInitiateCall('voice')}
                className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
              >
                <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                  <Phone className="w-6 h-6 text-success" />
                </div>
                <span className="text-xs text-muted-foreground">Audio</span>
              </button>

              <button
                onClick={() => onInitiateCall('video')}
                className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
              >
                <div className="w-14 h-14 rounded-full bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors">
                  <Video className="w-6 h-6 text-info" />
                </div>
                <span className="text-xs text-muted-foreground">Video</span>
              </button>
            </>
          )}
        </div>

        {/* Follow Status Badge */}
        {!loading && followsBack && followStatus === 'following' && (
          <div className="mx-6 mb-4 px-4 py-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/30 animate-in fade-in duration-300 delay-250">
            <p className="text-sm text-center">
              <span className="text-primary font-medium">✓ Friends</span>
              <span className="text-muted-foreground ml-1">• You follow each other</span>
            </p>
          </div>
        )}

        {!loading && followsBack && followStatus !== 'following' && (
          <div className="mx-6 mb-4 px-4 py-3 bg-muted rounded-xl animate-in fade-in duration-300 delay-250">
            <p className="text-sm text-center text-muted-foreground">
              Follows you
            </p>
          </div>
        )}

        {/* Follow & View Profile Actions */}
        <div className="px-6 pb-4 flex gap-3 animate-in fade-in duration-300 delay-300">
          {!loading && (
            <button
              onClick={handleFollowToggle}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2 ${
                followStatus === 'following'
                  ? 'bg-muted hover:bg-muted/80 text-foreground'
                  : followStatus === 'pending'
                  ? 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  : 'bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg shadow-primary/30'
              }`}
            >
              {followStatus === 'following' ? (
                <>
                  <UserMinus className="w-4 h-4" />
                  <span>Following</span>
                </>
              ) : followStatus === 'pending' ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Requested</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Follow</span>
                </>
              )}
            </button>
          )}

          {onViewProfile && (
            <button
              onClick={onViewProfile}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-info/10 to-info/20 hover:from-info/20 hover:to-info/30 text-info font-medium rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <UserIcon className="w-4 h-4" />
              <span>View Profile</span>
            </button>
          )}
        </div>

        {/* About Section */}
        <div 
          className="bg-surface mt-2 px-4 py-4 animate-in fade-in duration-300 delay-300"
        >
          <h3 className="text-sm text-primary mb-2">About</h3>
          <p className="text-base text-foreground mb-1">
            {user.status || user.status_message || user.bio || 'Hey there! I am using AuroraLink.'}
          </p>
          {user.status_updated_at && (
            <p className="text-xs text-muted-foreground">
              {new Date(user.status_updated_at).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          )}
        </div>

        {/* Phone Number Section */}
        {user.phone_number && (
          <div 
            className="bg-surface mt-2 px-4 py-4 animate-in fade-in duration-300 delay-350"
          >
            <h3 className="text-sm text-primary mb-2">Phone</h3>
            <p className="text-base text-foreground mb-1">
              {formatPhoneNumber(user.phone_number)}
            </p>
            <p className="text-xs text-muted-foreground">Mobile</p>
          </div>
        )}

        {/* Email Section */}
        {user.email && (
          <div 
            className="bg-surface mt-2 px-4 py-4 animate-in fade-in duration-300 delay-400"
          >
            <h3 className="text-sm text-primary mb-2">Email</h3>
            <p className="text-base text-foreground">{user.email}</p>
          </div>
        )}

        {/* Username Section */}
        {user.username && user.username !== user.email?.split('@')[0] && (
          <div 
            className="bg-surface mt-2 px-4 py-4 animate-in fade-in duration-300 delay-450"
          >
            <h3 className="text-sm text-primary mb-2">Username</h3>
            <p className="text-base text-foreground">@{user.username}</p>
          </div>
        )}

        {/* Spacer */}
        <div className="h-4" />

        {/* Danger Zone - WhatsApp Style */}
        <div 
          className="bg-surface mt-2 animate-in fade-in duration-300 delay-500"
        >
          {isBlocked ? (
            onUnblock && (
              <button
                onClick={onUnblock}
                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-[var(--hover-surface)] transition-colors text-left"
              >
                <UserX className="w-5 h-5 text-warning" />
                <span className="text-base text-warning">Unblock Contact</span>
              </button>
            )
          ) : (
            onBlock && (
              <button
                onClick={onBlock}
                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-[var(--hover-surface)] transition-colors text-left"
              >
                <Ban className="w-5 h-5 text-destructive" />
                <span className="text-base text-destructive">Block Contact</span>
              </button>
            )
          )}

          {onBlock && onDelete && <Separator />}

          {onDelete && (
            <button
              onClick={onDelete}
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-[var(--hover-surface)] transition-colors text-left"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="text-base text-destructive">Delete Chat</span>
            </button>
          )}
        </div>

        {/* Bottom padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}
