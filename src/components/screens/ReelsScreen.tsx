import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Send, Bookmark, Volume2, VolumeX, Play, Trash2, X } from 'lucide-react';
import { Avatar } from '../Avatar';
import { feedApi } from '../../utils/api';
import { toast } from '../../utils/toast';

interface Reel {
  id: string;
  user_id: string;
  type: string;
  media_url: string;
  caption: string;
  location: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
  user: {
    id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
  };
}

interface ReelsScreenProps {
  onBack: () => void;
  onOpenComments: (postId: string) => void;
  onViewProfile: (userId: string) => void;
  currentUserId?: string;
}

export function ReelsScreen({ onBack, onOpenComments, onViewProfile, currentUserId }: ReelsScreenProps) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState<{ [key: string]: boolean }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});

  useEffect(() => {
    loadReels();
  }, []);

  useEffect(() => {
    // Auto-play current reel
    const currentReel = reels[currentIndex];
    if (currentReel) {
      const video = videoRefs.current[currentReel.id];
      if (video) {
        video.play().catch(() => {
          // Auto-play might be blocked, show play button
          setPlaying(prev => ({ ...prev, [currentReel.id]: false }));
        });
        setPlaying(prev => ({ ...prev, [currentReel.id]: true }));
      }
    }
    
    // Pause other reels
    reels.forEach((reel, index) => {
      if (index !== currentIndex) {
        const video = videoRefs.current[reel.id];
        if (video) {
          video.pause();
          setPlaying(prev => ({ ...prev, [reel.id]: false }));
        }
      }
    });
  }, [currentIndex, reels]);

  const loadReels = async () => {
    try {
      setLoading(true);
      const result = await feedApi.getReels();
      
      if (result.success && result.data?.reels) {
        setReels(result.data.reels);
      } else {
        console.error('Failed to load reels:', result.error || 'Unknown error');
        setReels([]);
        toast.error(result.error || 'Failed to load reels');
      }
    } catch (error) {
      console.error('Failed to load reels:', error);
      setReels([]);
      toast.error('Failed to load reels');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await feedApi.unlikePost(postId);
      } else {
        await feedApi.likePost(postId);
      }
      
      // Update local state
      setReels(prev => prev.map(reel => 
        reel.id === postId 
          ? { 
              ...reel, 
              is_liked: !isLiked,
              likes_count: isLiked ? reel.likes_count - 1 : reel.likes_count + 1
            } 
          : reel
      ));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleSave = async (postId: string, isSaved: boolean) => {
    try {
      if (isSaved) {
        await feedApi.unsavePost(postId);
        toast.success('Removed from saved');
      } else {
        await feedApi.savePost(postId);
        toast.success('Saved to collection');
      }
      
      setReels(prev => prev.map(reel => 
        reel.id === postId ? { ...reel, is_saved: !isSaved } : reel
      ));
    } catch (error) {
      console.error('Failed to save post:', error);
    }
  };

  const handleDeleteConfirm = async (postId: string) => {
    try {
      setDeleting(true);
      await feedApi.deletePost(postId);
      
      // Remove from list
      setReels(prev => {
        const newReels = prev.filter(r => r.id !== postId);
        // Adjust current index if needed
        if (currentIndex >= newReels.length && newReels.length > 0) {
          setCurrentIndex(newReels.length - 1);
        }
        return newReels;
      });
      
      setShowDeleteConfirm(null);
      toast.success('Reel deleted successfully');
    } catch (error) {
      console.error('Failed to delete reel:', error);
      toast.error('Failed to delete reel');
    } finally {
      setDeleting(false);
    }
  };

  const handleScroll = (e: React.WheelEvent) => {
    if (e.deltaY > 0 && currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const togglePlayPause = (reelId: string) => {
    const video = videoRefs.current[reelId];
    if (video) {
      if (playing[reelId]) {
        video.pause();
        setPlaying(prev => ({ ...prev, [reelId]: false }));
      } else {
        video.play();
        setPlaying(prev => ({ ...prev, [reelId]: true }));
      }
    }
  };

  const toggleMute = () => {
    setMuted(prev => !prev);
    Object.values(videoRefs.current).forEach(video => {
      video.muted = !muted;
    });
  };

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-b from-[#128C7E] to-[#075E54] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white" />
          <p className="text-white text-sm">Loading reels...</p>
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-b from-[#128C7E] to-[#075E54] flex flex-col items-center justify-center text-white p-8 text-center relative">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-50 text-white p-2.5 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 active:scale-95 transition-all shadow-lg"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl">
          <p className="text-xl mb-4">No reels yet</p>
          <p className="text-white/70">Start creating reels to see them here</p>
        </div>
      </div>
    );
  }

  const currentReel = reels[currentIndex];
  const isOwnReel = currentUserId === currentReel?.user_id;

  return (
    <div
      ref={containerRef}
      className="h-screen bg-black overflow-hidden relative snap-y snap-mandatory"
      onWheel={handleScroll}
    >
      {/* Close button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 text-white p-2.5 rounded-full bg-gradient-to-br from-[#25D366]/90 to-[#128C7E]/90 backdrop-blur-md hover:scale-105 active:scale-95 transition-all shadow-lg"
      >
        <X size={20} strokeWidth={2.5} />
      </button>

      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 z-50 text-white p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all"
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* Reels container */}
      <div className="h-full relative">
        {reels.map((reel, index) => (
          <div
            key={reel.id}
            className={`absolute inset-0 transition-transform duration-500 ${
              index === currentIndex ? 'translate-y-0' : index < currentIndex ? '-translate-y-full' : 'translate-y-full'
            }`}
            style={{ display: Math.abs(index - currentIndex) > 1 ? 'none' : 'block' }}
          >
            {/* Video */}
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={el => { if (el) videoRefs.current[reel.id] = el; }}
                src={reel.media_url}
                className="w-full h-full object-contain"
                loop
                muted={muted}
                playsInline
                onClick={() => togglePlayPause(reel.id)}
              />
              
              {/* Play button overlay */}
              {!playing[reel.id] && (
                <button
                  onClick={() => togglePlayPause(reel.id)}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="p-5 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] shadow-2xl">
                    <Play size={48} className="text-white" fill="white" />
                  </div>
                </button>
              )}
            </div>

            {/* Overlay UI */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Bottom gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-black via-black/70 to-transparent" />
              
              {/* User info and caption */}
              <div className="absolute bottom-24 left-4 right-24 pointer-events-auto">
                <button
                  onClick={() => onViewProfile(reel.user.id)}
                  className="flex items-center gap-3 mb-4 group"
                >
                  <div className="ring-2 ring-white/40 rounded-full p-0.5">
                    <Avatar
                      user={{
                        id: reel.user.id,
                        full_name: reel.user.full_name,
                        avatar_url: reel.user.avatar_url
                      }}
                      size="md"
                    />
                  </div>
                  <span className="text-white font-medium drop-shadow-lg">{reel.user.full_name}</span>
                  {!isOwnReel && (
                    <button className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white text-sm font-medium hover:scale-105 active:scale-95 transition-transform shadow-lg">
                      Follow
                    </button>
                  )}
                </button>
                
                {reel.caption && (
                  <p className="text-white text-sm line-clamp-3 drop-shadow-lg leading-relaxed">{reel.caption}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="absolute bottom-24 right-4 flex flex-col items-center gap-5 pointer-events-auto">
                {/* Like */}
                <button
                  onClick={() => handleLike(reel.id, reel.is_liked)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className={`p-3 rounded-full transition-all ${
                    reel.is_liked 
                      ? 'bg-gradient-to-br from-red-500 to-pink-500 scale-110' 
                      : 'bg-black/40 backdrop-blur-md hover:bg-black/60'
                  }`}>
                    <Heart
                      size={26}
                      className={reel.is_liked ? 'text-white fill-white' : 'text-white'}
                      strokeWidth={2}
                    />
                  </div>
                  <span className="text-white text-xs font-medium drop-shadow-lg">{reel.likes_count}</span>
                </button>

                {/* Comment */}
                <button
                  onClick={() => onOpenComments(reel.id)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all">
                    <MessageCircle size={26} className="text-white" strokeWidth={2} />
                  </div>
                  <span className="text-white text-xs font-medium drop-shadow-lg">{reel.comments_count}</span>
                </button>

                {/* Share */}
                <button className="flex flex-col items-center gap-1.5">
                  <div className="p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all">
                    <Send size={26} className="text-white" strokeWidth={2} />
                  </div>
                </button>

                {/* Save */}
                <button
                  onClick={() => handleSave(reel.id, reel.is_saved)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className={`p-3 rounded-full transition-all ${
                    reel.is_saved 
                      ? 'bg-gradient-to-br from-[#25D366] to-[#128C7E]' 
                      : 'bg-black/40 backdrop-blur-md hover:bg-black/60'
                  }`}>
                    <Bookmark
                      size={26}
                      className={reel.is_saved ? 'text-white fill-white' : 'text-white'}
                      strokeWidth={2}
                    />
                  </div>
                </button>

                {/* Delete (only for own reels) */}
                {isOwnReel && (
                  <button
                    onClick={() => setShowDeleteConfirm(reel.id)}
                    className="flex flex-col items-center gap-1.5 mt-2"
                  >
                    <div className="p-3 rounded-full bg-red-500/90 backdrop-blur-md hover:bg-red-600 transition-all">
                      <Trash2 size={24} className="text-white" strokeWidth={2} />
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      <div className="absolute top-20 right-4 flex flex-col gap-2 z-40">
        {reels.map((_, index) => (
          <div
            key={index}
            className={`w-1 rounded-full transition-all ${
              index === currentIndex 
                ? 'bg-gradient-to-b from-[#25D366] to-[#128C7E] h-10' 
                : 'bg-white/30 h-6'
            }`}
          />
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 max-w-sm mx-4 shadow-2xl border border-white/10">
            <h3 className="text-white text-xl font-medium mb-3">Delete Reel?</h3>
            <p className="text-white/70 text-sm mb-6">
              This reel will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(showDeleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 font-medium"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
