import { useState } from 'react';
import { Check, CheckCheck, Reply, MoreVertical, Smile, Trash2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { EmojiPicker } from './EmojiPicker';
import { StoryReplyPreview } from './StoryReplyPreview';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import type { Message, Reaction } from '../utils/types';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onDeleteForMe?: () => void;
  onDeleteForEveryone?: () => void;
  currentUserId: string;
}

// Helper function to detect and linkify URLs
function linkify(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function MessageBubble({
  message,
  isSent,
  showAvatar = true,
  showTimestamp = true,
  onReply,
  onReact,
  onDeleteForMe,
  onDeleteForEveryone,
  currentUserId,
}: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Check if message was deleted
  if (message.deleted_for_everyone) {
    return (
      <div className={`flex gap-2 ${isSent ? 'flex-row-reverse' : 'flex-row'} w-full`}>
        {showAvatar && !isSent ? (
          <Avatar
            src={message.sender?.avatar_url}
            alt={message.sender?.full_name}
            size="sm"
            className="self-end shrink-0"
          />
        ) : !isSent ? (
          <div className="w-8 shrink-0" />
        ) : null}
        
        <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[80%] min-w-0`}>
          <div className={`px-4 py-2 rounded-lg italic text-sm ${
            isSent 
              ? 'bg-[var(--message-sent)]/20 text-[var(--message-sent-foreground)]/70' 
              : 'bg-[var(--message-received)] text-[var(--message-received-foreground)]/70'
          }`}>
            🚫 This message was deleted
          </div>
        </div>
      </div>
    );
  }
  
  // Check if deleted for current user
  if (message.deleted_for_users?.includes(currentUserId)) {
    return null;
  }
  
  // Check if message is within 1 hour (for delete for everyone option)
  const messageTime = new Date(message.created_at).getTime();
  const now = Date.now();
  const canDeleteForEveryone = isSent && (now - messageTime) < (60 * 60 * 1000);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleEmojiSelect = (emoji: string) => {
    if (onReact) {
      onReact(emoji);
    }
    setShowEmojiPicker(false);
  };

  // Check if message is a voice message
  const isVoiceMessage = message.type === 'voice' || 
    (message.attachments && message.attachments.length > 0 && 
     message.attachments[0].type === 'audio');

  // Check if message has an image
  const hasImage = message.type === 'image' && message.attachments && message.attachments.length > 0;

  const getMessageStatus = () => {
    if (!message.statuses || message.statuses.length === 0) {
      // Single gray check - sent but not delivered yet
      return <Check className="w-4 h-4 opacity-60" />;
    }
    
    const hasRead = message.statuses.some(s => s.status === 'read');
    const hasDelivered = message.statuses.some(s => s.status === 'delivered');
    
    if (hasRead) {
      // Double blue checks - read
      return <CheckCheck className="w-4 h-4 text-[#53bdeb]" />;
    } else if (hasDelivered) {
      // Double gray checks - delivered but not read
      return <CheckCheck className="w-4 h-4 opacity-60" />;
    }
    
    // Single gray check - sent
    return <Check className="w-4 h-4 opacity-60" />;
  };

  // Calculate if message is long
  const isLongMessage = message.body && message.body.length > 200;

  return (
    <div className={`flex gap-2 group ${isSent ? 'flex-row-reverse' : 'flex-row'} w-full`}>
      {showAvatar && !isSent ? (
        <Avatar
          src={message.sender?.avatar_url}
          alt={message.sender?.full_name}
          fallbackText={message.sender?.full_name}
          size="sm"
          className="self-end shrink-0"
        />
      ) : !isSent ? (
        <div className="w-8 shrink-0" />
      ) : null}
      
      <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[80%] min-w-0`}>
        {/* Reply preview */}
        {message.reply_to_message && (
          <div className={`mb-1.5 px-3 py-2 rounded-md border-l-4 w-full max-w-full ${
            isSent 
              ? 'bg-primary-foreground/10 border-primary-foreground/30' 
              : 'bg-muted/70 border-primary/50'
          }`}>
            <div className={`text-xs font-medium mb-0.5 truncate ${
              isSent ? 'text-primary-foreground/80' : 'text-primary'
            }`}>
              {message.reply_to_message.sender?.full_name}
            </div>
            <div className={`text-xs opacity-70 truncate ${
              isSent ? 'text-primary-foreground/70' : 'text-foreground/70'
            }`}>
              {message.reply_to_message.body || '📷 Photo'}
            </div>
          </div>
        )}
        
        {/* Message bubble */}
        <div className="relative w-full max-w-full">
          {/* Hover actions - WhatsApp style */}
          <div className={`absolute top-0 ${isSent ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} 
            opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 px-2`}>
            <EmojiPicker
              onEmojiSelect={handleEmojiSelect}
              trigger={
                <button
                  className="p-1.5 rounded-full bg-surface border border-border hover:bg-[var(--hover-surface)] transition-colors shadow-md"
                  aria-label="Add reaction"
                >
                  <Smile className="w-4 h-4 text-muted-foreground" />
                </button>
              }
            />
            <button
              onClick={onReply}
              className="p-1.5 rounded-full bg-surface border border-border hover:bg-[var(--hover-surface)] transition-colors shadow-md"
              aria-label="Reply"
            >
              <Reply className="w-4 h-4 text-muted-foreground" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-full bg-surface border border-border hover:bg-[var(--hover-surface)] transition-colors shadow-md"
                  aria-label="More options"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isSent ? 'end' : 'start'} className="w-48">
                {onDeleteForMe && (
                  <DropdownMenuItem onClick={onDeleteForMe} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete for me
                  </DropdownMenuItem>
                )}
                {isSent && canDeleteForEveryone && onDeleteForEveryone && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDeleteForEveryone} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete for everyone
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div
            className={`relative rounded-lg message-bubble-shadow overflow-hidden ${
              message.story_reply ? 'min-w-[280px]' : ''
            } ${
              isSent
                ? 'bg-[var(--message-sent)] text-[var(--message-sent-foreground)] rounded-tr-sm'
                : 'bg-[var(--message-received)] text-[var(--message-received-foreground)] rounded-tl-sm'
            }`}
          >
            {/* Message tail - only show on last message in group */}
            {showTimestamp && !hasImage && (
              <div 
                className={`absolute top-0 w-0 h-0 ${
                  isSent 
                    ? 'right-0 border-l-[8px] border-l-[var(--message-sent)] border-t-[8px] border-t-transparent'
                    : 'left-0 border-r-[8px] border-r-[var(--message-received)] border-t-[8px] border-t-transparent'
                }`}
                style={{
                  transform: isSent ? 'translateX(100%)' : 'translateX(-100%)',
                }}
              />
            )}

            {/* Image message - WhatsApp style */}
            {hasImage ? (
              <div className="relative">
                {/* Image container with rounded corners */}
                <div className="overflow-hidden rounded-lg relative bg-muted/30" style={{ minWidth: '200px', maxWidth: '330px' }}>
                  <div className="relative w-full" style={{ maxHeight: '400px' }}>
                    <ImageWithFallback
                      src={message.attachments[0].url}
                      alt="Shared image"
                      className="block w-full h-auto object-contain"
                      style={{ 
                        borderRadius: '7px',
                        display: 'block',
                        maxHeight: '400px',
                        width: '100%',
                        height: 'auto',
                      }}
                    />
                  </div>
                  
                  {/* Gradient overlay for timestamp visibility */}
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none rounded-b-lg" />
                  
                  {/* Timestamp overlay on image - WhatsApp style */}
                  <div className="absolute bottom-2 right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/20 backdrop-blur-sm">
                    {message.edited_at && (
                      <span className="text-[11px] text-white/95 drop-shadow-md font-normal">
                        edited
                      </span>
                    )}
                    <span className="text-[11px] text-white/95 drop-shadow-md font-normal">
                      {formatTime(message.created_at)}
                    </span>
                    {isSent && (
                      <span className="text-white/95 drop-shadow-md flex items-center">
                        {getMessageStatus()}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Caption below image if exists */}
                {message.body && (
                  <div className="px-3 py-2 pt-2">
                    <div className="message-text-content relative">
                      <div 
                        className="whitespace-pre-wrap break-words text-[15px] leading-[1.4]"
                        style={{
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {linkify(message.body)}
                      </div>
                      
                      {/* Spacer for timestamp positioning */}
                      <div className="inline-block w-[80px] h-0" />
                      
                      {/* Timestamp for caption (only if there's a caption) */}
                      <div className="flex items-center justify-end gap-1 absolute bottom-0 right-0">
                        <span className={`text-[11px] ${
                          isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {formatTime(message.created_at)}
                        </span>
                        {isSent && (
                          <span className={`flex items-center ml-1 ${
                            isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {getMessageStatus()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`${isLongMessage || message.story_reply ? 'px-3 py-2.5' : 'px-3 py-2'}`}>
                {/* Story Reply Preview - WhatsApp Style */}
                {message.story_reply && (
                  <div className="mb-2 -mx-0.5">
                    <StoryReplyPreview 
                      storyReply={message.story_reply} 
                      isOwnMessage={isSent}
                    />
                  </div>
                )}
              
                {/* Voice message */}
                {isVoiceMessage && message.attachments && message.attachments.length > 0 && (
                  <VoiceMessagePlayer
                    audioUrl={message.attachments[0].url}
                    duration={message.attachments[0].duration}
                    isSent={isSent}
                  />
                )}
                
                {/* Text message */}
                {message.body && !isVoiceMessage && (
                  <div className="message-text-content">
                    <div 
                      className={`whitespace-pre-wrap break-words ${
                        isLongMessage ? 'text-[15px] leading-[1.5]' : 'text-[15px] leading-[1.4]'
                      }`}
                      style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {linkify(message.body)}
                    </div>
                    
                    {/* Spacer for timestamp positioning */}
                    <div className="inline-block w-[80px] h-0" />
                  </div>
                )}
                
                {/* Timestamp and status - positioned at bottom right */}
                <div className={`flex items-center justify-end gap-1 ${
                  message.body && !isVoiceMessage ? 'absolute bottom-2 right-3' : 'mt-1'
                }`}>
                  {message.edited_at && (
                    <span className={`text-[11px] mr-1 ${
                      isSent ? 'text-primary-foreground/60' : 'text-muted-foreground/80'
                    }`}>
                      edited
                    </span>
                  )}
                  {showTimestamp && (
                    <span className={`text-[11px] ${
                      isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {formatTime(message.created_at)}
                    </span>
                  )}
                  {isSent && (
                    <span className="flex items-center ml-1 opacity-90">
                      {getMessageStatus()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Reactions display */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 px-3 pb-2 -mt-1">
                {Object.entries(
                  message.reactions.reduce((acc, reaction) => {
                    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([emoji, count]) => (
                  <div
                    key={emoji}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors cursor-pointer ${
                      isSent
                        ? 'bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20'
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                  >
                    <span>{emoji}</span>
                    {count > 1 && <span className="text-xs opacity-70">{count}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
