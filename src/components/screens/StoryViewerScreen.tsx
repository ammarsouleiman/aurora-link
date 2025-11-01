import { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, MoreVertical, Send, Eye, Trash2, Heart, Smile } from 'lucide-react';
import { Avatar } from '../Avatar';
import { Input } from '../ui/input';
import { toast } from '../../utils/toast';
import { storiesApi } from '../../utils/api';
import type { User, UserStories, Story } from '../../utils/types';
import { motion, AnimatePresence } from 'motion/react';

interface StoryViewerScreenProps {
  userStoriesList: UserStories[];
  initialUserIndex: number;
  currentUser: User;
  onClose: () => void;
  onRefresh: () => void;
}

export function StoryViewerScreen({
  userStoriesList,
  initialUserIndex,
  currentUser,
  onClose,
  onRefresh,
}: StoryViewerScreenProps) {
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [viewCount, setViewCount] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  
  const currentUserStories = userStoriesList[currentUserIndex];
  const currentStory = currentUserStories?.stories[currentStoryIndex];
  const isMyStory = currentUserStories?.user.id === currentUser.id;
  const STORY_DURATION = 5000; // 5 seconds per story

  // Calculate time remaining until story expires (24 hours from creation)
  const getTimeRemaining = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const expiresAt = created + (24 * 60 * 60 * 1000); // 24 hours
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else if (minutes > 0) {
      return `${minutes}m left`;
    } else {
      return 'Expiring soon';
    }
  };

  // Reset loaded states when story changes
  useEffect(() => {
    setImageLoaded(false);
    setVideoLoaded(false);
    setProgress(0);
  }, [currentStory?.id]);

  // Mark story as viewed and load view count
  useEffect(() => {
    const recordView = async () => {
      if (currentStory && !isMyStory) {
        const result = await storiesApi.view(currentStory.id);
        if (result.success) {
          console.log(`[Story] ✅ View recorded for story ${currentStory.id}`);
        } else {
          console.error(`[Story] ❌ Failed to record view:`, result.error);
        }
      }
      
      // Load view count for my stories
      if (currentStory && isMyStory) {
        loadViewCount();
      }
    };
    
    recordView();
  }, [currentStory?.id, isMyStory]);

  // Progress timer
  useEffect(() => {
    if (isPaused || !currentStory) return;

    // Don't start timer until media is loaded
    if (currentStory.type === 'image' && !imageLoaded) return;
    if (currentStory.type === 'video' && !videoLoaded) return;

    startTimeRef.current = Date.now();
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        handleNext();
      } else {
        timerRef.current = setTimeout(updateProgress, 16); // ~60fps
      }
    };

    timerRef.current = setTimeout(updateProgress, 16);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentStory?.id, isPaused, imageLoaded, videoLoaded]);

  const handleNext = () => {
    if (currentStoryIndex < currentUserStories.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else if (currentUserIndex < userStoriesList.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    } else if (currentUserIndex > 0) {
      const prevUserIndex = currentUserIndex - 1;
      setCurrentUserIndex(prevUserIndex);
      setCurrentStoryIndex(userStoriesList[prevUserIndex].stories.length - 1);
      setProgress(0);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !currentStory) return;

    const result = await storiesApi.reply(currentStory.id, replyText.trim());
    if (result.success) {
      toast.success('Reply sent', {
        description: `Your message was sent to ${currentUserStories.user.full_name}`,
        duration: 2000,
      });
      setReplyText('');
      if (replyInputRef.current) {
        replyInputRef.current.blur();
      }
    } else {
      toast.error('Failed to send reply');
    }
  };

  const handleDelete = async () => {
    if (!currentStory || !isMyStory) return;

    const result = await storiesApi.delete(currentStory.id);
    if (result.success) {
      toast.success('Story deleted');
      onRefresh();
      onClose();
    } else {
      toast.error('Failed to delete story');
    }
  };

  const loadViewCount = async () => {
    if (!currentStory || !isMyStory) return;

    const result = await storiesApi.getViews(currentStory.id);
    if (result.success && result.data?.views) {
      setViewCount(result.data.views.length);
    }
  };

  const loadViewers = async () => {
    if (!currentStory || !isMyStory) return;

    const result = await storiesApi.getViews(currentStory.id);
    if (result.success && result.data?.views) {
      setViewers(result.data.views);
      setViewCount(result.data.views.length);
      setShowViewers(true);
      setIsPaused(true);
    }
  };

  // WhatsApp-style tap navigation
  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = clientX - rect.left;
    const tapZone = rect.width / 3;
    
    if (x < tapZone) {
      handlePrevious();
    } else if (x > rect.width - tapZone) {
      handleNext();
    }
  };

  // WhatsApp-style swipe up to view viewers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    
    // Swipe up threshold
    if (diff > 50 && isMyStory) {
      loadViewers();
    } else {
      setIsPaused(false);
    }
  };

  const handleQuickReaction = async (emoji: string) => {
    if (!currentStory) return;
    
    const result = await storiesApi.reply(currentStory.id, emoji);
    if (result.success) {
      // Show quick feedback animation
      toast.success('Reaction sent', {
        icon: emoji,
        duration: 1500,
      });
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Progress Bars - WhatsApp Style */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2 pt-safe">
        {currentUserStories.stories.map((_, index) => (
          <div
            key={index}
            className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden backdrop-blur-sm"
          >
            <motion.div
              className="h-full bg-white shadow-sm"
              initial={{ width: 0 }}
              animate={{
                width:
                  index < currentStoryIndex
                    ? '100%'
                    : index === currentStoryIndex
                    ? `${progress}%`
                    : '0%',
              }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
        ))}
      </div>

      {/* Header - WhatsApp Style */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-safe">
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 via-black/40 to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative">
              <Avatar user={currentUserStories.user} size="sm" showBorder={false} />
              {currentUserStories.user.is_online && !isMyStory && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-black" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[15px] truncate leading-tight">
                {isMyStory ? 'Your story' : currentUserStories.user.full_name}
              </p>
              <p className="text-white/80 text-xs leading-tight">
                {new Date(currentStory.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })} • {getTimeRemaining(currentStory.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {isMyStory && (
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-white" />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Menu Dropdown - WhatsApp Style */}
        <AnimatePresence>
          {showMenu && isMyStory && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-3 mt-1 bg-surface rounded-2xl shadow-2xl overflow-hidden min-w-[180px] border border-border/50"
              onClick={() => setShowMenu(false)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  handleDelete();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-hover-destructive transition-colors text-left text-destructive"
              >
                <Trash2 className="w-[18px] h-[18px]" />
                <span className="text-[15px] font-medium">Delete</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Story Content - Full Screen WhatsApp Style */}
      <div
        className="absolute inset-0 flex items-center justify-center select-none"
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStory.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="w-full h-full flex items-center justify-center"
          >
            {currentStory.type === 'image' && (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={currentStory.media_url}
                  alt="Story"
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                  style={{
                    imageRendering: 'high-quality',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
              </div>
            )}

            {currentStory.type === 'video' && (
              <div className="w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={currentStory.media_url}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  autoPlay
                  muted
                  playsInline
                  onLoadedData={() => setVideoLoaded(true)}
                  onError={() => setVideoLoaded(true)}
                  style={{
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
              </div>
            )}

            {currentStory.type === 'text' && (
              <div
                className="w-full h-full flex items-center justify-center px-8 py-12"
                style={{
                  background: currentStory.background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                <p className="text-white text-[32px] leading-relaxed font-medium text-center max-w-lg px-4">
                  {currentStory.text_content}
                </p>
              </div>
            )}

            {/* Caption Overlay */}
            {currentStory.caption && (
              <div className="absolute bottom-24 left-0 right-0 px-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/50 backdrop-blur-xl rounded-2xl px-4 py-3 max-w-md mx-auto border border-white/10"
                >
                  <p className="text-white text-center text-[15px] leading-relaxed">
                    {currentStory.caption}
                  </p>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* View Count Indicator - WhatsApp Style (My Story Only) */}
      {isMyStory && viewCount > 0 && !showViewers && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={loadViewers}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-black/60 backdrop-blur-xl rounded-full px-5 py-2.5 flex items-center gap-2 hover:bg-black/70 active:scale-95 transition-all border border-white/10 shadow-lg"
        >
          <Eye className="w-[18px] h-[18px] text-white" />
          <span className="text-white font-medium text-[15px]">
            {viewCount} {viewCount === 1 ? 'view' : 'views'}
          </span>
          <ChevronUp className="w-4 h-4 text-white/60" />
        </motion.button>
      )}

      {/* Quick Reactions - WhatsApp Style (Others' Stories) */}
      {!isMyStory && !showViewers && (
        <div className="absolute bottom-20 right-4 z-30 flex flex-col gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuickReaction('❤️')}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all border border-white/10 shadow-lg"
          >
            <span className="text-2xl">❤️</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuickReaction('😂')}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all border border-white/10 shadow-lg"
          >
            <span className="text-2xl">😂</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuickReaction('😮')}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all border border-white/10 shadow-lg"
          >
            <span className="text-2xl">😮</span>
          </motion.button>
        </div>
      )}

      {/* Reply Bar - WhatsApp Style (Others' Stories) */}
      {!isMyStory && !showViewers && (
        <div className="absolute bottom-0 left-0 right-0 z-30 pb-safe">
          <div className="px-4 py-3 bg-gradient-to-t from-black/70 via-black/50 to-transparent backdrop-blur-sm">
            <div className="flex items-center gap-2 max-w-2xl mx-auto">
              <div className="flex-1 relative">
                <Input
                  ref={replyInputRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Send message`}
                  className="bg-white/15 backdrop-blur-xl border-white/20 text-white placeholder:text-white/60 rounded-full h-12 px-5 pr-12 focus:bg-white/20 focus:border-white/30 transition-all shadow-lg text-[15px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReply();
                    }
                  }}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                />
              </div>
              {replyText.trim() ? (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleReply}
                  className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 active:bg-primary/80 flex items-center justify-center transition-all shadow-lg flex-shrink-0"
                >
                  <Send className="w-5 h-5 text-white" />
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleQuickReaction('❤️')}
                  className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-xl hover:bg-white/20 active:bg-white/25 flex items-center justify-center transition-all shadow-lg flex-shrink-0 border border-white/20"
                >
                  <Heart className="w-5 h-5 text-white" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Viewers Modal - WhatsApp Style */}
      <AnimatePresence>
        {showViewers && isMyStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-40 bg-black/95 backdrop-blur-md flex items-end"
            onClick={() => {
              setShowViewers(false);
              setIsPaused(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ 
                type: 'spring', 
                damping: 35, 
                stiffness: 400,
                mass: 0.8
              }}
              className="bg-surface w-full rounded-t-[28px] overflow-hidden max-h-[75vh] pb-safe shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Swipe Indicator */}
              <div className="w-full flex justify-center py-2 bg-surface border-b border-border/50">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-5 py-4 border-b border-border/50 bg-surface">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Viewers
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {viewCount === 0 
                        ? 'No views yet' 
                        : `${viewCount} ${viewCount === 1 ? 'view' : 'views'}`
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowViewers(false);
                      setIsPaused(false);
                    }}
                    className="w-10 h-10 rounded-full hover:bg-hover-surface active:bg-hover-muted flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-foreground" />
                  </button>
                </div>
              </div>

              {/* Viewers List */}
              <div className="overflow-y-auto max-h-[calc(75vh-120px)]">
                {viewers.length > 0 ? (
                  <div className="py-1">
                    {viewers.map((view, index) => (
                      <motion.div
                        key={view.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-hover-surface active:bg-hover-muted transition-colors"
                      >
                        <Avatar user={view.user} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[15px] text-foreground truncate">
                            {view.user?.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(view.viewed_at).toLocaleString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <Eye className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground text-[15px]">No views yet</p>
                    <p className="text-muted-foreground/60 text-sm mt-1">
                      Check back later to see who viewed your story
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading indicator when media is loading */}
      {currentStory.type !== 'text' && !imageLoaded && !videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
}
