import { User as UserIcon } from './ui/icons';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { User } from '../utils/types';

interface AvatarProps {
  user?: User;
  src?: string;
  alt?: string;
  fallbackText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'away';
  className?: string;
  showBorder?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
  '2xl': 'w-24 h-24',
};

const textSizeClasses = {
  xs: 'text-[8px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

const statusSizeClasses = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
  '2xl': 'w-5 h-5',
};

// Generate beautiful gradient colors based on name
const gradientColors = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-green-500 to-teal-500',
  'from-orange-500 to-red-500',
  'from-indigo-500 to-blue-500',
  'from-pink-500 to-rose-500',
  'from-teal-500 to-green-500',
  'from-amber-500 to-orange-500',
  'from-violet-500 to-purple-500',
  'from-cyan-500 to-blue-500',
];

function getGradientColor(seed?: string): string {
  if (!seed) return gradientColors[0];
  const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradientColors.length;
  return gradientColors[index];
}

function getInitials(name?: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function Avatar({ 
  user,
  src, 
  alt = 'Avatar', 
  fallbackText,
  size = 'md', 
  status, 
  className = '',
  showBorder = true,
  onClick
}: AvatarProps) {
  const statusColors = {
    online: 'bg-success',
    offline: 'bg-muted-foreground',
    away: 'bg-warning',
  };

  // Use user data if provided
  const avatarSrc = user?.avatar_url || src;
  const avatarAlt = user?.full_name || alt;
  const avatarFallbackText = user?.full_name || fallbackText || alt;
  const avatarStatus = user ? (user.is_online ? 'online' : 'offline') : status;

  const initials = getInitials(avatarFallbackText);
  const gradientColor = getGradientColor(avatarFallbackText);

  return (
    <div 
      className={`relative inline-block ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden ${
        showBorder ? 'ring-2 ring-border/20 shadow-md hover:shadow-lg' : 'shadow-sm'
      } transition-all duration-300 hover:ring-primary/40`}>
        {avatarSrc ? (
          <div className="w-full h-full avatar-image-container">
            <ImageWithFallback
              src={avatarSrc}
              alt={avatarAlt}
              className="w-full h-full object-cover object-center"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center',
              }}
              fallback={
                <div className={`w-full h-full bg-gradient-to-br ${gradientColor} flex items-center justify-center`}>
                  <span className={`${textSizeClasses[size]} font-semibold text-white select-none`}>
                    {initials}
                  </span>
                </div>
              }
            />
          </div>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientColor} flex items-center justify-center`}>
            <span className={`${textSizeClasses[size]} font-semibold text-white select-none`}>
              {initials}
            </span>
          </div>
        )}
      </div>
      {avatarStatus && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizeClasses[size]} ${statusColors[avatarStatus]} rounded-full border-3 border-background shadow-lg ${
            avatarStatus === 'online' ? 'animate-pulse' : ''
          }`}
          aria-label={`Status: ${avatarStatus}`}
          style={{
            borderWidth: '3px',
          }}
        />
      )}
    </div>
  );
}
