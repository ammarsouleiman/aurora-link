import { useState, useRef, useEffect } from 'react';
import { X, Upload, Film, Play, Pause, MapPin, Loader2, Check } from 'lucide-react';
import { feedApi } from '../../utils/api';
import { toast } from '../../utils/toast';
import type { User } from '../../utils/types';

interface ReelComposerScreenProps {
  currentUser: User;
  onClose: () => void;
  onReelCreated: () => void;
}

export function ReelComposerScreen({ currentUser, onClose, onReelCreated }: ReelComposerScreenProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup video URL when component unmounts
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('Video file is too large. Maximum size is 100MB');
      return;
    }

    // Revoke previous URL if exists
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);

      // Validate duration (max 30 seconds for reels)
      if (duration > 30) {
        toast.error('Video is too long. Reels can be up to 30 seconds');
        setSelectedFile(null);
        setVideoUrl('');
        URL.revokeObjectURL(videoUrl);
      }
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const handlePublish = async () => {
    if (!selectedFile) {
      toast.error('Please select a video');
      return;
    }

    if (videoDuration > 30) {
      toast.error('Video is too long. Please select a video under 30 seconds');
      return;
    }

    setUploading(true);

    try {
      const response = await feedApi.createPost({
        file: selectedFile,
        type: 'reel',
        caption: caption.trim(),
        location: location.trim(),
      });

      if (response.success) {
        toast.success('Reel published successfully! 🎉');
        onReelCreated();
      } else {
        toast.error(response.error || 'Failed to publish reel');
      }
    } catch (error) {
      console.error('Error publishing reel:', error);
      toast.error('Failed to publish reel');
    } finally {
      setUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-900 to-black flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-4 flex items-center justify-between shadow-lg">
        <button
          onClick={onClose}
          disabled={uploading}
          className="p-2 -ml-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
        >
          <X size={24} className="text-white" />
        </button>
        <h1 className="text-white text-xl font-medium">Create Reel</h1>
        <button
          onClick={handlePublish}
          disabled={!selectedFile || uploading || videoDuration > 30}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full font-medium transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Check size={18} />
              Publish
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        {!selectedFile ? (
          /* Upload prompt */
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/20 flex items-center justify-center mb-6">
              <Film size={64} className="text-[#25D366]" />
            </div>
            
            <h2 className="text-white text-2xl mb-3">Upload Your Reel</h2>
            <p className="text-white/70 mb-8 max-w-md">
              Share a moment with a video up to 30 seconds. Your reel will be visible to all your followers.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white rounded-full font-medium hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
            >
              <Upload size={24} />
              Select Video
            </button>

            <div className="mt-8 text-white/50 text-sm space-y-2">
              <p>• Maximum duration: 30 seconds</p>
              <p>• Maximum file size: 100MB</p>
              <p>• Supported formats: MP4, MOV, AVI</p>
            </div>
          </div>
        ) : (
          /* Video preview and details */
          <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
            {/* Video preview */}
            <div className="relative aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onLoadedMetadata={handleVideoLoad}
                onEnded={() => setPlaying(false)}
                loop
              />

              {/* Play/Pause overlay */}
              <button
                onClick={togglePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
              >
                {!playing && (
                  <div className="p-6 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] shadow-2xl">
                    <Play size={48} className="text-white" fill="white" />
                  </div>
                )}
              </button>

              {/* Duration badge */}
              {videoDuration > 0 && (
                <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-white text-sm font-medium">
                  {formatDuration(videoDuration)}
                  {videoDuration > 30 && (
                    <span className="ml-2 text-red-400">Too long!</span>
                  )}
                </div>
              )}

              {/* Change video button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-4 left-4 px-4 py-2 bg-black/60 backdrop-blur-md hover:bg-black/80 text-white rounded-full text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Upload size={16} />
                Change Video
              </button>
            </div>

            {/* Caption input */}
            <div className="space-y-2">
              <label className="text-white text-sm font-medium">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                maxLength={2200}
                rows={3}
                disabled={uploading}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366] disabled:opacity-50"
              />
              <p className="text-white/40 text-xs text-right">
                {caption.length} / 2200
              </p>
            </div>

            {/* Location input */}
            <div className="space-y-2">
              <label className="text-white text-sm font-medium flex items-center gap-2">
                <MapPin size={16} />
                Add Location (Optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where was this filmed?"
                maxLength={100}
                disabled={uploading}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#25D366] disabled:opacity-50"
              />
            </div>

            {videoDuration > 30 && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-2xl">
                <p className="text-red-300 text-sm">
                  ⚠️ Your video is {formatDuration(videoDuration)} long. Reels must be 30 seconds or less. Please select a shorter video.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}