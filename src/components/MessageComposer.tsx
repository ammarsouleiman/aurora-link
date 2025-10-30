import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Image as ImageIcon, Smile, Mic, X, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { EmojiPicker } from './EmojiPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { MicrophonePermissionDialog } from './MicrophonePermissionDialog';
import { toast } from '../utils/toast';

interface MessageComposerProps {
  onSend: (message: string, attachments?: File[]) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageComposer({
  onSend,
  onTyping,
  placeholder = 'Type a message',
  disabled = false,
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    // Typing indicator
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    }
  };

  const handleSend = () => {
    if ((!message.trim() && attachments.length === 0) || disabled) return;

    onSend(message, attachments);
    setMessage('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (onTyping) {
      onTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
      setShowAttachMenu(false);
    }
  };

  const removeAttachment = (index: number) => {
    // Clean up blob URL if it's an image
    const file = attachments[index];
    if (file && file.type.startsWith('image/')) {
      // Blob URLs are automatically cleaned up, but we can be explicit
      const previewUrls = document.querySelectorAll(`img[src^="blob:"]`);
      previewUrls.forEach((img) => {
        const src = (img as HTMLImageElement).src;
        if (src.startsWith('blob:')) {
          URL.revokeObjectURL(src);
        }
      });
    }
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach((file) => {
        if (file.type.startsWith('image/')) {
          const previewUrls = document.querySelectorAll(`img[src^="blob:"]`);
          previewUrls.forEach((img) => {
            const src = (img as HTMLImageElement).src;
            if (src.startsWith('blob:')) {
              URL.revokeObjectURL(src);
            }
          });
        }
      });
    };
  }, [attachments]);

  const checkMicrophonePermission = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state;
      }
      return 'prompt';
    } catch (error) {
      console.log('Permissions API not available:', error);
      return 'prompt';
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const permissionState = await checkMicrophonePermission();
    
    if (permissionState === 'denied') {
      toast.error('Microphone access blocked', {
        description: 'Please enable microphone access in your browser settings',
        duration: 6000,
      });
      return;
    }

    if (!hasRequestedPermission && permissionState === 'prompt') {
      setShowPermissionDialog(true);
      return;
    }

    setIsRecording(true);
  };

  const handleAllowMicrophone = () => {
    setHasRequestedPermission(true);
    setShowPermissionDialog(false);
    setIsRecording(true);
  };

  const handleRecordingComplete = (audioBlob: Blob, duration: number) => {
    const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
      type: 'audio/webm',
    });
    
    setAttachments([audioFile]);
    setIsRecording(false);
    
    onSend('', [audioFile]);
    setAttachments([]);
  };

  const handleRecordingCancel = () => {
    setIsRecording(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(message + emoji);
    
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Show voice recorder UI when recording
  if (isRecording) {
    return (
      <VoiceRecorder
        onRecordingComplete={handleRecordingComplete}
        onCancel={handleRecordingCancel}
      />
    );
  }

  return (
    <>
      <MicrophonePermissionDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
        onAllow={handleAllowMicrophone}
      />

      <div className="bg-surface border-t border-border w-full shrink-0">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="px-3 pt-3 pb-2 flex gap-2 flex-wrap border-b border-border w-full overflow-x-auto">
            {attachments.map((file, index) => {
              const isImage = file.type.startsWith('image/');
              const previewUrl = isImage ? URL.createObjectURL(file) : null;
              
              return (
                <div
                  key={index}
                  className="relative group bg-muted rounded-lg overflow-hidden flex items-center"
                  style={{ minWidth: isImage ? '80px' : 'auto' }}
                >
                  {isImage && previewUrl ? (
                    <div className="relative">
                      <img 
                        src={previewUrl} 
                        alt={file.name}
                        className="w-20 h-20 object-cover rounded-lg"
                        style={{ display: 'block' }}
                      />
                      <button
                        onClick={() => removeAttachment(index)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                        aria-label="Remove attachment"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="px-3 py-2 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                      </div>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2"
                        aria-label="Remove attachment"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="px-2 py-2 sm:px-4 sm:py-3 flex items-end gap-1 sm:gap-2 w-full max-w-full">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            multiple
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            multiple
          />

          {/* Emoji picker */}
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-[var(--hover-surface)] text-muted-foreground shrink-0 transition-colors"
                disabled={disabled}
                aria-label="Add emoji"
              >
                <Smile className="w-6 h-6" />
              </Button>
            }
          />

          {/* Attachment button */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-[var(--hover-surface)] text-muted-foreground shrink-0 transition-colors"
              disabled={disabled}
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              aria-label="Attach files"
            >
              <Plus className="w-6 h-6" />
            </Button>

            {/* Attachment menu */}
            {showAttachMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowAttachMenu(false)}
                />
                <div className="absolute bottom-full left-0 mb-2 bg-popover border border-border rounded-lg shadow-lg p-2 z-20 min-w-[180px]">
                  <button
                    onClick={() => {
                      imageInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[var(--hover-surface)] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm">Photos</span>
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[var(--hover-surface)] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Paperclip className="w-5 h-5 text-accent" />
                    </div>
                    <span className="text-sm">Documents</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Message input */}
          <div className="flex-1 bg-surface-elevated rounded-[24px] px-4 py-2 flex items-center gap-2 border border-border/50 focus-within:border-primary/30 transition-colors">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 bg-transparent outline-none resize-none max-h-[120px] placeholder:text-muted-foreground/60"
              rows={1}
              aria-label="Message input"
            />
          </div>

          {/* Send or record button */}
          {message.trim() || attachments.length > 0 ? (
            <Button
              onClick={handleSend}
              disabled={disabled}
              size="icon"
              className="h-10 w-10 rounded-full shrink-0 bg-primary hover:bg-primary/90 shadow-md"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              disabled={disabled}
              className="h-10 w-10 rounded-full hover:bg-[var(--hover-surface)] text-muted-foreground shrink-0 transition-colors"
              aria-label="Record voice message"
            >
              <Mic className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
