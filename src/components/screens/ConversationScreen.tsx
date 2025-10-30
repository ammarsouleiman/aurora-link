import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, AlertCircle, Trash2, Ban, UserX } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar } from '../Avatar';
import { MessageBubble } from '../MessageBubble';
import { MessageComposer } from '../MessageComposer';
import { TypingIndicator } from '../TypingIndicator';
import { EmptyState } from '../EmptyState';
import { MessageSkeleton } from '../SkeletonLoader';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { toast } from '../../utils/toast';
import { conversationsApi, messagesApi, uploadApi, typingApi, blockApi } from '../../utils/api';
import { playNotificationSound } from '../../utils/notifications';
import { createClient } from '../../utils/supabase/client';
import { useLastSeen } from '../../utils/hooks/useLastSeen';
import type { Conversation, Message, User as UserType } from '../../utils/types';

interface ConversationScreenProps {
  conversationId: string;
  currentUser: UserType;
  onBack: () => void;
  onInitiateCall?: (recipientUser: UserType, callType: 'voice' | 'video') => void;
  onViewProfile?: (user: UserType, lastSeen?: string) => void;
}

export function ConversationScreen({
  conversationId,
  currentUser,
  onBack,
  onInitiateCall,
  onViewProfile,
}: ConversationScreenProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedBy, setBlockedBy] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const lastMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);

  // Get other user for DM conversations
  const otherUser = useMemo(() => {
    if (conversation?.type === 'dm') {
      return conversation.members?.find(m => m.user_id !== currentUser.id)?.user;
    }
    return null;
  }, [conversation, currentUser.id]);

  // Real-time last seen text that updates every 10 seconds
  const lastSeenText = useLastSeen(
    otherUser?.last_seen,
    otherUser?.is_online || false,
    false
  );

  useEffect(() => {
    loadConversation(true);
    lastMessageCountRef.current = 0;
    shouldAutoScrollRef.current = true;
    
    // Set up polling for new messages every 3 seconds (silently in background)
    const pollInterval = setInterval(() => {
      loadMessages();
    }, 3000);
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [conversationId]);

  // Handle scroll events to detect user manual scrolling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      // If user scrolls up, disable auto-scroll
      if (!isAtBottom) {
        shouldAutoScrollRef.current = false;
        isUserScrollingRef.current = true;
      } else {
        // User scrolled back to bottom, enable auto-scroll again
        shouldAutoScrollRef.current = true;
        isUserScrollingRef.current = false;
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Smart auto-scroll: only scroll when appropriate
  useEffect(() => {
    if (messages.length === 0) return;

    const hasNewMessages = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    // Auto-scroll conditions:
    // 1. Initial load (shouldAutoScrollRef is true by default)
    // 2. User sent a message (always scroll)
    // 3. New message arrived AND user is at bottom
    if (hasNewMessages) {
      const latestMessage = messages[messages.length - 1];
      const isMyMessage = latestMessage?.sender_id === currentUser.id;

      // Always scroll if it's my message
      if (isMyMessage) {
        scrollToBottom();
        shouldAutoScrollRef.current = true;
      } 
      // Scroll if user is at bottom (hasn't scrolled up)
      else if (shouldAutoScrollRef.current) {
        scrollToBottom();
      }
    }
    // If no new messages (just updates like read receipts), don't scroll
  }, [messages, currentUser.id]);

  const loadConversation = async (isInitial = false, retryCount = 0) => {
    // Only show loading state on initial load
    if (isInitial) {
      setInitialLoading(true);
      setError('');
    }
    
    // First verify we have a valid session
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.access_token) {
      console.error('[ConversationScreen] No valid session available!');
      console.error('[ConversationScreen] Has session:', !!session);
      console.error('[ConversationScreen] Has token:', !!session?.access_token);
      setError('Session expired. Please log out and log back in.');
      setInitialLoading(false);
      return;
    }
    
    console.log('[ConversationScreen] Session verified, loading conversation...');
    console.log('[ConversationScreen] Token preview:', session.access_token.substring(0, 30) + '...');
    
    const result = await conversationsApi.get(conversationId);
    
    if (result.success && result.data) {
      setConversation(result.data.conversation);
      setMessages(result.data.messages || []);
      
      // Mark all messages as read on initial load
      if (isInitial && result.data.messages) {
        const unreadMessageIds = result.data.messages
          .filter((msg: any) => msg.sender_id !== currentUser.id)
          .filter((msg: any) => {
            const readStatus = msg.statuses?.find(
              (s: any) => s.user_id === currentUser.id && s.status === 'read'
            );
            return !readStatus;
          })
          .map((msg: any) => msg.id);
        
        if (unreadMessageIds.length > 0) {
          // Mark as read without waiting
          messagesApi.markAsRead(unreadMessageIds);
        }
        
        // Scroll to bottom on initial load after a brief delay
        setTimeout(scrollToBottom, 100);
      }
    } else {
      if (isInitial) {
        console.error('[ConversationScreen] Failed to load conversation:', result.error);
        
        // Check if it's an auth error
        if (result.error?.includes('Authentication') || result.error?.includes('Unauthorized')) {
          setError('Session expired. Please log out and log back in.');
          toast.error('Session Expired', {
            description: 'Please log out and log back in to continue.',
          });
          return;
        }
        
        // Retry logic for network errors
        if (retryCount < 2 && result.error?.includes('Network')) {
          console.log(`[ConversationScreen] Retrying... (attempt ${retryCount + 1})`);
          setTimeout(() => loadConversation(true, retryCount + 1), 1000);
          return;
        }
        
        setError(result.error || 'Failed to load conversation');
      }
    }
    
    if (isInitial) {
      setInitialLoading(false);
    }
  };
  
  const loadMessages = async () => {
    // Silently load new messages without showing loading state
    try {
      const result = await conversationsApi.get(conversationId);
      
      if (result.success && result.data) {
        const oldLength = messages.length;
        const newMessages = result.data.messages || [];
        
        // Check if there are new messages from others
        if (newMessages.length > oldLength) {
          const newestMessage = newMessages[newMessages.length - 1];
          
          // Mark the new message as read immediately since conversation is open
          // No sound notification when receiving messages in open conversation
          if (newestMessage.sender_id !== currentUser.id) {
            await messagesApi.markAsRead([newestMessage.id]);
          }
        }
        
        // Only update if there are changes to avoid unnecessary rerenders
        if (newMessages.length !== oldLength || 
            JSON.stringify(newMessages) !== JSON.stringify(messages)) {
          setMessages(newMessages);
        }
      }
    } catch (error) {
      // Silently fail - don't disrupt user experience with polling errors
      console.error('Failed to poll messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    shouldAutoScrollRef.current = true;
    isUserScrollingRef.current = false;
  };

  const handleSendMessage = async (body: string, attachments?: File[]) => {
    if ((!body.trim() && !attachments?.length) || sending) return;

    setSending(true);
    setError('');

    try {
      let attachmentUrls: any[] = [];

      // Upload attachments if any
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const uploadResult = await uploadApi.uploadFile(file, 'attachment');
          
          if (uploadResult.success && uploadResult.data) {
            // Determine attachment type
            let attachmentType: 'image' | 'video' | 'audio' | 'file' = 'file';
            if (file.type.startsWith('image/')) {
              attachmentType = 'image';
            } else if (file.type.startsWith('audio/')) {
              attachmentType = 'audio';
            } else if (file.type.startsWith('video/')) {
              attachmentType = 'video';
            }

            attachmentUrls.push({
              id: Math.random().toString(36).substr(2, 9),
              url: uploadResult.data.url,
              type: attachmentType,
              filename: file.name,
              size: file.size,
              mime_type: file.type,
            });
          }
        }
      }

      // Determine message type
      const messageType = attachmentUrls.some((a: any) => a.type === 'image')
        ? 'image'
        : attachmentUrls.some((a: any) => a.type === 'audio')
        ? 'voice'
        : attachmentUrls.length > 0
        ? 'file'
        : 'text';

      // Send message with attachments
      const result = await messagesApi.send(
        conversationId,
        body,
        messageType,
        replyTo?.id,
        attachmentUrls
      );

      if (result.success && result.data?.message) {
        // Message already includes attachments from backend
        const newMessage = result.data.message;
        
        setMessages([...messages, newMessage]);
        setReplyTo(null);
        
        // Play sound when user sends a message
        playNotificationSound();
        
        // Show success toast (optional, can be removed if too noisy)
        // toast.success('Message sent');
      } else {
        setError(result.error || 'Failed to send message');
        toast.error('Failed to send message', {
          description: result.error || 'Please try again',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = async (isTyping: boolean) => {
    if (isTyping) {
      await typingApi.start(conversationId);
    } else {
      await typingApi.stop(conversationId);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    // Optimistically update UI
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        // Check if user already reacted with this emoji
        const existingReaction = reactions.find(
          r => r.user_id === currentUser.id && r.emoji === emoji
        );
        
        if (existingReaction) {
          // Remove reaction (not implemented yet in backend)
          return {
            ...msg,
            reactions: reactions.filter(r => r.id !== existingReaction.id),
          };
        } else {
          // Add reaction
          return {
            ...msg,
            reactions: [
              ...reactions,
              {
                id: Math.random().toString(36).substr(2, 9),
                message_id: messageId,
                user_id: currentUser.id,
                emoji,
                created_at: new Date().toISOString(),
              },
            ],
          };
        }
      }
      return msg;
    }));

    // Send reaction to backend
    const result = await messagesApi.react(messageId, emoji);
    if (!result.success) {
      console.error('Failed to add reaction:', result.error);
      // Revert optimistic update on failure
      await loadMessages();
    }
  };

  const getConversationTitle = () => {
    if (!conversation) return '';
    
    if (conversation.type === 'group') {
      return conversation.title || 'Group Chat';
    }
    
    const otherMember = conversation.members?.find(m => m.user_id !== currentUser.id);
    return otherMember?.user?.full_name || 'Unknown';
  };

  const getConversationAvatar = () => {
    if (!conversation) return undefined;
    
    if (conversation.type === 'group') {
      return conversation.avatar_url;
    }
    
    const otherMember = conversation.members?.find(m => m.user_id !== currentUser.id);
    return otherMember?.user?.avatar_url;
  };

  const getOnlineStatus = () => {
    if (!conversation || conversation.type === 'group') return undefined;
    
    const otherMember = conversation.members?.find(m => m.user_id !== currentUser.id);
    return otherMember?.user?.is_online ? 'online' : 'offline';
  };
  
  const getOtherUserId = () => {
    if (!conversation || conversation.type === 'group') return null;
    const otherMember = conversation.members?.find(m => m.user_id !== currentUser.id);
    return otherMember?.user_id || null;
  };

  const handleBlockUser = async () => {
    const userId = getOtherUserId();
    if (!userId) return;
    
    const result = await blockApi.block(userId);
    if (result.success) {
      setIsBlocked(true);
      setShowBlockDialog(false);
      toast.success('User blocked', {
        description: 'You won\'t receive messages from this contact',
      });
    } else {
      toast.error('Failed to block user', {
        description: result.error || 'Please try again',
      });
    }
  };

  const handleUnblockUser = async () => {
    const userId = getOtherUserId();
    if (!userId) return;
    
    const result = await blockApi.unblock(userId);
    if (result.success) {
      setIsBlocked(false);
      setShowUnblockDialog(false);
      toast.success('User unblocked', {
        description: 'You can now receive messages from this contact',
      });
    } else {
      toast.error('Failed to unblock user', {
        description: result.error || 'Please try again',
      });
    }
  };

  const handleDeleteConversation = async () => {
    const result = await conversationsApi.delete(conversationId);
    if (result.success) {
      setShowDeleteDialog(false);
      toast.success('Conversation deleted');
      onBack();
    } else {
      toast.error('Failed to delete conversation', {
        description: result.error || 'Please try again',
      });
    }
  };

  const handleInitiateCall = (callType: 'voice' | 'video') => {
    if (!conversation || conversation.type !== 'dm') {
      toast.error('Calls are only available for direct messages');
      return;
    }

    const otherMember = conversation.members?.find(m => m.user_id !== currentUser.id);
    if (!otherMember?.user) {
      toast.error('Unable to initiate call');
      return;
    }

    onInitiateCall?.(otherMember.user, callType);
  };

  const handleDeleteMessageForMe = async (messageId: string) => {
    const result = await messagesApi.deleteForMe(messageId);
    if (result.success) {
      setMessages(messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, deleted_for_users: [...(msg.deleted_for_users || []), currentUser.id] }
          : msg
      ));
      toast.success('Message deleted');
    } else {
      toast.error('Failed to delete message', {
        description: result.error || 'Please try again',
      });
    }
  };

  const handleDeleteMessageForEveryone = async (messageId: string) => {
    const result = await messagesApi.deleteForEveryone(messageId);
    if (result.success) {
      setMessages(messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, deleted_for_everyone: true, deleted_at: new Date().toISOString() }
          : msg
      ));
      toast.success('Message deleted for everyone');
    } else {
      toast.error('Failed to delete message', {
        description: result.error || 'Please try again',
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header - WhatsApp Style */}
      <div className="bg-surface border-b border-border px-2 sm:px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
        {!conversation || initialLoading ? (
          /* Loading skeleton for header */
          <>
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-10 w-10 rounded-full hover:bg-[var(--hover-surface)] shrink-0 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              {/* Skeleton avatar */}
              <div className="w-14 h-14 rounded-full bg-muted animate-pulse shrink-0" />
              
              {/* Skeleton text */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                <div className="h-3 bg-muted rounded w-20 animate-pulse" />
              </div>
            </div>
            
            {/* Skeleton buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            </div>
          </>
        ) : (
          /* Actual header content */
          <>
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-10 w-10 rounded-full hover:bg-[var(--hover-surface)] shrink-0 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <Avatar
                src={getConversationAvatar()}
                alt={getConversationTitle()}
                fallbackText={getConversationTitle()}
                size="lg"
                status={getOnlineStatus()}
                className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                showBorder={true}
                onClick={() => {
                  if (otherUser && onViewProfile) {
                    onViewProfile(otherUser, lastSeenText);
                  }
                }}
              />
              
              <div 
                className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => {
                  if (otherUser && onViewProfile) {
                    onViewProfile(otherUser, lastSeenText);
                  }
                }}
              >
                <h3 className="truncate leading-tight">{getConversationTitle()}</h3>
                <p className="text-xs text-muted-foreground leading-tight">
                  {lastSeenText || (getOnlineStatus() === 'online' ? 'online' : 'offline')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleInitiateCall('video')}
                className="h-10 w-10 rounded-full hover:bg-[var(--hover-surface)] transition-colors"
                aria-label="Video call"
              >
                <Video className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleInitiateCall('voice')}
                className="h-10 w-10 rounded-full hover:bg-[var(--hover-surface)] transition-colors"
                aria-label="Voice call"
              >
                <Phone className="w-5 h-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-[var(--hover-surface)] transition-colors"
                    aria-label="More options"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {conversation?.type === 'dm' && (
                    <>
                      {isBlocked ? (
                        <DropdownMenuItem onClick={() => setShowUnblockDialog(true)}>
                          <UserX className="w-4 h-4 mr-2" />
                          Unblock contact
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="text-destructive">
                          <Ban className="w-4 h-4 mr-2" />
                          Block contact
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 md:px-12 lg:px-20 py-4 chat-background"
      >
        {/* Blocked Banner */}
        {isBlocked && (
          <Alert className="mb-4 bg-warning/10 border-warning">
            <Ban className="h-4 w-4 text-warning" />
            <AlertDescription>
              You blocked this contact. You won't receive messages from them.{' '}
              <button 
                onClick={() => setShowUnblockDialog(true)}
                className="underline hover:no-underline"
              >
                Unblock
              </button>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col gap-3">
                <span>{error}</span>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => loadConversation(true)}
                    className="shrink-0"
                  >
                    Retry
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={async () => {
                      const supabase = createClient();
                      const { data: { session } } = await supabase.auth.getSession();
                      console.log('[Debug] Current session:', {
                        has_session: !!session,
                        user_id: session?.user?.id,
                        has_token: !!session?.access_token,
                        expires_at: session?.expires_at,
                      });
                      if (session?.access_token) {
                        console.log('[Debug] Token preview:', session.access_token.substring(0, 30) + '...');
                      }
                    }}
                    className="shrink-0"
                  >
                    Debug Auth
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {initialLoading ? (
          <div>
            {[1, 2, 3, 4].map((i) => (
              <MessageSkeleton key={i} isSent={i % 2 === 0} />
            ))}
          </div>
        ) : messages.length > 0 ? (
          <div>
            {messages.map((message, index) => {
              const isSent = message.sender_id === currentUser.id;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
              
              // Check if this is the start of a new message group
              const isNewGroup = !prevMessage || 
                prevMessage.sender_id !== message.sender_id ||
                (new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime()) > 300000; // 5 minutes
              
              // Check if this is the last message in a group
              const isLastInGroup = !nextMessage || 
                nextMessage.sender_id !== message.sender_id ||
                (new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime()) > 300000;
              
              // Check if we need a date separator
              const showDateSeparator = index === 0 || 
                new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString();
              
              const formatDateSeparator = (dateString: string) => {
                const date = new Date(dateString);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (date.toDateString() === today.toDateString()) {
                  return 'Today';
                } else if (date.toDateString() === yesterday.toDateString()) {
                  return 'Yesterday';
                } else {
                  return date.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
                  });
                }
              };

              return (
                <div key={message.id}>
                  {/* Date separator */}
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-surface/80 backdrop-blur-sm text-muted-foreground text-xs px-3 py-1.5 rounded-lg shadow-sm">
                        {formatDateSeparator(message.created_at)}
                      </div>
                    </div>
                  )}
                  
                  {/* Message bubble with proper grouping */}
                  <div className={isLastInGroup ? 'mb-3' : 'mb-0.5'}>
                    <MessageBubble
                      message={message}
                      isSent={isSent}
                      showAvatar={!isSent && isLastInGroup}
                      showTimestamp={isLastInGroup}
                      onReply={() => setReplyTo(message)}
                      onReact={(emoji) => handleReact(message.id, emoji)}
                      onDeleteForMe={() => handleDeleteMessageForMe(message.id)}
                      onDeleteForEveryone={() => handleDeleteMessageForEveryone(message.id)}
                      currentUserId={currentUser.id}
                    />
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator - placeholder */}
            {/* <TypingIndicator userName="John Doe" /> */}
            
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <EmptyState
            icon={AlertCircle}
            title="No messages yet"
            description="Start the conversation by sending a message"
          />
        )}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="bg-muted px-4 py-2 flex items-center justify-between border-t border-border">
          <div className="flex-1 min-w-0">
            <p className="text-sm">Replying to {replyTo.sender?.full_name}</p>
            <p className="text-sm text-muted-foreground truncate">{replyTo.body}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setReplyTo(null)}
            aria-label="Cancel reply"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Composer */}
      <MessageComposer
        onSend={handleSendMessage}
        onTyping={handleTyping}
        disabled={sending}
      />

      {/* Delete Conversation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This conversation will be deleted from your chats. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block User Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {getConversationTitle()}?</AlertDialogTitle>
            <AlertDialogDescription>
              Blocked contacts will no longer be able to send you messages. They won't be notified that you blocked them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockUser} className="bg-destructive hover:bg-destructive/90">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unblock User Dialog */}
      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {getConversationTitle()}?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be able to receive messages from this contact again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblockUser}>
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
