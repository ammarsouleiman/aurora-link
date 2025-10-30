import { useState, useEffect } from 'react';
import { formatLastSeen, formatLastSeenShort } from '../time';

/**
 * Hook to get real-time formatted last seen text
 * Updates every 10 seconds to show live time
 */
export function useLastSeen(
  lastSeenAt: string | null | undefined,
  isOnline: boolean,
  short: boolean = false
): string {
  const [lastSeenText, setLastSeenText] = useState('');

  useEffect(() => {
    const updateText = () => {
      const formatted = short
        ? formatLastSeenShort(lastSeenAt, isOnline)
        : formatLastSeen(lastSeenAt, isOnline);
      setLastSeenText(formatted);
    };

    // Update immediately
    updateText();

    // Update every 10 seconds for real-time changes
    const interval = setInterval(updateText, 10000);

    return () => clearInterval(interval);
  }, [lastSeenAt, isOnline, short]);

  return lastSeenText;
}
