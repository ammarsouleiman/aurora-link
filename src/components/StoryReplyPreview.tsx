import type { StoryReplyMetadata } from '../utils/types';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface StoryReplyPreviewProps {
  storyReply: StoryReplyMetadata;
  isOwnMessage: boolean;
}

/**
 * WhatsApp-exact Story Reply Preview Component
 * Shows a preview of the story being replied to within a message bubble
 * Matches WhatsApp's exact colors and styling
 */
export function StoryReplyPreview({ storyReply, isOwnMessage }: StoryReplyPreviewProps) {
  return (
    <div 
      className="overflow-hidden rounded-lg border-[#d1d7db]/80 bg-[#f0f2f5] border relative animate-in fade-in slide-in-from-top-1 duration-200"
    >
      {/* Border Accent - WhatsApp Green */}
      <div className="w-1 h-full absolute left-0 top-0 bottom-0 bg-[#00a884]" />
      
      <div className="flex items-center gap-2.5 px-3 py-2.5 pl-4">
        {/* Story Preview Thumbnail */}
        <div className="relative flex-shrink-0">
          {storyReply.story_type === 'text' ? (
            // Text Story Preview
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden shadow-sm"
              style={{
                background: storyReply.story_background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              <p className="text-white text-[10px] font-medium leading-tight text-center px-1.5 line-clamp-3">
                {storyReply.story_preview}
              </p>
            </div>
          ) : storyReply.story_type === 'image' ? (
            // Image Story Preview
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shadow-sm">
              <ImageWithFallback
                src={storyReply.story_preview || ''}
                alt="Story"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            // Video Story Preview
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shadow-sm relative">
              <ImageWithFallback
                src={storyReply.story_preview || ''}
                alt="Story"
                className="w-full h-full object-cover"
              />
              {/* Video Play Icon Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                  <svg className="w-3 h-3 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Story Info - WhatsApp Colors */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <svg 
              className="w-4 h-4 flex-shrink-0 text-[#00a884]" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
            </svg>
            <span className="text-xs font-medium truncate text-[#111b21]">
              {storyReply.story_user_name}'s status
            </span>
          </div>
          <p className="text-[11px] truncate text-[#667781]">
            {storyReply.story_type === 'text' ? (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                Text status
              </span>
            ) : storyReply.story_type === 'image' ? (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Photo
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                Video
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
