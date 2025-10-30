/**
 * Time formatting utilities for last seen and timestamps
 * WhatsApp-style real-time formatting
 */

/**
 * Format last seen time in WhatsApp style
 * - "online" for currently online users
 * - "last seen just now" for less than 1 minute
 * - "last seen X minutes ago" for less than 1 hour
 * - "last seen today at HH:MM" for today
 * - "last seen yesterday at HH:MM" for yesterday
 * - "last seen on DD/MM/YYYY at HH:MM" for older dates
 */
export function formatLastSeen(lastSeenAt: string | null | undefined, isOnline: boolean): string {
  // If user is online, show "online"
  if (isOnline) {
    return 'online';
  }

  // If no last seen time, show "offline"
  if (!lastSeenAt) {
    return 'offline';
  }

  const now = new Date();
  const lastSeen = new Date(lastSeenAt);
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Format time as HH:MM
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Just now (less than 1 minute)
  if (diffMinutes < 1) {
    return 'last seen just now';
  }

  // X minutes ago (less than 1 hour)
  if (diffMinutes < 60) {
    return `last seen ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  // Today
  if (diffDays === 0) {
    return `last seen today at ${formatTime(lastSeen)}`;
  }

  // Yesterday
  if (diffDays === 1) {
    return `last seen yesterday at ${formatTime(lastSeen)}`;
  }

  // Within a week - show day name
  if (diffDays < 7) {
    const dayName = lastSeen.toLocaleDateString('en-US', { weekday: 'long' });
    return `last seen ${dayName} at ${formatTime(lastSeen)}`;
  }

  // Older - show date
  const dateStr = lastSeen.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== lastSeen.getFullYear() ? 'numeric' : undefined,
  });
  return `last seen ${dateStr} at ${formatTime(lastSeen)}`;
}

/**
 * Get a short version of last seen for conversation cards
 * - "online" for online users
 * - "X min ago" for recent
 * - "today" for today
 * - "yesterday" for yesterday
 * - date for older
 */
export function formatLastSeenShort(lastSeenAt: string | null | undefined, isOnline: boolean): string {
  if (isOnline) {
    return 'online';
  }

  if (!lastSeenAt) {
    return '';
  }

  const now = new Date();
  const lastSeen = new Date(lastSeenAt);
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffDays === 0) {
    return 'today';
  }

  if (diffDays === 1) {
    return 'yesterday';
  }

  if (diffDays < 7) {
    return lastSeen.toLocaleDateString('en-US', { weekday: 'short' });
  }

  return lastSeen.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format message timestamp
 * - "Just now" for less than 1 minute
 * - "HH:MM" for today
 * - "Yesterday HH:MM" for yesterday
 * - "Day HH:MM" for this week
 * - "DD/MM/YYYY HH:MM" for older
 */
export function formatMessageTime(timestamp: string): string {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffMs = now.getTime() - messageTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffDays === 0) {
    return formatTime(messageTime);
  }

  if (diffDays === 1) {
    return `Yesterday ${formatTime(messageTime)}`;
  }

  if (diffDays < 7) {
    const dayName = messageTime.toLocaleDateString('en-US', { weekday: 'short' });
    return `${dayName} ${formatTime(messageTime)}`;
  }

  const dateStr = messageTime.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  return `${dateStr} ${formatTime(messageTime)}`;
}
