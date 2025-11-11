import { useCallback } from 'react';
import { performanceCache } from '../performance-cache';
import { conversationsApi } from '../api';

/**
 * Hook for prefetching conversation data on hover
 */
export function usePrefetch() {
  const prefetchConversation = useCallback((conversationId: string) => {
    performanceCache.prefetchConversation(
      conversationId,
      () => conversationsApi.get(conversationId).then(r => r.data)
    );
  }, []);

  return { prefetchConversation };
}
