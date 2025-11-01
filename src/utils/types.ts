// AuroraLink Type Definitions

export interface User {
  id: string;
  full_name: string;
  username: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string; // E.164 format (optional)
  phone_verified?: boolean;
  avatar_url?: string;
  status_message?: string;
  status?: string; // User status/about text
  bio?: string; // User bio/description
  status_updated_at?: string; // When status was last updated
  last_seen?: string;
  is_online: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  blocked_users?: string[]; // IDs of users this user has blocked
}

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  title?: string;
  avatar_url?: string;
  created_by: string;
  last_message_id?: string;
  last_message?: Message;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  unread_count?: number;
  members?: ConversationMember[];
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  user?: User;
  role: 'member' | 'admin';
  muted_until?: string;
  joined_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: User;
  body?: string;
  type: 'text' | 'image' | 'file' | 'voice' | 'system' | 'reaction' | 'location' | 'story_reply' | 'video';
  attachments?: Attachment[];
  reply_to?: string;
  reply_to_message?: Message;
  story_reply?: StoryReplyMetadata; // Metadata for story replies
  edited_at?: string;
  created_at: string;
  statuses?: MessageStatus[];
  reactions?: Reaction[];
  deleted_for_everyone?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  deleted_for_users?: string[]; // Users who deleted this message for themselves
  // Optimistic update fields
  pending?: boolean; // Message is being sent
  failed?: boolean; // Message failed to send
  tempId?: string; // Temporary ID for optimistic messages
}

export interface StoryReplyMetadata {
  story_id: string;
  story_type: 'image' | 'video' | 'text';
  story_preview?: string; // URL for image/video, or text content
  story_background_color?: string; // For text stories
  story_user_id: string;
  story_user_name: string;
}

export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  filename: string;
  size: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface MessageStatus {
  id: string;
  message_id: string;
  user_id: string;
  status: 'sent' | 'delivered' | 'read';
  updated_at: string;
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  user?: User;
  emoji: string;
  created_at: string;
}

export interface PresenceState {
  user_id: string;
  is_online: boolean;
  last_active_at: string;
}

export interface PushToken {
  user_id: string;
  platform: 'ios' | 'android' | 'web';
  token: string;
  created_at: string;
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  user?: User;
}

export interface Call {
  id: string;
  caller_id: string;
  caller?: User;
  recipient_id: string;
  recipient?: User;
  call_type: 'voice' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  started_at: string;
  ended_at?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface CallSignal {
  id: string;
  call_id: string;
  from_user_id: string;
  to_user_id: string;
  signal_type: 'offer' | 'answer' | 'ice-candidate';
  signal_data: any;
  created_at: string;
}

// Story Types (WhatsApp Status)
export interface Story {
  id: string;
  user_id: string;
  user?: User;
  type: 'image' | 'video' | 'text';
  media_url?: string; // For image/video
  text_content?: string; // For text status
  background_color?: string; // For text status
  caption?: string;
  created_at: string;
  expires_at: string;
  views?: StoryView[];
  replies?: StoryReply[];
  view_count?: number;
}

export interface StoryView {
  id: string;
  story_id: string;
  user_id: string;
  user?: User;
  viewed_at: string;
}

export interface StoryReply {
  id: string;
  story_id: string;
  user_id: string;
  user?: User;
  message: string;
  created_at: string;
}

export interface UserStories {
  user: User;
  stories: Story[];
  has_unviewed: boolean;
  latest_story?: Story;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  fromCache?: boolean; // Indicates if data was loaded from offline cache
}

// UI State Types
export type ViewState = 'onboarding' | 'auth' | 'home' | 'conversation' | 'profile' | 'settings' | 'contacts' | 'calls' | 'search' | 'group-create' | 'call' | 'story-view' | 'story-create' | 'profile-view';

export interface AppState {
  currentUser: User | null;
  currentView: ViewState;
  selectedConversation: string | null;
  theme: 'light' | 'dark';
  isLoading: boolean;
}

// Helper function to get a beautiful default avatar
export function getDefaultAvatarUrl(seed?: string): string {
  const avatars = [
    'https://images.unsplash.com/photo-1570170609489-43197f518df0?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1758599543154-76ec1c4257df?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1581065178047-8ee15951ede6?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1672685667592-0392f458f46f?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1549614614-dfc31601c389?w=200&h=200&fit=crop&crop=faces',
  ];
  
  if (!seed) return avatars[0];
  // Use seed to consistently pick an avatar
  const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatars.length;
  return avatars[index];
}
