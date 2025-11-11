import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Video, Upload } from 'lucide-react';
import { feedApi } from '../../utils/api';
import { toast } from '../../utils/toast';
import type { User } from '../../utils/types';

interface PostComposerScreenProps {
  currentUser: User;
  onClose: () => void;
  onPostCreated: () => void;
}

export function PostComposerScreen({ currentUser, onClose, onPostCreated }: PostComposerScreenProps) {
  const [postType, setPostType] = useState<'photo' | 'reel' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      toast.error('Please select a photo or video file');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size must be less than 100MB');
      return;
    }

    setSelectedFile(file);
    setPostType(isVideo ? 'reel' : 'photo');
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handlePublish = async () => {
    if (!selectedFile || !postType) {
      toast.error('Please select a photo or video');
      return;
    }

    if (!caption.trim()) {
      toast.error('Please add a caption');
      return;
    }

    setUploading(true);

    try {
      const response = await feedApi.createPost({
        file: selectedFile,
        type: postType,
        caption: caption.trim(),
        location: location.trim() || undefined,
      });

      if (response.success) {
        toast.success('Post published successfully!');
        onPostCreated();
        onClose();
      } else {
        toast.error(response.error || 'Failed to publish post');
      }
    } catch (error) {
      console.error('Error publishing post:', error);
      toast.error('Failed to publish post');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPostType(null);
    setCaption('');
    setLocation('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
        <h1 className="font-semibold text-lg">New Post</h1>
        <button
          onClick={handlePublish}
          disabled={!selectedFile || !caption.trim() || uploading}
          className="px-4 py-2 bg-[#25D366] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {uploading ? 'Publishing...' : 'Publish'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Upload className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Create a new post</h2>
            <p className="text-gray-500 text-center mb-8">
              Share photos and videos with your followers
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*';
                    fileInputRef.current.click();
                  }
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-[#25D366] text-white rounded-lg font-medium hover:bg-[#20BA5A] transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
                <span>Select Photo</span>
              </button>

              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'video/*';
                    fileInputRef.current.click();
                  }
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                <Video className="w-5 h-5" />
                <span>Select Reel</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Preview */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              {postType === 'reel' ? (
                <video
                  src={previewUrl!}
                  className="w-full max-h-96 object-contain"
                  controls
                  playsInline
                />
              ) : (
                <img
                  src={previewUrl!}
                  alt="Preview"
                  className="w-full max-h-96 object-contain"
                />
              )}
              <button
                onClick={handleReset}
                className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Caption *
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                rows={4}
                maxLength={2200}
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {caption.length}/2200
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location (Optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                maxLength={100}
              />
            </div>

            {/* Post Type Badge */}
            <div className="flex items-center justify-center">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                postType === 'reel'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {postType === 'reel' ? '🎬 Reel' : '📷 Photo'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
