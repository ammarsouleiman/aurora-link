import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Smile, Mic, Paperclip, X } from 'lucide-react';
import { Button } from './ui/button';
import { EmojiPicker } from './EmojiPicker';
import { VoiceRecorder } from './VoiceRecorder';

interface MessageComposerProps {
  onSend: (message: string, attachments?: File[]) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageComposer({ 
  onSend, 
  onTyping, 
  disabled = false,
  placeholder = "Type a message"
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleInputChange = (value: string) => {
    setMessage(value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }

    // Typing indicator
    if (onTyping) {
      onTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleSend = () => {
    if ((!message.trim() && attachments.length === 0) || disabled) return;

    onSend(message.trim(), attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Stop typing indicator
    if (onTyping) {
      onTyping(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const newMessage = message + emoji;
    setMessage(newMessage);
    textareaRef.current?.focus();
    
    // Trigger input change for typing indicator
    if (onTyping) {
      handleInputChange(newMessage);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceRecordingComplete = (audioBlob: Blob) => {
    const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    onSend('', [audioFile]);
    setIsRecording(false);
  };

  // Show send button when there's text, otherwise show mic/recording
  const showSendButton = message.trim().length > 0 || attachments.length > 0;

  return (
    <div className="composer-container bg-surface border-t border-border shrink-0">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="px-3 pt-2 pb-1 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div 
              key={index} 
              className="relative inline-flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 pr-8"
            >
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs truncate max-w-[120px]">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-background transition-colors"
                aria-label="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Main composer bar - WhatsApp style */}
      <div className="composer-bar flex items-end gap-1.5 px-2 py-1.5 pb-safe">
        {isRecording ? (
          /* Voice recording mode - full width */
          <div className="flex-1">
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              onCancel={() => setIsRecording(false)}
            />
          </div>
        ) : (
          <>
            {/* Left actions */}
            <div className="flex items-center gap-0.5 pb-[6px]">
              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    className="h-9 w-9 rounded-full hover:bg-[var(--hover-surface)] text-muted-foreground composer-action-btn"
                    aria-label="Add emoji"
                  >
                    <Smile className="w-[22px] h-[22px]" />
                  </Button>
                }
              />
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="h-9 w-9 rounded-full hover:bg-[var(--hover-surface)] text-muted-foreground composer-action-btn"
                aria-label="Attach file"
              >
                <Paperclip className="w-[22px] h-[22px]" />
              </Button>
            </div>

            {/* Pill-shaped input field */}
            <div className="flex-1 relative composer-input-wrapper">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                className="composer-input w-full resize-none bg-muted/50 rounded-[20px] px-[14px] py-[10px] text-[15px] leading-[1.4] 
                  placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                  max-h-[120px] overflow-y-auto scrollbar-thin"
                style={{
                  height: 'auto',
                  minHeight: '44px',
                }}
              />
            </div>

            {/* Right action - Send or Mic */}
            <div className="pb-[6px]">
              {showSendButton ? (
                <Button
                  onClick={handleSend}
                  disabled={disabled}
                  className="h-11 w-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground 
                    shadow-md hover:shadow-lg transition-all duration-200 composer-send-btn
                    active:scale-95"
                  aria-label="Send message"
                >
                  <Send className="w-[20px] h-[20px]" />
                </Button>
              ) : (
                <Button
                  onClick={() => setIsRecording(true)}
                  disabled={disabled}
                  variant="ghost"
                  className="h-11 w-11 rounded-full hover:bg-[var(--hover-surface)] text-muted-foreground composer-action-btn
                    active:scale-95 transition-all duration-200"
                  aria-label="Record voice message"
                >
                  <Mic className="w-[22px] h-[22px]" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
