import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Type, Upload, Check, Trash2, Plus, Send } from '../ui/icons';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from '../../utils/toast';
import { storiesApi, uploadApi } from '../../utils/api';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { User } from '../../utils/types';

interface StoryComposerScreenProps {
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

interface QueuedStory {
  id: string;
  type: 'text' | 'image' | 'video';
  // For text stories
  text_content?: string;
  background_color?: string;
  // For media stories
  file?: File;
  preview_url?: string;
  caption?: string;
}

const BACKGROUND_COLORS = [
  '#0057FF', // Primary
  '#00D4A6', // Accent
  '#FF4D4F', // Red
  '#FFB020', // Orange
  '#9333EA', // Purple
  '#EC4899', // Pink
  '#10B981', // Green
  '#3B82F6', // Blue
  '#000000', // Black
  '#FFFFFF', // White
];

export function StoryComposerScreen({
  currentUser,
  onClose,
  onSuccess,
}: StoryComposerScreenProps) {
  const [mode, setMode] = useState<'select' | 'text' | 'media' | 'queue'>('select');
  const [storyQueue, setStoryQueue] = useState<QueuedStory[]>([]);
  
  // Text story state
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0]);
  
  // Media story state
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process multiple files
    const validFiles: File[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`${file.name}: Invalid file type`);
        continue;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 50MB)`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    // If single file, show editor
    if (validFiles.length === 1) {
      setSelectedFile(validFiles[0]);
      setPreviewUrl(URL.createObjectURL(validFiles[0]));
      setMode('media');
    } else {
      // If multiple files, add directly to queue
      const newStories: QueuedStory[] = validFiles.map(file => ({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        file,
        preview_url: URL.createObjectURL(file),
      }));
      
      setStoryQueue(prev => [...prev, ...newStories]);
      setMode('queue');
      toast.success(`${validFiles.length} ${validFiles.length === 1 ? 'story' : 'stories'} added to queue`);
    }

    // Reset input
    e.target.value = '';
  };

  const handleAddTextStory = () => {
    if (!textContent.trim()) {
      toast.error('Please enter some text');
      return;
    }

    const newStory: QueuedStory = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      text_content: textContent.trim(),
      background_color: backgroundColor,
    };

    setStoryQueue(prev => [...prev, newStory]);
    
    // Reset and go back to queue or select
    setTextContent('');
    setBackgroundColor(BACKGROUND_COLORS[0]);
    setMode(storyQueue.length > 0 ? 'queue' : 'select');
    
    toast.success('Text story added to queue');
  };

  const handleAddMediaStory = () => {
    if (!selectedFile) return;

    const newStory: QueuedStory = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: selectedFile.type.startsWith('image/') ? 'image' : 'video',
      file: selectedFile,
      preview_url: previewUrl || undefined,
      caption: caption.trim() || undefined,
    };

    setStoryQueue(prev => [...prev, newStory]);
    
    // Reset and go to queue
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setMode('queue');
    
    toast.success('Story added to queue');
  };

  const handleRemoveStory = (id: string) => {
    setStoryQueue(prev => prev.filter(s => s.id !== id));
    
    // If queue is empty, go back to select
    if (storyQueue.length === 1) {
      setMode('select');
    }
  };

  const handlePublishAll = async () => {
    if (storyQueue.length === 0) {
      toast.error('No stories to publish');
      return;
    }

    setPublishing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const story of storyQueue) {
        try {
          if (story.type === 'text') {
            // Create text story
            const result = await storiesApi.create('text', {
              text_content: story.text_content!,
              background_color: story.background_color,
            });

            if (result.success) {
              successCount++;
            } else {
              failCount++;
            }
          } else {
            // Upload media file first
            const uploadResult = await uploadApi.uploadFile(story.file!, 'attachment');
            
            if (!uploadResult.success || !uploadResult.data?.url) {
              failCount++;
              continue;
            }

            // Create media story
            const result = await storiesApi.create(story.type, {
              media_url: uploadResult.data.url,
              caption: story.caption,
            });

            if (result.success) {
              successCount++;
            } else {
              failCount++;
            }
          }

          // Small delay between uploads to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('Error publishing story:', error);
          failCount++;
        }
      }

      // Show results
      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount} ${successCount === 1 ? 'story' : 'stories'} published successfully! 🎉`);
        onSuccess();
        onClose();
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`${successCount} published, ${failCount} failed`);
        // Remove successfully published stories
        setStoryQueue(prev => prev.slice(successCount));
      } else {
        toast.error('Failed to publish stories. Please try again.');
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('An error occurred while publishing');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-r from-primary to-accent shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            disabled={publishing}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-lg font-semibold text-white">
            {mode === 'queue' ? `${storyQueue.length} ${storyQueue.length === 1 ? 'Story' : 'Stories'}` : 'Create Story'}
          </h2>
          {mode === 'queue' && storyQueue.length > 0 ? (
            <Button
              onClick={handlePublishAll}
              disabled={publishing}
              size="sm"
              className="bg-white text-primary hover:bg-white/90"
            >
              {publishing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="hidden sm:inline">Publishing...</span>
                </div>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  <span>Publish All</span>
                </>
              )}
            </Button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pt-16 h-full flex flex-col overflow-hidden">
        {mode === 'select' && (
          <div
            key="select"
            className="flex-1 flex items-center justify-center p-6 animate-in fade-in duration-300"
          >
            <div className="w-full max-w-md space-y-4">
              {/* Show queue button if there are stories */}
              {storyQueue.length > 0 && (
                <button
                  onClick={() => setMode('queue')}
                  className="w-full h-20 rounded-2xl bg-primary/10 border-2 border-primary flex items-center justify-between px-6 hover:bg-primary/20 transition-all group animate-in fade-in slide-in-from-top-4 duration-300"
                >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{storyQueue.length}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">Story Queue</p>
                        <p className="text-sm text-muted-foreground">
                          {storyQueue.length} {storyQueue.length === 1 ? 'story' : 'stories'} ready
                        </p>
                      </div>
                    </div>
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={() => setMode('text')}
                  className="w-full h-32 rounded-2xl bg-gradient-to-br from-primary to-accent flex flex-col items-center justify-center gap-3 hover:shadow-lg transition-all group animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75"
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Type className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-white font-medium">Text Status</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-2xl bg-surface border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-hover-primary transition-all group animate-in fade-in slide-in-from-bottom-4 duration-300 delay-150"
                >
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="text-foreground font-medium">Photo or Video</span>
                  <span className="text-xs text-muted-foreground">Select multiple files</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
              </div>
            </div>
          )}

          {mode === 'text' && (
            <div
              key="text"
              className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300"
            >
              {/* Preview */}
              <div
                className="flex-1 flex items-center justify-center p-8"
                style={{ backgroundColor }}
              >
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type your status..."
                  className="max-w-lg bg-transparent border-none text-white text-2xl font-medium text-center placeholder:text-white/50 resize-none h-auto min-h-[200px] focus-visible:ring-0"
                  autoFocus
                  maxLength={250}
                />
              </div>

              {/* Controls */}
              <div className="bg-surface border-t border-border p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Background Color</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {BACKGROUND_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setBackgroundColor(color)}
                        className="flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: backgroundColor === color ? 'var(--primary)' : 'transparent',
                        }}
                      >
                        {backgroundColor === color && (
                          <Check
                            className="w-5 h-5"
                            style={{
                              color: color === '#FFFFFF' ? '#000000' : '#FFFFFF',
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setMode(storyQueue.length > 0 ? 'queue' : 'select');
                      setTextContent('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddTextStory}
                    disabled={!textContent.trim()}
                    className="flex-1"
                    size="lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Queue
                  </Button>
                </div>
              </div>
            </div>
          )}

          {mode === 'media' && previewUrl && selectedFile && (
            <div
              key="media"
              className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300"
            >
              {/* Preview */}
              <div className="flex-1 bg-black flex items-center justify-center p-4 overflow-hidden">
                {selectedFile.type.startsWith('image/') ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageWithFallback
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain"
                      style={{
                        display: 'block',
                        margin: '0 auto',
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <video
                      src={previewUrl}
                      className="max-w-full max-h-full object-contain"
                      style={{
                        display: 'block',
                        margin: '0 auto',
                      }}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="bg-surface border-t border-border p-4 space-y-4">
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption (optional)..."
                  maxLength={100}
                />

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setMode(storyQueue.length > 0 ? 'queue' : 'select');
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setCaption('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddMediaStory}
                    className="flex-1"
                    size="lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Queue
                  </Button>
                </div>
              </div>
            </div>
          )}

          {mode === 'queue' && (
            <div
              key="queue"
              className="flex-1 flex flex-col animate-in fade-in duration-300"
            >
              {/* Queue List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {storyQueue.map((story, index) => (
                  <div
                    key={story.id}
                    className="bg-surface rounded-xl border border-border overflow-hidden group hover:border-primary/50 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-300"
                    style={{animationDelay: `${index * 50}ms`}}
                  >
                    <div className="flex items-center gap-3 p-3">
                      {/* Preview Thumbnail */}
                      <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                        {story.type === 'text' ? (
                          <div
                            className="w-full h-full flex items-center justify-center p-2"
                            style={{ backgroundColor: story.background_color }}
                          >
                            <p className="text-white text-[8px] font-medium text-center leading-tight line-clamp-4">
                              {story.text_content}
                            </p>
                          </div>
                        ) : story.preview_url ? (
                          <>
                            <ImageWithFallback
                              src={story.preview_url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            {story.type === 'video' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {story.type === 'text' ? 'Text Status' : story.type === 'image' ? 'Photo' : 'Video'}
                        </p>
                        {story.caption && (
                          <p className="text-xs text-muted-foreground truncate">{story.caption}</p>
                        )}
                        {story.type === 'text' && story.text_content && (
                          <p className="text-xs text-muted-foreground truncate">{story.text_content}</p>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveStory(story.id)}
                        disabled={publishing}
                        className="flex-shrink-0 w-9 h-9 rounded-full bg-destructive/10 hover:bg-destructive hover:text-white text-destructive flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add More Button */}
              <div className="border-t border-border p-4 bg-surface">
                <Button
                  onClick={() => setMode('select')}
                  variant="outline"
                  className="w-full"
                  disabled={publishing}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add More Stories
                </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
