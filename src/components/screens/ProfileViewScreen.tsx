import { ArrowLeft, Phone, Video, MessageCircle, Star, Ban, Trash2, UserX, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar } from '../Avatar';
import { Separator } from '../ui/separator';
import { motion } from 'motion/react';
import { formatPhoneNumber } from '../../utils/phone';
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
  isBlocked = false,
  lastSeen,
}: ProfileViewScreenProps) {
  const isOnline = user.is_online;
  const statusText = isOnline ? 'online' : (lastSeen || 'offline');

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <motion.div 
        className="bg-surface border-b border-border px-4 py-3 flex items-center gap-4 shadow-sm shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Profile Photo Section - WhatsApp Style */}
        <motion.div 
          className="bg-surface pb-6 flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
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
        </motion.div>

        {/* Action Buttons - WhatsApp Style */}
        <motion.div 
          className="bg-background px-6 py-6 flex justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {onSendMessage && (
            <motion.button
              onClick={onSendMessage}
              className="flex flex-col items-center gap-2 group"
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Message</span>
            </motion.button>
          )}

          {onInitiateCall && (
            <>
              <motion.button
                onClick={() => onInitiateCall('voice')}
                className="flex flex-col items-center gap-2 group"
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                  <Phone className="w-6 h-6 text-success" />
                </div>
                <span className="text-xs text-muted-foreground">Audio</span>
              </motion.button>

              <motion.button
                onClick={() => onInitiateCall('video')}
                className="flex flex-col items-center gap-2 group"
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-14 h-14 rounded-full bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors">
                  <Video className="w-6 h-6 text-info" />
                </div>
                <span className="text-xs text-muted-foreground">Video</span>
              </motion.button>
            </>
          )}
        </motion.div>

        {/* About Section */}
        <motion.div 
          className="bg-surface mt-2 px-4 py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
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
        </motion.div>

        {/* Phone Number Section */}
        {user.phone_number && (
          <motion.div 
            className="bg-surface mt-2 px-4 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.35 }}
          >
            <h3 className="text-sm text-primary mb-2">Phone</h3>
            <p className="text-base text-foreground mb-1">
              {formatPhoneNumber(user.phone_number)}
            </p>
            <p className="text-xs text-muted-foreground">Mobile</p>
          </motion.div>
        )}

        {/* Email Section */}
        {user.email && (
          <motion.div 
            className="bg-surface mt-2 px-4 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <h3 className="text-sm text-primary mb-2">Email</h3>
            <p className="text-base text-foreground">{user.email}</p>
          </motion.div>
        )}

        {/* Username Section */}
        {user.username && user.username !== user.email?.split('@')[0] && (
          <motion.div 
            className="bg-surface mt-2 px-4 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.45 }}
          >
            <h3 className="text-sm text-primary mb-2">Username</h3>
            <p className="text-base text-foreground">@{user.username}</p>
          </motion.div>
        )}

        {/* Spacer */}
        <div className="h-4" />

        {/* Danger Zone - WhatsApp Style */}
        <motion.div 
          className="bg-surface mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
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
        </motion.div>

        {/* Bottom padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}
