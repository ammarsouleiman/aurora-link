import { Plus } from './ui/icons';
import { Avatar } from './Avatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { User, UserStories } from '../utils/types';

interface StoryRingProps {
  userStories?: UserStories;
  isMyStory?: boolean;
  currentUser?: User;
  onClick: () => void;
  onAddStory?: () => void; // Separate handler for the plus button
}

export function StoryRing({ userStories, isMyStory, currentUser, onClick, onAddStory }: StoryRingProps) {
  const hasUnviewed = userStories?.has_unviewed ?? false;
  const user = userStories?.user || currentUser;
  const storiesCount = userStories?.stories.length || 0;
  
  // Get the latest story for thumbnail (WhatsApp shows the most recent story)
  const latestStory = userStories?.stories && userStories.stories.length > 0
    ? userStories.stories[userStories.stories.length - 1]
    : null;

  if (!user) return null;

  // Handle clicks appropriately
  const handleMainClick = () => {
    // For My Story with existing stories, clicking the avatar area should view stories
    // For My Story without stories, or if onAddStory is not provided, use onClick
    if (isMyStory && storiesCount > 0 && onAddStory) {
      onClick(); // View my existing stories
    } else {
      onClick(); // Default behavior
    }
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the main click
    if (onAddStory) {
      onAddStory(); // Add new story
    } else {
      onClick(); // Fallback to default
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 min-w-[68px] group">
      {/* Story Ring Container - Changed to div to avoid nested buttons */}
      <div
        className="relative cursor-pointer active:scale-95 transition-transform duration-100"
      >
        {/* Animated Gradient Ring for Unviewed Stories - WhatsApp Exact Colors */}
        {hasUnviewed && !isMyStory && (
          <div className="absolute inset-0 rounded-full p-[2px] pointer-events-none">
            <div 
              className="w-full h-full rounded-full story-ring-gradient" 
              style={{ 
                background: 'linear-gradient(135deg, var(--story-ring-unviewed-start), var(--story-ring-unviewed-mid), var(--story-ring-unviewed-end))',
                backgroundSize: '200% 200%',
              }}
            >
              <div className="w-full h-full rounded-full bg-background scale-[0.93]" />
            </div>
          </div>
        )}
        
        {/* Gray Border for Viewed Stories - WhatsApp Style */}
        {!hasUnviewed && !isMyStory && storiesCount > 0 && (
          <div 
            className="absolute inset-0 rounded-full border-[2px] pointer-events-none" 
            style={{ borderColor: 'var(--story-ring-viewed)' }}
          />
        )}

        {/* My Story Ring - WhatsApp Green */}
        {isMyStory && storiesCount > 0 && (
          <div 
            className="absolute inset-0 rounded-full border-[2px] pointer-events-none" 
            style={{ borderColor: 'var(--story-ring-my-story)' }}
          />
        )}

        {/* Clickable overlay for the main click area */}
        <button
          onClick={handleMainClick}
          className="absolute inset-0 rounded-full w-full h-full z-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label={isMyStory ? 'View my status' : `View ${user.full_name}'s status`}
        />

        {/* Story Preview Container - WhatsApp Style */}
        <div className={`relative rounded-full ${
          (hasUnviewed && !isMyStory) || (isMyStory && storiesCount > 0) || (!hasUnviewed && !isMyStory && storiesCount > 0)
            ? 'p-[3px]' 
            : 'p-0'
        } bg-background pointer-events-none`}>
          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex items-center justify-center">
            {latestStory && storiesCount > 0 ? (
              // Show latest story thumbnail (WhatsApp behavior)
              <>
                {latestStory.type === 'image' && latestStory.media_url && (
                  <ImageWithFallback
                    src={latestStory.media_url}
                    alt="Story"
                    className="w-full h-full object-cover object-center"
                  />
                )}
                
                {latestStory.type === 'video' && latestStory.media_url && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <ImageWithFallback
                      src={latestStory.media_url}
                      alt="Story"
                      className="w-full h-full object-cover object-center"
                    />
                    {/* Video indicator overlay */}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                
                {latestStory.type === 'text' && (
                  <div 
                    className="w-full h-full flex items-center justify-center p-2"
                    style={{
                      background: latestStory.background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    <p className="text-white text-[8px] font-medium text-center leading-tight line-clamp-4">
                      {latestStory.text_content}
                    </p>
                  </div>
                )}
              </>
            ) : (
              // Show avatar if no stories or for "Add Story" button
              <Avatar
                user={user}
                size="md"
                className="w-full h-full"
                showBorder={false}
              />
            )}
          </div>
          
          {/* Add Story Plus Button - WhatsApp Style (for My Story, always visible) */}
          {isMyStory && (
            <button
              onClick={handlePlusClick}
              className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-[2.5px] border-background shadow-sm hover:bg-primary/90 transition-colors z-10 pointer-events-auto focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 active:scale-90 transition-transform duration-100"
              aria-label="Add status"
            >
              <Plus className="w-[14px] h-[14px] text-white" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* User Name - WhatsApp Style */}
      <div className="flex flex-col items-center gap-0 max-w-[68px]">
        <span className="text-[11px] text-center truncate transition-colors w-full leading-tight" 
              style={{
                color: 'var(--text-secondary)',
              }}>
          {isMyStory ? 'My status' : user.full_name}
        </span>
      </div>
    </div>
  );
}
