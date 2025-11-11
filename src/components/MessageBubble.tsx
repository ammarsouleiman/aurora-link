import { useState, useRef, useEffect } from 'react';
import { Check, CheckCheck, Reply, Copy, Trash2, MoreVertical, Clock, AlertCircle } from './ui/icons';
import { Avatar } from './Avatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { StoryReplyPreview } from './StoryReplyPreview';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import type { Message } from '../utils/types';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  currentUserId: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onReply?: (message: Message) => void;
  onReact?: (emoji: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onCopy?: (text: string) => void;
}

export function MessageBubble({
  message,
  isSent,
  showAvatar = true,
  showTimestamp = true,
  currentUserId,
  isFirstInGroup = true,
  isLastInGroup = true,
  onReply,
  onDeleteForMe,
  onDeleteForEveryone,
  onCopy,
}: MessageBubbleProps) {
  const [touchStart, setTouchStart] = useState<number>(0);
  const [touchOffset, setTouchOffset] = useState<number>(0);
  const [showActions, setShowActions] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  // Handle swipe to reply (mobile gesture)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const offset = e.touches[0].clientX - touchStart;
    // Only allow swipe in the reply direction
    if (isSent) {
      // Sent messages: swipe left to reply (negative offset)
      if (offset < 0 && offset > -80) {
        setTouchOffset(offset);
      }
    } else {
      // Received messages: swipe right to reply (positive offset)
      if (offset > 0 && offset < 80) {
        setTouchOffset(offset);
      }
    }
  };

  const handleTouchEnd = () => {
    const threshold = 60;
    if ((isSent && touchOffset < -threshold) || (!isSent && touchOffset > threshold)) {
      onReply?.(message);
    }
    setTouchOffset(0);
  };

  // Handle copy
  const handleCopy = async () => {
    if (message.body) {
      try {
        await navigator.clipboard.writeText(message.body);
        onCopy?.(message.body);
      } catch (error) {
        // Fallback for when clipboard API is blocked
        console.warn('Clipboard API blocked, using fallback method:', error);
        
        // Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = message.body;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
          // Use the older execCommand as fallback
          const successful = document.execCommand('copy');
          if (successful) {
            onCopy?.(message.body);
          } else {
            console.error('Fallback copy failed');
          }
        } catch (err) {
          console.error('Could not copy text:', err);
        }
        
        document.body.removeChild(textarea);
      }
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Check read status - WhatsApp Style Message Receipts
  // ✓ Single gray checkmark = Sent to server
  // ✓✓ Double gray checkmarks = Delivered to recipient's device
  // ✓✓ Double blue checkmarks = Read by recipient
  const isRead = message.statuses?.some(
    (s) => s.user_id !== message.sender_id && s.status === 'read'
  );
  const isDelivered = message.statuses?.some(
    (s) => s.user_id !== message.sender_id && s.status === 'delivered'
  );

  // Deleted message - LIGHT MODE ONLY
  if (message.deleted_for_everyone) {
    return (
      <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} px-2`}>
        {!isSent && showAvatar && (
          <Avatar
            src={message.sender?.avatar_url}
            alt={message.sender?.full_name}
            size="sm"
            className="w-8 h-8 mr-2 self-end"
          />
        )}
        {!isSent && !showAvatar && <div className="w-8 mr-2" />}
        
        <div
          className={`max-w-[65%] px-3 py-2 rounded-lg ${
            isSent
              ? 'bg-[#d9fdd3]'
              : 'bg-white'
          }`}
          style={{
            borderRadius: isSent
              ? isLastInGroup
                ? '7.5px 7.5px 0px 7.5px'
                : '7.5px'
              : isLastInGroup
              ? '7.5px 7.5px 7.5px 0px'
              : '7.5px',
          }}
        >
          <p className="text-[13px] italic text-[#667781]">
            This message was deleted
          </p>
        </div>
      </div>
    );
  }

  // Hidden for user
  if (message.deleted_for_users?.includes(currentUserId)) {
    return null;
  }

  return (
    <div 
      ref={bubbleRef}
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} px-2 group relative`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${touchOffset}px)`,
        transition: touchOffset === 0 ? 'transform 0.2s ease-out' : 'none',
      }}
    >
      {/* Reply indicator on swipe */}
      {touchOffset !== 0 && (
        <div className={`absolute top-1/2 -translate-y-1/2 ${isSent ? 'right-full mr-2' : 'left-full ml-2'}`}>
          <Reply className="w-6 h-6 text-[#00a884]" style={{ opacity: Math.abs(touchOffset) / 60 }} />
        </div>
      )}

      {/* Avatar for received messages */}
      {!isSent && showAvatar && (
        <Avatar
          src={message.sender?.avatar_url}
          alt={message.sender?.full_name}
          size="sm"
          className="w-8 h-8 mr-2 self-end"
        />
      )}
      {!isSent && !showAvatar && <div className="w-8 mr-2" />}

      {/* Message Action Button - LIGHT MODE ONLY */}
      <div className={`absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity ${isSent ? 'left-2' : 'right-2'} z-10`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
              <MoreVertical className="w-4 h-4 text-[#54656f]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isSent ? 'start' : 'end'} className="w-48">
            {onReply && (
              <DropdownMenuItem onClick={() => onReply(message)}>
                <Reply className="w-4 h-4 mr-2" />
                Reply
              </DropdownMenuItem>
            )}
            {message.body && (
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </DropdownMenuItem>
            )}
            {onDeleteForMe && (
              <DropdownMenuItem onClick={() => onDeleteForMe(message.id)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete for me
              </DropdownMenuItem>
            )}
            {onDeleteForEveryone && isSent && (
              <DropdownMenuItem onClick={() => onDeleteForEveryone(message.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete for everyone
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Message Bubble - LIGHT MODE ONLY: WhatsApp green for sent, white for received */}
      <div
        className={`max-w-[65%] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
          isSent
            ? 'bg-[#d9fdd3]'
            : 'bg-white'
        }`}
        style={{
          borderRadius: isSent
            ? isLastInGroup
              ? '7.5px 7.5px 0px 7.5px'
              : '7.5px'
            : isLastInGroup
            ? '7.5px 7.5px 7.5px 0px'
            : '7.5px',
        }}
      >
        {/* Voice Message */}
        {message.type === 'voice' && message.attachments?.[0] && (
          <div className="px-2 py-1.5">
            <VoiceMessagePlayer audioUrl={message.attachments[0].url} />
          </div>
        )}

        {/* Image Message */}
        {message.type === 'image' && message.attachments?.[0] && (
          <div className="relative">
            <ImageWithFallback
              src={message.attachments[0].url}
              alt="Image"
              className="rounded-lg max-w-full h-auto"
              style={{ maxHeight: '400px', minWidth: '200px' }}
            />
            {message.body && (
              <div className="px-2 py-1.5">
                <p className="text-[14.2px] text-[#111b21] break-words whitespace-pre-wrap">
                  {message.body}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Video Message */}
        {message.type === 'video' && message.attachments?.[0] && (
          <div>
            <video
              src={message.attachments[0].url}
              controls
              className="rounded-lg max-w-full"
              style={{ maxHeight: '400px', minWidth: '200px' }}
            />
            {message.body && (
              <div className="px-2 py-1.5">
                <p className="text-[14.2px] text-[#111b21] break-words whitespace-pre-wrap">
                  {message.body}
                </p>
              </div>
            )}
          </div>
        )}

        {/* File Message */}
        {message.type === 'file' && message.attachments?.[0] && (
          <a
            href={message.attachments[0].url}
            download
            className="block px-3 py-2 hover:opacity-80"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2H8z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14.2px] text-[#111b21] truncate">
                  {message.attachments[0].filename}
                </p>
                <p className="text-[12px] text-[#667781]">
                  {(message.attachments[0].size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          </a>
        )}

        {/* Story Reply Preview - WhatsApp Style */}
        {message.type === 'story_reply' && message.story_reply && (
          <div className="mx-[9px] mt-[6px] mb-1">
            <StoryReplyPreview 
              storyReply={message.story_reply} 
              isOwnMessage={isSent}
            />
          </div>
        )}

        {/* Replied-to message preview - LIGHT MODE ONLY */}
        {message.reply_to_message && (
          <div className="mx-[9px] mt-[6px] mb-1 pl-2 pr-1 py-1 border-l-4 border-[#00a884] bg-black/5 rounded">
            <p className="text-[12.5px] text-[#00a884] font-medium mb-0.5">
              {message.reply_to_message.sender?.full_name || 'Unknown'}
            </p>
            <p className="text-[13px] text-[#667781] truncate">
              {message.reply_to_message.type === 'image' ? '📷 Photo' :
               message.reply_to_message.type === 'video' ? '🎥 Video' :
               message.reply_to_message.type === 'voice' ? '🎤 Voice message' :
               message.reply_to_message.type === 'file' ? '📎 File' :
               message.reply_to_message.body || 'Message'}
            </p>
          </div>
        )}

        {/* Text Message (including story replies) */}
        {(message.type === 'text' || message.type === 'story_reply' || !message.type) && message.body && (
          <div className="px-[9px] pt-[6px] pb-[8px]">
            <p
              className="text-[14.2px] text-[#111b21] break-words whitespace-pre-wrap"
              style={{ lineHeight: '19px' }}
            >
              {message.body}
            </p>
            
            {/* Timestamp and WhatsApp-Style Read Receipts */}
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[11px] text-[#667781]">
                {formatTime(message.created_at)}
              </span>
              {isSent && (
                <>
                  {message.pending ? (
                    // Sending: Clock icon
                    <Clock className="w-4 h-4 text-[#667781]" />
                  ) : message.failed ? (
                    // Failed: Red alert icon
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : isRead ? (
                    // Read: Double BLUE checkmarks ✓✓
                    <CheckCheck className="w-4 h-4 text-[#53bdeb]" strokeWidth={2.5} />
                  ) : isDelivered ? (
                    // Delivered: Double GRAY checkmarks ✓✓
                    <CheckCheck className="w-4 h-4 text-[#667781]" strokeWidth={2.5} />
                  ) : (
                    // Sent: Single GRAY checkmark ✓
                    <Check className="w-4 h-4 text-[#667781]" strokeWidth={2.5} />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 px-2 pb-1 flex-wrap">
            {message.reactions.map((reaction, idx) => (
              <div
                key={idx}
                className="bg-white rounded-full px-2 py-0.5 text-xs shadow-sm border border-gray-200"
              >
                <span>{reaction.emoji}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timestamp below bubble (for media messages) */}
      {showTimestamp && (message.type === 'voice' || message.type === 'file') && (
        <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : ''}`}>
          <span className="text-[11px] text-[#667781]">
            {formatTime(message.created_at)}
          </span>
          {isSent && (
            <>
              {message.pending ? (
                <Clock className="w-3.5 h-3.5 text-[#667781]" />
              ) : message.failed ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              ) : isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" strokeWidth={2.5} />
              ) : isDelivered ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#667781]" strokeWidth={2.5} />
              ) : (
                <Check className="w-3.5 h-3.5 text-[#667781]" strokeWidth={2.5} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
