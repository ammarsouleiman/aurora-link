/**
 * Performance Cache - WhatsApp-level instant loading
 * 
 * Provides lightning-fast data access with smart caching strategies:
 * - Instant cache-first loading (show data immediately)
 * - Background refresh (update cache silently)
 * - Message pagination with infinite scroll
 * - Optimistic UI updates
 * - IndexedDB for large datasets
 */

import type { Conversation, Message } from './types';

// Cache configuration
const CACHE_CONFIG = {
  MESSAGE_PAGE_SIZE: 50, // Load 50 messages at a time
  CONVERSATION_PREVIEW_SIZE: 20, // Show 20 conversations initially
  CACHE_DURATION: {
    MESSAGES: 1000 * 60 * 30, // 30 minutes
    CONVERSATIONS: 1000 * 60 * 15, // 15 minutes
    PROFILES: 1000 * 60 * 60, // 1 hour
  },
  PREFETCH_DELAY: 100, // Prefetch after 100ms of hovering
};

interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface MessageCache {
  messages: Message[];
  hasMore: boolean;
  lastFetchTime: number;
  totalCount?: number;
}

interface ConversationCache {
  conversation: Conversation;
  lastMessagePreview?: Message;
  unreadCount: number;
  lastFetchTime: number;
}

const CACHE_VERSION = '1.0';

/**
 * Performance Cache Manager
 */
class PerformanceCacheManager {
  private memoryCache: Map<string, any> = new Map();
  private prefetchQueue: Set<string> = new Set();
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.initDB();
  }

  /**
   * Initialize IndexedDB for large data storage
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('AuroraLinkCache', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'conversationId' });
        }
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Get data from memory cache (instant)
   */
  private getMemory<T>(key: string): T | null {
    return this.memoryCache.get(key) || null;
  }

  /**
   * Save to memory cache
   */
  private setMemory<T>(key: string, data: T): void {
    this.memoryCache.set(key, data);
  }

  /**
   * Get data from IndexedDB
   */
  private async getDB<T>(storeName: string, key: string): Promise<T | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const cached = request.result as CachedData<T> | undefined;
          if (!cached) {
            resolve(null);
            return;
          }

          // Check version
          if (cached.version !== CACHE_VERSION) {
            resolve(null);
            return;
          }

          resolve(cached.data);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[PerformanceCache] IndexedDB read error:', error);
      return null;
    }
  }

  /**
   * Save to IndexedDB
   */
  private async setDB<T>(storeName: string, key: string, data: T): Promise<void> {
    try {
      const db = await this.initDB();
      const cached: CachedData<T> = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put({ ...cached, [storeName === 'messages' ? 'conversationId' : 'id']: key });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[PerformanceCache] IndexedDB write error:', error);
    }
  }

  /**
   * Get messages with instant cache-first strategy
   */
  async getMessages(conversationId: string, offset: number = 0): Promise<{
    messages: Message[];
    hasMore: boolean;
    fromCache: boolean;
  }> {
    const cacheKey = `messages:${conversationId}`;
    
    // 1. Check memory cache first (instant)
    const memoryCache = this.getMemory<MessageCache>(cacheKey);
    if (memoryCache) {
      const start = offset;
      const end = offset + CACHE_CONFIG.MESSAGE_PAGE_SIZE;
      return {
        messages: memoryCache.messages.slice(start, end),
        hasMore: end < memoryCache.messages.length,
        fromCache: true,
      };
    }

    // 2. Check IndexedDB (fast)
    const dbCache = await this.getDB<MessageCache>('messages', conversationId);
    if (dbCache) {
      // Update memory cache
      this.setMemory(cacheKey, dbCache);
      
      const start = offset;
      const end = offset + CACHE_CONFIG.MESSAGE_PAGE_SIZE;
      return {
        messages: dbCache.messages.slice(start, end),
        hasMore: end < dbCache.messages.length,
        fromCache: true,
      };
    }

    // 3. No cache available
    return {
      messages: [],
      hasMore: false,
      fromCache: false,
    };
  }

  /**
   * Save messages to cache
   */
  async saveMessages(conversationId: string, messages: Message[]): Promise<void> {
    const cacheKey = `messages:${conversationId}`;
    const cache: MessageCache = {
      messages,
      hasMore: false,
      lastFetchTime: Date.now(),
      totalCount: messages.length,
    };

    // Save to both memory and IndexedDB
    this.setMemory(cacheKey, cache);
    await this.setDB('messages', conversationId, cache);
  }

  /**
   * Update messages incrementally (for new messages)
   */
  async updateMessages(conversationId: string, newMessages: Message[]): Promise<void> {
    const cacheKey = `messages:${conversationId}`;
    
    // Get current cache
    let current = this.getMemory<MessageCache>(cacheKey);
    if (!current) {
      current = await this.getDB<MessageCache>('messages', conversationId);
    }

    if (!current) {
      // No existing cache, create new
      await this.saveMessages(conversationId, newMessages);
      return;
    }

    // Merge new messages with existing
    const existingIds = new Set(current.messages.map(m => m.id));
    const messagesToAdd = newMessages.filter(m => !existingIds.has(m.id));
    
    if (messagesToAdd.length > 0) {
      const updated = [...current.messages, ...messagesToAdd].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      await this.saveMessages(conversationId, updated);
    }
  }

  /**
   * Get conversation with cache-first strategy
   */
  async getConversation(conversationId: string): Promise<{
    conversation: Conversation | null;
    fromCache: boolean;
  }> {
    const cacheKey = `conversation:${conversationId}`;
    
    // Memory cache
    const memoryCache = this.getMemory<ConversationCache>(cacheKey);
    if (memoryCache) {
      return {
        conversation: memoryCache.conversation,
        fromCache: true,
      };
    }

    // IndexedDB
    const dbCache = await this.getDB<ConversationCache>('conversations', conversationId);
    if (dbCache) {
      this.setMemory(cacheKey, dbCache);
      return {
        conversation: dbCache.conversation,
        fromCache: true,
      };
    }

    return {
      conversation: null,
      fromCache: false,
    };
  }

  /**
   * Save conversation to cache
   */
  async saveConversation(conversation: Conversation): Promise<void> {
    const cacheKey = `conversation:${conversation.id}`;
    const cache: ConversationCache = {
      conversation,
      unreadCount: 0,
      lastFetchTime: Date.now(),
    };

    this.setMemory(cacheKey, cache);
    await this.setDB('conversations', conversation.id, cache);
  }

  /**
   * Get all conversations (for list view)
   */
  async getAllConversations(): Promise<{
    conversations: Conversation[];
    fromCache: boolean;
  }> {
    const cacheKey = 'all_conversations';
    
    // Memory cache
    const memoryCache = this.getMemory<Conversation[]>(cacheKey);
    if (memoryCache) {
      return {
        conversations: memoryCache,
        fromCache: true,
      };
    }

    // Try to get from localStorage (lighter than IndexedDB for lists)
    try {
      const cached = localStorage.getItem('cache:conversations_list');
      if (cached) {
        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        
        if (age < CACHE_CONFIG.CACHE_DURATION.CONVERSATIONS && data.version === CACHE_VERSION) {
          this.setMemory(cacheKey, data.conversations);
          return {
            conversations: data.conversations,
            fromCache: true,
          };
        }
      }
    } catch (error) {
      console.warn('[PerformanceCache] Failed to read conversations list cache:', error);
    }

    return {
      conversations: [],
      fromCache: false,
    };
  }

  /**
   * Save all conversations
   */
  async saveAllConversations(conversations: Conversation[]): Promise<void> {
    const cacheKey = 'all_conversations';
    
    // Memory cache
    this.setMemory(cacheKey, conversations);
    
    // LocalStorage cache (for instant loading)
    try {
      localStorage.setItem('cache:conversations_list', JSON.stringify({
        conversations,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      }));
    } catch (error) {
      console.warn('[PerformanceCache] Failed to save conversations list:', error);
    }

    // Also save individual conversations to IndexedDB
    conversations.forEach(conv => {
      this.saveConversation(conv);
    });
  }

  /**
   * Prefetch conversation data (for hover/upcoming navigation)
   */
  async prefetchConversation(conversationId: string, fetchFn: () => Promise<any>): Promise<void> {
    // Check if already cached
    const cached = await this.getConversation(conversationId);
    if (cached.conversation) {
      return; // Already cached
    }

    // Check if already in prefetch queue
    if (this.prefetchQueue.has(conversationId)) {
      return;
    }

    // Add to queue and fetch in background
    this.prefetchQueue.add(conversationId);
    
    setTimeout(async () => {
      try {
        const data = await fetchFn();
        if (data) {
          await this.saveConversation(data.conversation);
          await this.saveMessages(conversationId, data.messages || []);
        }
      } catch (error) {
        console.warn('[PerformanceCache] Prefetch failed:', error);
      } finally {
        this.prefetchQueue.delete(conversationId);
      }
    }, CACHE_CONFIG.PREFETCH_DELAY);
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    // Clear memory
    this.memoryCache.clear();
    
    // Clear localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache:')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('[PerformanceCache] Failed to clear localStorage:', error);
    }
    
    // Clear IndexedDB
    try {
      const db = await this.initDB();
      const stores = ['messages', 'conversations', 'profiles'];
      
      stores.forEach(storeName => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();
      });
    } catch (error) {
      console.warn('[PerformanceCache] Failed to clear IndexedDB:', error);
    }
  }

  /**
   * Clear cache for specific conversation
   */
  async clearConversation(conversationId: string): Promise<void> {
    // Clear memory
    this.memoryCache.delete(`messages:${conversationId}`);
    this.memoryCache.delete(`conversation:${conversationId}`);
    
    // Clear IndexedDB
    try {
      const db = await this.initDB();
      
      const messagesTx = db.transaction('messages', 'readwrite');
      messagesTx.objectStore('messages').delete(conversationId);
      
      const convTx = db.transaction('conversations', 'readwrite');
      convTx.objectStore('conversations').delete(conversationId);
    } catch (error) {
      console.warn('[PerformanceCache] Failed to clear conversation cache:', error);
    }
  }
}

// Export singleton instance
export const performanceCache = new PerformanceCacheManager();

// Export config for external use
export { CACHE_CONFIG };
