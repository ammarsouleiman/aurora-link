import { Avatar } from './Avatar';
import { Badge } from './ui/badge';
import { Check, CheckCheck } from './ui/icons';
import type { Conversation } from '../utils/types';

interface ConversationCardProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick?: () => void;
  onHover?: () => void;
  currentUserId?: string;
}

export function ConversationCard({
  conversation,
  isActive = false,
  onClick,
  onHover,
  currentUserId,
}: ConversationCardProps) {
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 24 hours
    if (diff < 86400000) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    
    // Less than a week
    if (diff < 604800000) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    
    // Older
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getConversationTitle = () => {
    if (conversation.type === 'group') {
      return conversation.title || 'Group Chat';
    }
    
    // For DM, show the other user's name
    const otherMember = conversation.members?.find(m => m.user_id !== currentUserId);
    return otherMember?.user?.full_name || 'Unknown';
  };

  const getConversationAvatar = () => {
    if (conversation.type === 'group') {
      return conversation.avatar_url;
    }
    
    const otherMember = conversation.members?.find(m => m.user_id !== currentUserId);
    return otherMember?.user?.avatar_url;
  };

  const getOnlineStatus = () => {
    if (conversation.type === 'group') return undefined;
    
    const otherMember = conversation.members?.find(m => m.user_id !== currentUserId);
    return otherMember?.user?.is_online ? 'online' : 'offline';
  };

  const getMessageReadStatus = () => {
    if (!conversation.last_message) return null;
    
    const isSentByCurrentUser = conversation.last_message.sender_id === currentUserId;
    if (!isSentByCurrentUser) return null;
    
    const hasRead = conversation.last_message.statuses?.some(s => s.status === 'read');
    const hasDelivered = conversation.last_message.statuses?.some(s => s.status === 'delivered');
    
    if (hasRead) {
      return 'read';
    } else if (hasDelivered) {
      return 'delivered';
    }
    
    return 'sent';
  };

  const getMessagePreview = () => {
    if (!conversation.last_message) return 'Tap to start chatting';
    
    const msg = conversation.last_message;
    const isSent = msg.sender_id === currentUserId;
    const prefix = isSent ? '' : '';
    
    if (msg.type === 'story_reply') {
      const storyType = msg.story_reply?.story_type;
      const icon = storyType === 'text' ? '💬' : storyType === 'image' ? '📷' : '🎥';
      if (!isSent) {
        return `${icon} Replied to their status: ${msg.body || ''}`;
      }
      return msg.body || `${icon} Replied to your status`;
    }
    if (msg.type === 'voice') return `${prefix}🎤 Voice message`;
    if (msg.type === 'image') return `${prefix}📷 Photo`;
    if (msg.type === 'file') return `${prefix}📎 File`;
    
    return `${prefix}${msg.body || ''}`;
  };

  const hasUnread = conversation.unread_count && conversation.unread_count > 0;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={`w-full max-w-full flex items-center gap-3 px-3 py-3 transition-all duration-150 text-left border-b border-border/50 hover:bg-[var(--hover-surface)] overflow-hidden active:bg-[var(--hover-muted)] touch-manipulation ${
        isActive ? 'bg-muted' : ''
      }`}
      aria-label={`Conversation with ${getConversationTitle()}`}
    >
      <Avatar
        src={getConversationAvatar()}
        alt={getConversationTitle()}
        fallbackText={getConversationTitle()}
        size="md"
        status={getOnlineStatus()}
        className="shrink-0 w-[52px] h-[52px]"
        showBorder={true}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5 gap-2">
          <h3 className={`truncate text-[15px] leading-tight ${
            hasUnread ? 'font-semibold' : ''
          }`}>
            {getConversationTitle()}
          </h3>
          <span className={`text-xs flex-shrink-0 leading-tight ${
            hasUnread ? 'text-primary' : 'text-muted-foreground'
          }`}>
            {formatTime(conversation.last_message?.created_at || conversation.updated_at)}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {conversation.last_message?.sender_id === currentUserId && (
              <span className="flex-shrink-0 flex items-center">
                {getMessageReadStatus() === 'read' ? (
                  <CheckCheck className="w-[15px] h-[15px] text-[#53bdeb]" />
                ) : getMessageReadStatus() === 'delivered' ? (
                  <CheckCheck className="w-[15px] h-[15px] text-muted-foreground" />
                ) : (
                  <Check className="w-[15px] h-[15px] text-muted-foreground" />
                )}
              </span>
            )}
            <p className={`text-[13.5px] truncate leading-tight ${
              hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
            }`}>
              {getMessagePreview()}
            </p>
          </div>
          
          {hasUnread && (
            <Badge className="bg-primary text-primary-foreground rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center flex-shrink-0 text-[11px] shadow-sm">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
