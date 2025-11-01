import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Search, Paperclip, Smile, Send, Mic, X, Trash2 } from 'lucide-react';
import { Avatar } from '../Avatar';
import { MessageBubble } from '../MessageBubble';
import { TypingIndicator } from '../TypingIndicator';
import { VoiceRecorder } from '../VoiceRecorder';
import { EmojiPicker } from '../EmojiPicker';
import { ReplyPreview } from '../ReplyPreview';
import { MicrophonePermissionDialog } from '../MicrophonePermissionDialog';
import { MicrophonePermissionDeniedDialog } from '../MicrophonePermissionDeniedDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { toast } from '../../utils/toast';
import { conversationsApi, messagesApi, uploadApi, typingApi } from '../../utils/api';
import { createClient } from '../../utils/supabase/client';
import { useLastSeen } from '../../utils/hooks/useLastSeen';
import type { Conversation, Message, User as UserType } from '../../utils/types';

interface ConversationScreenProps {
  conversationId: string;
  currentUser: UserType;
  onBack: () => void;
  onInitiateCall?: (recipientUser: UserType, callType: 'voice' | 'video') => void;
  onViewProfile?: (user: UserType, lastSeen?: string) => void;
  onDeleteChat?: () => void;
}

// WhatsApp-exact date separator - LIGHT MODE ONLY
function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex justify-center my-3">
      <div className="bg-[#e1f4fb] px-3 py-1 rounded-lg shadow-sm">
        <span className="text-[12.5px] text-[#667781]">{date}</span>
      </div>
    </div>
  );
}

export function ConversationScreen({
  conversationId,
  currentUser,
  onBack,
  onInitiateCall,
  onViewProfile,
  onDeleteChat,
}: ConversationScreenProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMicPermissionDialog, setShowMicPermissionDialog] = useState(false);
  const [showMicPermissionDeniedDialog, setShowMicPermissionDeniedDialog] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const prevMessagesLengthRef = useRef<number>(0);
  const shouldScrollRef = useRef<boolean>(false);
  const isInitialLoadRef = useRef<boolean>(true);

  // Get other user
  const otherUser = useMemo(() => {
    if (conversation?.type === 'dm') {
      return conversation.members?.find(m => m.user_id !== currentUser.id)?.user;
    }
    return null;
  }, [conversation, currentUser.id]);

  const lastSeenText = useLastSeen(
    otherUser?.last_seen,
    otherUser?.is_online || false,
    false
  );

  // Format date separator
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    // Check for invalid date
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString);
      return 'TODAY'; // Fallback to TODAY for invalid dates
    }
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'TODAY';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'YESTERDAY';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      }).toUpperCase();
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];

    messages.forEach((msg) => {
      // Skip messages with invalid dates
      if (!msg.created_at) {
        console.warn('Message missing created_at:', msg);
        return;
      }
      
      const date = new Date(msg.created_at);
      if (isNaN(date.getTime())) {
        console.warn('Message has invalid created_at:', msg.created_at, msg);
        return;
      }
      
      const msgDate = date.toDateString();
      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: formatDate(currentGroup[0].created_at), messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: formatDate(currentGroup[0].created_at), messages: currentGroup });
    }

    return groups;
  }, [messages]);

  useEffect(() => {
    isInitialLoadRef.current = true; // Reset on conversation change
    loadConversation();
    
    // Poll for new messages from other users
    const pollInterval = setInterval(async () => {
      try {
        const result = await conversationsApi.get(conversationId);
        if (result.success && result.data) {
          // Skip if using cached data (no point in updating with stale data)
          if (result.fromCache) {
            return;
          }
          
          const newMessages = result.data.messages || [];
          
          setMessages(prev => {
            // Get all message IDs we currently have (including pending ones)
            const existingIds = new Set(prev.map(m => m.id));
            
            // Find truly new messages (not in our current list)
            const messagesToAdd = newMessages.filter((m: Message) => !existingIds.has(m.id));
            
            if (messagesToAdd.length > 0) {
              // Merge and sort
              const merged = [...prev, ...messagesToAdd].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              
              // Mark new messages as read if from others
              const unreadIds = messagesToAdd
                .filter((m: Message) => m.sender_id !== currentUser.id)
                .map((m: Message) => m.id);
              
              if (unreadIds.length > 0) {
                messagesApi.markAsRead(unreadIds);
              }
              
              return merged;
            }
            
            return prev;
          });
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 2000); // Poll every 2 seconds
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [conversationId, currentUser.id]);

  useEffect(() => {
    // Initial load: always scroll to bottom
    if (isInitialLoadRef.current && messages.length > 0) {
      scrollToBottom();
      isInitialLoadRef.current = false;
      prevMessagesLengthRef.current = messages.length;
      return;
    }
    
    // For subsequent updates, only auto-scroll if:
    // 1. New messages were added (not just a reload)
    // 2. User is already near the bottom OR just sent a message
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const isNearBottom = checkIfNearBottom();
    
    if (isNewMessage && (isNearBottom || shouldScrollRef.current)) {
      scrollToBottom();
    }
    
    prevMessagesLengthRef.current = messages.length;
    shouldScrollRef.current = false;
  }, [messages]);

  const checkIfNearBottom = () => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Consider "near bottom" if within 150px of the bottom
    return scrollHeight - scrollTop - clientHeight < 150;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      setLoading(true);
      const result = await conversationsApi.get(conversationId);
      if (result.success && result.data) {
        setConversation(result.data.conversation);
        setMessages(result.data.messages || []);
        
        // Show indicator if using cached data
        if (result.fromCache) {
          toast.info('Using offline data', {
            description: 'Server is not accessible. Showing cached conversation.',
            duration: 3000,
          });
        }
        
        // Mark as read (only if not from cache)
        if (!result.fromCache) {
          const unreadIds = result.data.messages
            ?.filter((m: Message) => m.sender_id !== currentUser.id)
            .map((m: Message) => m.id) || [];
          if (unreadIds.length > 0) {
            messagesApi.markAsRead(unreadIds);
          }
        }
      } else {
        console.error('Failed to load conversation:', result.error);
        // Only show error if it's not a network error (which would show banner)
        if (!result.error?.includes('Network error')) {
          toast.error('Failed to load conversation');
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Error loading conversation');
    } finally {
      setLoading(false);
    }
  };



  // Check microphone permission
  const checkMicrophonePermission = async () => {
    try {
      if (!navigator.permissions || !navigator.mediaDevices) {
        return false;
      }

      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (result.state === 'granted') {
        setMicPermissionGranted(true);
        return true;
      } else if (result.state === 'prompt') {
        return null; // Permission not yet requested
      } else {
        setMicPermissionGranted(false);
        return false;
      }
    } catch (error) {
      // Fallback if permissions API not supported
      console.log('Permissions API not supported, will request on use');
      return null;
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed to request permission
      stream.getTracks().forEach(track => track.stop());
      setMicPermissionGranted(true);
      setShowMicPermissionDialog(false);
      setIsRecording(true);
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      
      setMicPermissionGranted(false);
      setShowMicPermissionDialog(false);
      
      if (error instanceof Error && error.name === 'NotAllowedError') {
        // Show detailed instructions dialog instead of just a toast
        setShowMicPermissionDeniedDialog(true);
      } else if (error instanceof Error && error.name === 'NotFoundError') {
        toast.error('No microphone found', {
          description: 'Please connect a microphone to record voice messages',
          duration: 5000,
        });
      } else if (error instanceof Error && error.name === 'NotReadableError') {
        toast.error('Microphone is busy', {
          description: 'Your microphone is already in use by another application',
          duration: 5000,
        });
      } else {
        toast.error('Failed to access microphone', {
          description: 'Please check your browser settings and try again',
          duration: 5000,
        });
      }
      
      return false;
    }
  };

  // Handle microphone button click
  const handleMicrophoneClick = async () => {
    // Check if browser supports audio recording
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Voice recording not supported', {
        description: 'Your browser does not support voice recording',
      });
      return;
    }

    // If permission already granted, start recording
    if (micPermissionGranted === true) {
      setIsRecording(true);
      return;
    }

    // Check current permission state
    const permissionState = await checkMicrophonePermission();
    
    if (permissionState === true) {
      // Permission already granted
      setIsRecording(true);
    } else {
      // Show permission dialog
      setShowMicPermissionDialog(true);
    }
  };

  const handleInputChange = (value: string) => {
    setMessage(value);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    if (value.trim()) {
      typingApi.start(conversationId);
      typingTimeoutRef.current = setTimeout(() => {
        typingApi.stop(conversationId);
      }, 2000);
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && attachments.length === 0) || sending) return;

    setSending(true);
    
    // Create optimistic message
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      conversation_id: conversationId,
      sender_id: currentUser.id,
      sender: currentUser,
      body: message.trim(),
      type: attachments.length > 0 ? (attachments[0].type.startsWith('image/') ? 'image' : attachments[0].type.startsWith('video/') ? 'video' : 'file') : 'text',
      created_at: new Date().toISOString(),
      pending: true,
      reply_to: replyToMessage?.id,
      reply_to_message: replyToMessage || undefined,
      statuses: [],
    };

    // Add optimistic message to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Clear input immediately for better UX
    const messageToSend = message.trim();
    const attachmentsToSend = [...attachments];
    const replyToSend = replyToMessage;
    
    setMessage('');
    setAttachments([]);
    setReplyToMessage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    typingApi.stop(conversationId);
    shouldScrollRef.current = true; // Force scroll when user sends
    
    try {
      let attachmentUrls: any[] = [];

      if (attachmentsToSend.length > 0) {
        for (const file of attachmentsToSend) {
          const uploadResult = await uploadApi.uploadFile(file, 'attachment');
          if (uploadResult.success && uploadResult.data) {
            let type: 'image' | 'video' | 'audio' | 'file' = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('audio/')) type = 'audio';
            else if (file.type.startsWith('video/')) type = 'video';

            attachmentUrls.push({
              id: Math.random().toString(36).substr(2, 9),
              url: uploadResult.data.url,
              type,
              filename: file.name,
              size: file.size,
              mime_type: file.type,
            });
          }
        }
      }

      const result = await messagesApi.send(
        conversationId,
        messageToSend || '',
        attachmentUrls.length > 0 ? attachmentUrls[0].type : 'text',
        replyToSend?.id, // reply_to
        attachmentUrls.length > 0 ? attachmentUrls : undefined
      );

      if (result.success && result.data?.message) {
        // Immediately replace optimistic message with server response (no flicker)
        setMessages(prev => prev.map(msg => 
          msg.tempId === tempId ? { ...result.data.message, pending: false } : msg
        ));
      } else {
        // Mark as failed
        setMessages(prev => prev.map(msg => 
          msg.tempId === tempId ? { ...msg, pending: false, failed: true } : msg
        ));
        toast.error('Failed to send message');
      }
    } catch (err) {
      // Mark as failed
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? { ...msg, pending: false, failed: true } : msg
      ));
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleVoiceRecorded = async (audioBlob: Blob) => {
    setSending(true);
    
    // Create optimistic voice message
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      conversation_id: conversationId,
      sender_id: currentUser.id,
      sender: currentUser,
      body: '',
      type: 'voice',
      created_at: new Date().toISOString(),
      pending: true,
      reply_to: replyToMessage?.id,
      reply_to_message: replyToMessage || undefined,
      statuses: [],
      attachments: [{
        id: tempId,
        url: URL.createObjectURL(audioBlob), // Temporary local URL
        type: 'audio',
        filename: 'voice-message.webm',
        size: audioBlob.size,
        mime_type: 'audio/webm',
      }],
    };

    // Add optimistic message to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    const replyToSend = replyToMessage;
    setReplyToMessage(null);
    shouldScrollRef.current = true; // Force scroll when user sends
    
    try {
      const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
      const uploadResult = await uploadApi.uploadFile(file, 'voice');
      
      if (uploadResult.success && uploadResult.data) {
        const result = await messagesApi.send(
          conversationId,
          '',
          'voice',
          replyToSend?.id,
          [{
            id: Math.random().toString(36).substr(2, 9),
            url: uploadResult.data.url,
            type: 'audio',
            filename: 'voice-message.webm',
            size: audioBlob.size,
            mime_type: 'audio/webm',
          }]
        );
        
        if (result.success && result.data?.message) {
          // Immediately replace optimistic message with server response (no flicker)
          setMessages(prev => prev.map(msg => 
            msg.tempId === tempId ? { ...result.data.message, pending: false } : msg
          ));
        } else {
          // Mark as failed
          setMessages(prev => prev.map(msg => 
            msg.tempId === tempId ? { ...msg, pending: false, failed: true } : msg
          ));
          toast.error('Failed to send voice message');
        }
      }
    } catch (err) {
      // Mark as failed
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? { ...msg, pending: false, failed: true } : msg
      ));
      toast.error('Failed to send voice message');
    } finally {
      setSending(false);
      setIsRecording(false);
    }
  };

  // Handle message reply
  const handleReply = (msg: Message) => {
    setReplyToMessage(msg);
    textareaRef.current?.focus();
  };

  // Handle message deletion
  const handleDeleteForMe = async (messageId: string) => {
    const result = await messagesApi.deleteForMe(messageId);
    if (result.success) {
      toast.success('Message deleted');
      // Real-time subscription will handle removing the message
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } else {
      toast.error('Failed to delete message');
    }
  };

  const handleDeleteForEveryone = async (messageId: string) => {
    const result = await messagesApi.deleteForEveryone(messageId);
    if (result.success) {
      toast.success('Message deleted for everyone');
      // Real-time subscription will handle removing the message for all users
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } else {
      toast.error('Failed to delete message');
    }
  };

  // Handle copy message
  const handleCopy = (text: string) => {
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#efeae2]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-[#667781]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#efeae2]">
      {/* WhatsApp Header - LIGHT MODE ONLY */}
      <header className="flex items-center h-[60px] bg-[#f0f2f5] px-4 gap-3 shadow-sm">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-[#54656f]" />
        </button>

        {otherUser && (
          <button
            onClick={() => onViewProfile?.(otherUser, lastSeenText)}
            className="flex items-center gap-3 flex-1 min-w-0 hover:bg-black/5 rounded-lg px-2 py-1.5 -ml-2 transition-colors"
          >
            <Avatar
              src={otherUser.avatar_url}
              alt={otherUser.full_name}
              fallbackText={otherUser.full_name}
              size="md"
              className="w-10 h-10"
              showOnline={otherUser.is_online}
            />
            <div className="flex-1 min-w-0 text-left">
              <div className="font-medium text-[17px] text-[#111b21] truncate">
                {otherUser.full_name}
              </div>
              <div className="text-[13px] text-[#667781] truncate">
                {isTyping ? <span className="text-[#00a884]">typing...</span> : lastSeenText}
              </div>
            </div>
          </button>
        )}

        <div className="flex items-center gap-2">
          {otherUser && onInitiateCall && (
            <>
              <button
                onClick={() => onInitiateCall(otherUser, 'video')}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
              >
                <Video className="w-5 h-5 text-[#54656f]" />
              </button>
              <button
                onClick={() => onInitiateCall(otherUser, 'voice')}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
              >
                <Phone className="w-5 h-5 text-[#54656f]" />
              </button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
                <MoreVertical className="w-5 h-5 text-[#54656f]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onViewProfile && otherUser && (
                <DropdownMenuItem onClick={() => onViewProfile(otherUser, lastSeenText)}>
                  View contact
                </DropdownMenuItem>
              )}
              {onDeleteChat && (
                <DropdownMenuItem onClick={onDeleteChat} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete chat
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages Container - LIGHT MODE ONLY */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-[8%] py-3"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23efeae2\' fill-opacity=\'.1\'/%3E%3Cpath d=\'M50 0L0 50M100 50L50 100\' stroke=\'%23d1d7db\' stroke-width=\'.5\' opacity=\'.05\'/%3E%3C/svg%3E")',
          backgroundSize: '412.5px 749.25px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {groupedMessages.map((group) => (
          <div key={`${group.date}-${group.messages[0]?.id || group.messages[0]?.tempId}`}>
            <DateSeparator date={group.date} />
            {group.messages.map((msg, index) => {
              const isSent = msg.sender_id === currentUser.id;
              const prevMsg = index > 0 ? group.messages[index - 1] : null;
              const nextMsg = index < group.messages.length - 1 ? group.messages[index + 1] : null;

              const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
              const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;

              return (
                <div key={msg.tempId || msg.id} className={isLastInGroup ? 'mb-2' : 'mb-[2px]'}>
                  <MessageBubble
                    message={msg}
                    isSent={isSent}
                    showAvatar={!isSent && isFirstInGroup}
                    showTimestamp={isLastInGroup}
                    currentUserId={currentUser.id}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    onReply={handleReply}
                    onDeleteForMe={handleDeleteForMe}
                    onDeleteForEveryone={isSent ? handleDeleteForEveryone : undefined}
                    onCopy={handleCopy}
                  />
                </div>
              );
            })}
          </div>
        ))}
        
        {isTyping && otherUser && (
          <div className="mb-2">
            <TypingIndicator userName={otherUser.full_name} />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp Input Bar - LIGHT MODE ONLY */}
      <div className="bg-[#f0f2f5] px-4 py-2">
        {/* Reply Preview */}
        {replyToMessage && (
          <div className="mb-2">
            <ReplyPreview
              message={replyToMessage}
              onCancel={() => setReplyToMessage(null)}
            />
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mb-2 p-3 bg-white rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#667781]">
                {attachments.length} file(s) selected
              </span>
              <button
                onClick={() => setAttachments([])}
                className="text-[#667781] hover:text-[#111b21]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Emoji Picker */}
          <EmojiPicker
            onEmojiSelect={(emoji) => {
              setMessage(message + emoji);
              textareaRef.current?.focus();
            }}
            trigger={
              <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
                <Smile className="w-6 h-6 text-[#54656f]" />
              </button>
            }
          />

          {/* Attachment */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          >
            <Paperclip className="w-6 h-6 text-[#54656f]" />
          </button>

          {/* Input Field */}
          <div className="flex-1 bg-white rounded-[21px] px-4 py-2 shadow-sm">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message"
              className="w-full resize-none outline-none bg-transparent text-[15px] text-[#111b21] placeholder:text-[#667781] max-h-[100px]"
              rows={1}
            />
          </div>

          {/* Send or Microphone */}
          {message.trim() || attachments.length > 0 ? (
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#00a884] hover:bg-[#00a884]/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          ) : (
            <button
              onClick={handleMicrophoneClick}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            >
              <Mic className="w-6 h-6 text-[#54656f]" />
            </button>
          )}
        </div>
      </div>

      {/* Voice Recorder */}
      {isRecording && (
        <VoiceRecorder
          onRecorded={handleVoiceRecorded}
          onCancel={() => setIsRecording(false)}
        />
      )}

      {/* Permission Dialogs */}
      <MicrophonePermissionDialog
        open={showMicPermissionDialog}
        onConfirm={requestMicrophonePermission}
        onCancel={() => setShowMicPermissionDialog(false)}
      />

      <MicrophonePermissionDeniedDialog
        open={showMicPermissionDeniedDialog}
        onClose={() => setShowMicPermissionDeniedDialog(false)}
      />
    </div>
  );
}
