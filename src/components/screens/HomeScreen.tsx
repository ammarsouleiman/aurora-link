import { useState, useEffect } from 'react';
import { Search, Plus, Settings, Phone, Users, LogOut } from '../ui/icons';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar } from '../Avatar';
import { ConversationCard } from '../ConversationCard';
import { EmptyState } from '../EmptyState';
import { ConversationSkeleton } from '../SkeletonLoader';
import { StoryRing } from '../StoryRing';
import { conversationsApi, storiesApi } from '../../utils/api';
import { createClient } from '../../utils/supabase/direct-api-client';
import { notifyNewMessage } from '../../utils/notifications';
import { toast } from '../../utils/toast';
import { performanceCache } from '../../utils/performance-cache';
import { usePrefetch } from '../../utils/hooks/usePrefetch';
import type { Conversation, User as UserType, UserStories } from '../../utils/types';

interface HomeScreenProps {
  currentUser: UserType;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
  onSettings: () => void;
  onLogout: () => void;
  onViewStory: (userStoriesList: UserStories[], initialIndex: number) => void;
  onCreateStory: () => void;
}

export function HomeScreen({
  currentUser,
  onSelectConversation,
  onNewChat,
  onSettings,
  onLogout,
  onViewStory,
  onCreateStory,
}: HomeScreenProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'chats' | 'calls'>('chats');
  const [stories, setStories] = useState<UserStories[]>([]);
  const [myStories, setMyStories] = useState<UserStories | null>(null);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const { prefetchConversation } = usePrefetch();

  useEffect(() => {
    loadConversations(true);
    loadStories();
    
    // Poll for new conversations every 5 seconds (silently in background)
    const pollInterval = setInterval(() => {
      loadConversations(false);
    }, 5000);

    // Poll for stories every 30 seconds
    const storiesInterval = setInterval(() => {
      loadStories();
    }, 30000);

    // Auto-cleanup expired stories every 5 minutes
    const cleanupInterval = setInterval(async () => {
      console.log('[HomeScreen] Running periodic story cleanup...');
      await storiesApi.cleanup();
      // Reload stories after cleanup
      await loadStories();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => {
      clearInterval(pollInterval);
      clearInterval(storiesInterval);
      clearInterval(cleanupInterval);
    };
  }, []);

  const loadConversations = async (isInitial = false) => {
    // 1. INSTANT: Load from cache first (0ms delay) on initial load
    if (isInitial) {
      const cached = await performanceCache.getAllConversations();
      if (cached.fromCache && cached.conversations.length > 0) {
        // Show cached data IMMEDIATELY
        setConversations(cached.conversations);
        setInitialLoading(false);
        // Continue to background refresh below
      } else {
        // No cache, show loading
        setInitialLoading(true);
      }
    }
    
    // Ensure we have a valid session before making API calls
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.log('[HomeScreen] No valid session available');
      if (isInitial) {
        setInitialLoading(false);
      }
      return;
    }
    
    // 2. BACKGROUND: Fetch fresh data from server
    let result;
    try {
      result = await conversationsApi.list();
    } catch (error) {
      console.error('[HomeScreen] Network error loading conversations:', error);
      if (isInitial) {
        setInitialLoading(false);
      }
      return;
    }
    
    // Handle auth errors
    if (result.requiresReauth) {
      console.log('[HomeScreen] Authentication required - user may need to re-login');
      if (isInitial) {
        setInitialLoading(false);
      }
      return;
    }
    
    if (result.success && result.data?.conversations) {
      const newConversations = result.data.conversations;
      
      // Update cache for next time
      await performanceCache.saveAllConversations(newConversations);
      
      // Check for new messages (only during background polling, not initial load)
      if (!isInitial && conversations.length > 0) {
        for (const newConv of newConversations) {
          const oldConv = conversations.find(c => c.id === newConv.id);
          
          // Check if there's a new last message
          if (oldConv && newConv.last_message) {
            const hasNewMessage = 
              !oldConv.last_message ||
              oldConv.last_message.id !== newConv.last_message.id;
            
            // Only notify if message is from someone else
            const isFromOthers = newConv.last_message.sender_id !== currentUser.id;
            
            if (hasNewMessage && isFromOthers) {
              // Get sender info
              const sender = newConv.members?.find(
                m => m.user_id === newConv.last_message?.sender_id
              )?.user;
              
              const senderName = sender?.full_name || 'Someone';
              const messagePreview = newConv.last_message.body || '📷 Photo';
              
              // Show notification
              notifyNewMessage(
                senderName,
                messagePreview,
                sender?.avatar_url,
                true,
                () => onSelectConversation(newConv.id)
              );
            }
          }
        }
      }
      
      setConversations(newConversations);
    } else if (isInitial) {
      // Only log error on initial load
      console.error('[HomeScreen] Failed to load conversations:', result.error);
    }
    
    if (isInitial) {
      setInitialLoading(false);
    }
  };

  const loadStories = async () => {
    try {
      // Load all stories
      const result = await storiesApi.getAllStories();
      if (result.success && result.data?.stories) {
        console.log('[HomeScreen] 📖 Loaded stories:', result.data.stories.map((s: UserStories) => ({
          user: s.user.full_name,
          count: s.stories.length,
          has_unviewed: s.has_unviewed,
        })));
        setStories(result.data.stories);
      }

      // Load my stories
      const myStoriesResult = await storiesApi.getMyStories();
      if (myStoriesResult.success && myStoriesResult.data?.stories) {
        if (myStoriesResult.data.stories.length > 0) {
          setMyStories({
            user: currentUser,
            stories: myStoriesResult.data.stories,
            has_unviewed: false,
          });
        } else {
          setMyStories(null);
        }
      }
    } catch (error) {
      console.error('[Stories] Error loading stories:', error);
    } finally {
      setStoriesLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    if (conv.type === 'group') {
      return conv.title?.toLowerCase().includes(query);
    }
    
    const otherMember = conv.members?.find(m => m.user_id !== currentUser.id);
    return otherMember?.user?.full_name?.toLowerCase().includes(query);
  });

  return (
    <div className="h-screen-safe flex flex-col bg-background overflow-hidden w-full max-w-full no-overscroll">
      {/* Header - WhatsApp-style Professional */}
      <div className="bg-gradient-to-r from-primary to-accent px-3 py-2.5 shadow-lg shrink-0 pt-safe">
        <div className="flex items-center justify-between w-full">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-white text-lg font-semibold tracking-wide truncate">AuroraLink</h1>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettings}
              className="h-9 w-9 rounded-full hover:bg-white/20 text-white touch-target"
              aria-label="Settings"
            >
              <Settings className="w-[18px] h-[18px]" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="h-9 w-9 rounded-full hover:bg-white/20 text-white touch-target"
              aria-label="Logout"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs - Professional Clean Style */}
      <div className="flex border-b border-border bg-surface shrink-0 w-full">
        <button
          onClick={() => setSelectedTab('chats')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 relative font-medium touch-target transition-all ${
            selectedTab === 'chats'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-[18px] h-[18px]" />
          <span className="text-sm">Chats</span>
          {selectedTab === 'chats' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-accent rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setSelectedTab('calls')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 relative font-medium touch-target transition-all ${
            selectedTab === 'calls'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Phone className="w-[18px] h-[18px]" />
          <span className="text-sm">Calls</span>
          {selectedTab === 'calls' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-accent rounded-t-full" />
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full smooth-scroll">
        {selectedTab === 'chats' ? (
          <>
            {/* Search Bar - WhatsApp Professional Style */}
            <div className="bg-white px-4 py-3 sticky top-0 z-10 shadow-sm">
              <div className="relative w-full">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10 search-icon-modern">
                  <Search className="w-[18px] h-[18px] text-[#54656F]" strokeWidth={2.5} />
                </div>
                <Input
                  type="search"
                  placeholder="Search or start new chat"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[42px] pl-[44px] pr-4 bg-[#F0F2F5] hover:bg-[#E8EAED] focus:bg-white border-0 rounded-[10px] transition-all duration-200 text-[15px] text-[#111B21] placeholder:text-[#667781] focus:ring-2 focus:ring-[#00A884]/20 focus:shadow-md search-input-modern"
                />
              </div>
            </div>

            {/* Stories Section - WhatsApp Position */}
            <div className="bg-background">
              <div className="overflow-x-auto scrollbar-hide smooth-scroll">
                <div className="flex gap-2.5 px-2.5 py-2.5">
                  {/* My Story */}
                  <StoryRing
                    userStories={myStories || undefined}
                    isMyStory={true}
                    currentUser={currentUser}
                    onClick={() => {
                      // Clicking the avatar area
                      if (myStories && myStories.stories.length > 0) {
                        // View my existing stories
                        const allStoriesWithMine = [myStories, ...stories];
                        onViewStory(allStoriesWithMine, 0);
                      } else {
                        // No stories yet, create new one
                        onCreateStory();
                      }
                    }}
                    onAddStory={() => {
                      // Always open composer when clicking the plus button
                      onCreateStory();
                    }}
                  />

                  {/* Others' Stories */}
                  {storiesLoading ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-1 min-w-[62px]">
                          <div className="w-[56px] h-[56px] rounded-full bg-muted animate-pulse" />
                          <div className="w-10 h-2 bg-muted rounded animate-pulse" />
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {stories.map((userStories, index) => (
                        <StoryRing
                          key={userStories.user.id}
                          userStories={userStories}
                          onClick={() => {
                            const allStoriesList = myStories
                              ? [myStories, ...stories]
                              : stories;
                            const actualIndex = myStories ? index + 1 : index;
                            onViewStory(allStoriesList, actualIndex);
                          }}
                        />
                      ))}
                    </>
                  )}

                  {!storiesLoading && stories.length === 0 && !myStories && (
                    <div className="flex-1 flex items-center justify-center py-2">
                      <p className="text-xs text-muted-foreground">
                        No status updates
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {/* Subtle divider - WhatsApp style */}
              <div className="h-[6px] bg-muted/30" />
            </div>

            {/* Conversation List */}
            {initialLoading ? (
              <div className="w-full">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <ConversationSkeleton key={i} />
                ))}
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="w-full">
                {filteredConversations.map((conversation) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    onClick={() => onSelectConversation(conversation.id)}
                    onHover={() => prefetchConversation(conversation.id)}
                    currentUserId={currentUser.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title={searchQuery ? 'No conversations found' : 'No conversations yet'}
                description={searchQuery ? 'Try a different search term' : 'Start a new chat to begin messaging'}
                actionLabel={!searchQuery ? 'New Chat' : undefined}
                onAction={!searchQuery ? onNewChat : undefined}
              />
            )}
          </>
        ) : (
          /* Calls Tab Content */
          <EmptyState
            icon={Phone}
            title="Calls Coming Soon! 🚀"
            description="Voice and video calling feature will be available soon. Stay tuned!"
          />
        )}
      </div>

      {/* FAB - WhatsApp-style Floating Action Button */}
      <Button
        onClick={onNewChat}
        size="lg"
        className="fixed right-5 rounded-full shadow-2xl shadow-primary/30 hover:shadow-primary/40 h-14 w-14 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all hover:scale-105 active:scale-95 touch-target z-[60]"
        style={{
          bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0px) + 80px)',
        }}
        aria-label="New conversation"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
