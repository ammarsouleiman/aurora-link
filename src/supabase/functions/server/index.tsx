import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';
import { addFollowRoutes } from './follow-routes.tsx';

const app = new Hono();

// Helper function to wrap KV operations with error handling and retry logic
async function safeKvGet(key: string, defaultValue: any = null, retries = 2): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await kv.get(key);
      return result !== undefined ? result : defaultValue;
    } catch (error) {
      console.error(`KV get error (attempt ${i + 1}/${retries + 1}) for key "${key}":`, error);
      if (i === retries) {
        // Last attempt failed, return default
        return defaultValue;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
  return defaultValue;
}

async function safeKvGetByPrefix(prefix: string, defaultValue: any[] = [], retries = 2): Promise<any[]> {
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await kv.getByPrefix(prefix);
      return result || defaultValue;
    } catch (error) {
      console.error(`KV getByPrefix error (attempt ${i + 1}/${retries + 1}) for prefix "${prefix}":`, error);
      if (i === retries) {
        // Last attempt failed, return default
        return defaultValue;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
  return defaultValue;
}

async function safeKvSet(key: string, value: any, retries = 2): Promise<boolean> {
  for (let i = 0; i <= retries; i++) {
    try {
      await kv.set(key, value);
      return true;
    } catch (error) {
      console.error(`KV set error (attempt ${i + 1}/${retries + 1}) for key "${key}":`, error);
      if (i === retries) {
        return false;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
  return false;
}

// Middleware - CORS with explicit configuration
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use('*', logger(console.log));

// Create Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Helper to verify user authentication
async function verifyUser(authHeader: string | null) {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  const token = parts[1];
  
  if (!token || token.length < 20) {
    return null;
  }
  
  // Check if this is the anon key
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (token === supabaseAnonKey) {
    return null;
  }
  
  // Check if token looks like a JWT
  if (!token.startsWith('eyJ')) {
    return null;
  }
  
  // Check token structure
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return null;
  }
  
  try {
    // Decode and validate the token manually
    const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // Check expiration
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (now >= payload.exp) {
        return null;
      }
    }
    
    // Check issuer
    const expectedIssuer = Deno.env.get('SUPABASE_URL') + '/auth/v1';
    if (payload.iss !== expectedIssuer) {
      return null;
    }
    
    // Extract user ID from token
    if (!payload.sub) {
      return null;
    }
    
    // Verify the token signature by making a REST API call with it
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const user = await response.json();
    
    if (!user || !user.id) {
      return null;
    }
    
    return user;
    
  } catch (err) {
    console.error('[verifyUser] Error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Helper to ensure bucket exists (creates if missing)
async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error(`Failed to list buckets:`, listError);
      return false;
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName);
    if (bucketExists) {
      return true;
    }
    
    console.log(`📦 Creating missing bucket: ${bucketName}...`);
    const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: true,
    });
    
    if (createError) {
      console.error(`❌ Failed to create bucket ${bucketName}:`, createError);
      return false;
    }
    
    console.log(`✅ Created bucket: ${bucketName}`);
    return true;
  } catch (error) {
    console.error(`Error ensuring bucket ${bucketName} exists:`, error);
    return false;
  }
}

// Initialize storage buckets (non-blocking)
async function initializeStorage() {
  try {
    console.log('🗂️ Initializing storage buckets...');
    
    const bucketsToCreate = [
      'make-29f6739b-avatars',
      'make-29f6739b-attachments',
      'make-29f6739b-posts'
    ];
    
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError);
      console.error('⚠️  Storage initialization failed, but server will continue running');
      return; // Don't throw - allow server to start anyway
    }
    
    for (const bucketName of bucketsToCreate) {
      const bucketExists = buckets?.some(b => b.name === bucketName);
      if (!bucketExists) {
        console.log(`📦 Creating bucket: ${bucketName}...`);
        const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
        });
        
        if (error) {
          console.error(`❌ Failed to create bucket ${bucketName}:`, error);
          console.error(`⚠️  Bucket creation failed, but server will continue running`);
          // Don't throw - continue with next bucket
        } else {
          console.log(`✅ Created bucket: ${bucketName}`);
        }
      } else {
        console.log(`✓ Bucket already exists: ${bucketName}`);
      }
    }
    
    console.log('✅ Storage initialization complete');
  } catch (error) {
    console.error('❌ Storage initialization failed:', error);
    console.error('⚠️  Server will continue running without storage initialization');
    // Don't throw - allow server to start anyway
  }
}

// Initialize on startup - don't block server if it fails
initializeStorage().catch(err => {
  console.error('Storage init error:', err);
  console.log('Server will continue running...');
});

// ============================================================================
// HEALTH CHECK & DIAGNOSTICS
// ============================================================================

app.get('/make-server-29f6739b/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'AuroraLink API'
  });
});

// Session diagnostic endpoint - helps debug auth issues
app.post('/make-server-29f6739b/auth/diagnostic', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('[Diagnostic] ========== SESSION DIAGNOSTIC ==========');
    
    if (!authHeader) {
      console.log('[Diagnostic] ❌ No auth header');
      return c.json({ 
        error: 'No Authorization header',
        hint: 'Make sure you are sending: Authorization: Bearer <token>'
      }, 400);
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('[Diagnostic] ❌ Invalid auth header format');
      return c.json({ 
        error: 'Invalid Authorization header format',
        hint: 'Expected: Authorization: Bearer <token>'
      }, 400);
    }
    
    const token = parts[1];
    console.log('[Diagnostic] Token length:', token.length);
    console.log('[Diagnostic] Token preview:', token.substring(0, 20) + '...');
    console.log('[Diagnostic] Token starts with eyJ?', token.startsWith('eyJ'));
    
    // Check if it's the anon key
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (token === anonKey) {
      console.log('[Diagnostic] ❌ Token is anon key!');
      return c.json({
        error: 'Using anon key instead of user JWT',
        hint: 'You must sign in to get a user JWT token'
      }, 400);
    }
    
    // Try to verify with user client approach
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: { user: userClientUser }, error: userClientError } = await userClient.auth.getUser(token);
    
    // Try to verify with admin client
    const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.getUser(token);
    
    console.log('[Diagnostic] User client result:', userClientError ? `Error: ${userClientError.message}` : `Success: ${userClientUser?.id}`);
    console.log('[Diagnostic] Admin client result:', adminError ? `Error: ${adminError.message}` : `Success: ${adminUser?.id}`);
    
    return c.json({
      tokenInfo: {
        length: token.length,
        isJWT: token.startsWith('eyJ'),
        isAnonKey: token === anonKey,
        parts: token.split('.').length
      },
      userClientVerification: {
        success: !userClientError,
        error: userClientError?.message,
        userId: userClientUser?.id
      },
      adminClientVerification: {
        success: !adminError,
        error: adminError?.message,
        userId: adminUser?.id
      },
      recommendation: (!userClientError || !adminError) 
        ? 'Token verification successful' 
        : 'Token verification failed - user needs to log out and log back in'
    });
  } catch (error) {
    console.error('[Diagnostic] Error:', error);
    return c.json({ error: 'Diagnostic failed', details: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

app.post('/make-server-29f6739b/auth/signup', async (c) => {
  try {
    const { email, password, full_name, phone_number } = await c.req.json();
    
    if (!email || !password || !full_name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    if (!phone_number) {
      return c.json({ error: 'Phone number is required' }, 400);
    }
    
    console.log(`📱 Checking phone availability: ${phone_number}`);
    
    // Check if phone number is already in use by querying Supabase Auth users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const phoneExists = existingUsers?.users?.some(
      (u: any) => u.user_metadata?.phone_number === phone_number
    );
    
    if (phoneExists) {
      console.log(`❌ Phone already registered: ${phone_number}`);
      return c.json({ error: 'Phone number is already registered' }, 400);
    }
    
    console.log(`✅ Phone available: ${phone_number}`);
    console.log(`👤 Creating user with phone in Supabase Auth metadata...`);
    
    // Create user with Supabase Auth
    // Note: We auto-confirm in Supabase so they can sign in and have a valid session
    // Phone number is stored in Supabase Auth metadata for search
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        full_name,
        phone_number // Store phone in Supabase Auth metadata
      },
      // Auto-confirm so user can sign in immediately and have valid session for API calls
      email_confirm: true,
    });
    
    if (authError) {
      console.error('❌ Signup error:', authError);
      return c.json({ error: authError.message }, 400);
    }
    
    console.log(`✅ User created in Supabase Auth: ${authData.user.id}`);
    console.log(`📝 User metadata: ${JSON.stringify(authData.user.user_metadata)}`);
    
    // Create user profile in KV store with default "About"
    const username = email.split('@')[0];
    await kv.set(`user:${authData.user.id}`, {
      id: authData.user.id,
      full_name,
      username,
      email,
      phone_number,
      status: 'Hey there! I am using AuroraLink.',
      status_message: 'Hey there! I am using AuroraLink.',
      status_updated_at: new Date().toISOString(),
      is_online: true,
      created_at: new Date().toISOString(),
    });
    
    console.log(`✅ User profile saved to KV store: user:${authData.user.id}`);
    
    // Update presence
    await kv.set(`presence:${authData.user.id}`, {
      user_id: authData.user.id,
      is_online: true,
      last_active_at: new Date().toISOString(),
    });
    
    return c.json({ 
      user: authData.user,
      message: 'User created successfully. Please verify your email.' 
    });
  } catch (error) {
    console.error('Signup server error:', error);
    return c.json({ error: 'Server error during signup' }, 500);
  }
});

// ============================================================================
// PROFILE ROUTES
// ============================================================================
// Note: Main profile endpoint is defined in Instagram section below

// Update user profile
app.post('/make-server-29f6739b/profile/update', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const updates = await c.req.json();
    const currentProfile = await kv.get(`user:${user.id}`);
    
    if (!currentProfile) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    
    // Build the updated profile
    const updatedProfile: any = {
      ...currentProfile,
    };
    
    // Handle full_name update
    if (updates.full_name !== undefined) {
      updatedProfile.full_name = updates.full_name;
    }
    
    // Handle status_message or status update
    if (updates.status_message !== undefined) {
      updatedProfile.status = updates.status_message;
      updatedProfile.status_message = updates.status_message;
      updatedProfile.status_updated_at = new Date().toISOString();
    } else if (updates.status !== undefined) {
      updatedProfile.status = updates.status;
      updatedProfile.status_message = updates.status;
      updatedProfile.status_updated_at = new Date().toISOString();
    }
    
    // Handle avatar_url update
    if (updates.avatar_url !== undefined) {
      updatedProfile.avatar_url = updates.avatar_url;
    }
    
    // Save updated profile
    await kv.set(`user:${user.id}`, updatedProfile);
    
    return c.json({ 
      success: true,
      user: updatedProfile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Server error updating profile' }, 500);
  }
});

// ============================================================================
// CONVERSATION ROUTES
// ============================================================================

app.post('/make-server-29f6739b/conversations/create', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { type, member_ids, title } = await c.req.json();
    
    if (!type || !member_ids || member_ids.length === 0) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create conversation
    const conversation = {
      id: conversationId,
      type,
      title: title || (type === 'group' ? 'New Group' : ''),
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`conversation:${conversationId}`, conversation);
    
    // Add members (including creator)
    const allMemberIds = [user.id, ...member_ids.filter((id: string) => id !== user.id)];
    
    for (const memberId of allMemberIds) {
      const memberKey = `conversation_member:${conversationId}:${memberId}`;
      await kv.set(memberKey, {
        id: `${conversationId}_${memberId}`,
        conversation_id: conversationId,
        user_id: memberId,
        role: memberId === user.id ? 'admin' : 'member',
        joined_at: new Date().toISOString(),
      });
      
      // Add to user's conversation list
      const userConvKey = `user_conversations:${memberId}`;
      const userConvs = await kv.get(userConvKey) || [];
      userConvs.push(conversationId);
      await kv.set(userConvKey, userConvs);
    }
    
    return c.json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    return c.json({ error: 'Server error creating conversation' }, 500);
  }
});

app.get('/make-server-29f6739b/conversations', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get user's conversations with error handling
    const userConvKey = `user_conversations:${user.id}`;
    const conversationIds = await safeKvGet(userConvKey, []);
    
    const conversations = [];
    
    for (const convId of conversationIds) {
      try {
        const conv = await safeKvGet(`conversation:${convId}`);
        if (!conv) continue;
        
        // Get all messages with error handling
        const messages = await safeKvGetByPrefix(`message:${convId}:`, []);
        
        const sortedMessages = messages.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Get last message with statuses
        let lastMessage = sortedMessages[0];
        if (lastMessage) {
          const statuses = await safeKvGetByPrefix(`message_status:${lastMessage.id}:`, []);
          lastMessage = { ...lastMessage, statuses };
        }
        
        // Calculate unread count (messages not sent by current user and not read by them)
        let unreadCount = 0;
        for (const msg of messages) {
          if (msg.sender_id !== user.id) {
            const readStatus = await safeKvGet(`message_status:${msg.id}:${user.id}`);
            if (!readStatus || readStatus.status !== 'read') {
              unreadCount++;
            }
          }
        }
        
        // Get members with user details
        const members = await safeKvGetByPrefix(`conversation_member:${convId}:`, []);
        
        const memberDetails = await Promise.all(
          members.map(async (member: any) => {
            const userProfile = await safeKvGet(`user:${member.user_id}`, { id: member.user_id, full_name: 'Unknown' });
            return { ...member, user: userProfile };
          })
        );
        
        conversations.push({
          ...conv,
          last_message: lastMessage,
          members: memberDetails,
          unread_count: unreadCount,
        });
      } catch (convError) {
        console.error(`Error processing conversation ${convId}:`, convError);
        // Continue with next conversation
        continue;
      }
    }
    
    // Sort by last activity
    conversations.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.updated_at;
      const bTime = b.last_message?.created_at || b.updated_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    
    return c.json({ conversations });
  } catch (error) {
    console.error('List conversations error:', error);
    return c.json({ error: 'Server error listing conversations', details: error.message }, 500);
  }
});

app.get('/make-server-29f6739b/conversations/:id', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      console.error('Get conversation - Unauthorized request');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const conversationId = c.req.param('id');
    console.log(`Getting conversation: ${conversationId} for user: ${user.id}`);
    
    const conversation = await safeKvGet(`conversation:${conversationId}`);
    
    if (!conversation) {
      console.error(`Conversation not found: ${conversationId}`);
      return c.json({ error: 'Conversation not found' }, 404);
    }
    
    // Get messages with error handling
    const messages = await safeKvGetByPrefix(`message:${conversationId}:`, []);
    
    // Add sender information, statuses, reactions, and reply_to_message to each message
    const messagesWithSenders = await Promise.all(
      messages.map(async (msg: any) => {
        try {
          const senderProfile = await safeKvGet(`user:${msg.sender_id}`, { id: msg.sender_id, full_name: 'Unknown' });
          
          // Get all statuses for this message
          const statuses = await safeKvGetByPrefix(`message_status:${msg.id}:`, []);
          
          // Get all reactions for this message
          const reactions = await safeKvGetByPrefix(`reaction:${msg.id}:`, []);
          
          // Get reply_to_message if exists
          let replyToMessage = null;
          if (msg.reply_to) {
            const replyMsg = await safeKvGet(`message:${conversationId}:${msg.reply_to}`);
            if (replyMsg) {
              const replySender = await safeKvGet(`user:${replyMsg.sender_id}`, { id: replyMsg.sender_id, full_name: 'Unknown' });
              replyToMessage = {
                ...replyMsg,
                sender: replySender
              };
            }
          }
          
          return { 
            ...msg, 
            sender: senderProfile,
            statuses: statuses || [],
            reactions: reactions || [],
            reply_to_message: replyToMessage
          };
        } catch (msgError) {
          console.error(`Error processing message ${msg.id}:`, msgError);
          // Return message with minimal data if there's an error
          return {
            ...msg,
            sender: null,
            statuses: [],
            reactions: [],
            reply_to_message: null
          };
        }
      })
    );
    
    const sortedMessages = messagesWithSenders.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Get members with error handling
    const members = await safeKvGetByPrefix(`conversation_member:${conversationId}:`, []);
    
    // Get member details with error handling
    const memberDetails = await Promise.all(
      members.map(async (member: any) => {
        const userProfile = await safeKvGet(`user:${member.user_id}`, { id: member.user_id, full_name: 'Unknown' });
        return { ...member, user: userProfile };
      })
    );
    
    console.log(`Successfully retrieved ${sortedMessages.length} messages for conversation ${conversationId}`);
    
    return c.json({
      conversation: {
        ...conversation,
        members: memberDetails,
      },
      messages: sortedMessages,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json({ 
      error: 'Server error getting conversation',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ============================================================================
// MESSAGE ROUTES
// ============================================================================

app.post('/make-server-29f6739b/messages/send', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { conversation_id, body, type, reply_to, attachments } = await c.req.json();
    
    if (!conversation_id) {
      return c.json({ error: 'Missing conversation_id' }, 400);
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const message = {
      id: messageId,
      conversation_id,
      sender_id: user.id,
      body,
      type: type || 'text',
      attachments: attachments || [],
      reply_to,
      created_at: new Date().toISOString(),
    };
    
    await safeKvSet(`message:${conversation_id}:${messageId}`, message);
    
    // Create 'delivered' status for all other conversation members
    const members = await safeKvGetByPrefix(`conversation_member:${conversation_id}:`, []);
    const statuses = [];
    
    for (const member of members) {
      if (member.user_id !== user.id) {
        const status = {
          id: `${messageId}_${member.user_id}`,
          message_id: messageId,
          user_id: member.user_id,
          status: 'delivered',
          updated_at: new Date().toISOString(),
        };
        await safeKvSet(`message_status:${messageId}:${member.user_id}`, status);
        statuses.push(status);
      }
    }
    
    // Update conversation last_message_id
    const conversation = await safeKvGet(`conversation:${conversation_id}`);
    if (conversation) {
      await safeKvSet(`conversation:${conversation_id}`, {
        ...conversation,
        last_message_id: messageId,
        updated_at: new Date().toISOString(),
      });
    }
    
    // Get sender profile
    const senderProfile = await safeKvGet(`user:${user.id}`, { id: user.id, full_name: 'Unknown' });
    
    return c.json({
      message: {
        ...message,
        sender: senderProfile,
        statuses,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    return c.json({ error: 'Server error sending message' }, 500);
  }
});

app.post('/make-server-29f6739b/messages/mark-read', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { message_ids } = await c.req.json();
    
    for (const messageId of message_ids) {
      const statusKey = `message_status:${messageId}:${user.id}`;
      await kv.set(statusKey, {
        id: `${messageId}_${user.id}`,
        message_id: messageId,
        user_id: user.id,
        status: 'read',
        updated_at: new Date().toISOString(),
      });
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return c.json({ error: 'Server error marking messages as read' }, 500);
  }
});

app.post('/make-server-29f6739b/messages/react', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { message_id, emoji } = await c.req.json();
    
    const reactionId = `react_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reactionKey = `reaction:${message_id}:${user.id}`;
    
    const reaction = {
      id: reactionId,
      message_id,
      user_id: user.id,
      emoji,
      created_at: new Date().toISOString(),
    };
    
    await kv.set(reactionKey, reaction);
    
    return c.json({ reaction });
  } catch (error) {
    console.error('React error:', error);
    return c.json({ error: 'Server error adding reaction' }, 500);
  }
});

// ============================================================================
// UPLOAD ROUTES
// ============================================================================

app.post('/make-server-29f6739b/upload', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    const bucketName = type === 'avatar' 
      ? 'make-29f6739b-avatars' 
      : 'make-29f6739b-attachments';
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    let uploadResult = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });
    
    if (uploadResult.error) {
      console.error('Upload error:', uploadResult.error);
      
      // If bucket doesn't exist, try to create it and retry
      if (uploadResult.error.message?.includes('Bucket not found') || uploadResult.error.statusCode === '404') {
        const bucketCreated = await ensureBucketExists(bucketName);
        
        if (!bucketCreated) {
          return c.json({ 
            error: 'Storage bucket not available. Please contact support.',
            details: uploadResult.error.message 
          }, 500);
        }
        
        // Retry the upload
        uploadResult = await supabaseAdmin.storage
          .from(bucketName)
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: true,
          });
        
        if (uploadResult.error) {
          console.error('Retry upload error:', uploadResult.error);
          return c.json({ error: uploadResult.error.message }, 500);
        }
      } else {
        return c.json({ error: uploadResult.error.message }, 500);
      }
    }
    
    // Create signed URL (valid for 1 year)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000);
    
    if (urlError) {
      console.error('URL generation error:', urlError);
      return c.json({ error: urlError.message }, 500);
    }
    
    return c.json({
      url: urlData.signedUrl,
      path: fileName,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error('Upload server error:', error);
    return c.json({ error: 'Server error during upload' }, 500);
  }
});

// ============================================================================
// PRESENCE ROUTES
// ============================================================================

app.post('/make-server-29f6739b/presence/update', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { is_online } = await c.req.json();
    
    const presenceKey = `presence:${user.id}`;
    await kv.set(presenceKey, {
      user_id: user.id,
      is_online: is_online !== undefined ? is_online : true,
      last_active_at: new Date().toISOString(),
    });
    
    // Update user profile
    const userProfile = await kv.get(`user:${user.id}`);
    if (userProfile) {
      await kv.set(`user:${user.id}`, {
        ...userProfile,
        is_online: is_online !== undefined ? is_online : true,
        last_seen: new Date().toISOString(),
      });
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update presence error:', error);
    return c.json({ error: 'Server error updating presence' }, 500);
  }
});

// ============================================================================
// PROFILE ROUTES
// ============================================================================

app.post('/make-server-29f6739b/profile/update', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const updates = await c.req.json();
    
    const userProfile = await kv.get(`user:${user.id}`) || {};
    
    await kv.set(`user:${user.id}`, {
      ...userProfile,
      ...updates,
      updated_at: new Date().toISOString(),
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Server error updating profile' }, 500);
  }
});

// ============================================================================
// TYPING INDICATOR ROUTES
// ============================================================================

app.post('/make-server-29f6739b/typing/start', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { conversation_id } = await c.req.json();
    
    const typingKey = `typing:${conversation_id}:${user.id}`;
    await kv.set(typingKey, {
      conversation_id,
      user_id: user.id,
      started_at: new Date().toISOString(),
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Start typing error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

app.post('/make-server-29f6739b/typing/stop', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { conversation_id } = await c.req.json();
    
    const typingKey = `typing:${conversation_id}:${user.id}`;
    await kv.del(typingKey);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Stop typing error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// ============================================================================
// USER SEARCH ROUTES
// ============================================================================

app.post('/make-server-29f6739b/users/search-by-phone', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { phone_number } = await c.req.json();
    
    if (!phone_number) {
      return c.json({ error: 'Phone number is required' }, 400);
    }
    
    console.log(`🔍 Searching for phone number: ${phone_number}`);
    
    // Search for user by phone number in Supabase Auth
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    
    console.log(`📊 Total users in system: ${allUsers?.users?.length || 0}`);
    
    const foundAuthUser = allUsers?.users?.find(
      (u: any) => u.user_metadata?.phone_number === phone_number
    );
    
    if (!foundAuthUser) {
      console.log(`❌ No user found with phone: ${phone_number}`);
      return c.json({ found: false, message: 'No user found with this phone number' });
    }
    
    console.log(`✅ Found user: ${foundAuthUser.id} (${foundAuthUser.user_metadata?.full_name})`);

    
    // Get user profile from KV store
    const userProfile = await kv.get(`user:${foundAuthUser.id}`);
    
    if (!userProfile) {
      // Fallback: create basic user object from Auth data
      return c.json({
        found: true,
        user: {
          id: foundAuthUser.id,
          full_name: foundAuthUser.user_metadata?.full_name || 'User',
          username: foundAuthUser.email?.split('@')[0] || 'user',
          phone_number: foundAuthUser.user_metadata?.phone_number,
          is_online: false,
        },
      });
    }
    
    // Return user info (excluding sensitive data)
    return c.json({
      found: true,
      user: {
        id: userProfile.id,
        full_name: userProfile.full_name,
        username: userProfile.username,
        avatar_url: userProfile.avatar_url,
        status_message: userProfile.status_message,
        phone_number: userProfile.phone_number,
        is_online: userProfile.is_online,
      },
    });
  } catch (error) {
    console.error('Search by phone error:', error);
    return c.json({ error: 'Server error searching for user' }, 500);
  }
});

// ============================================================================
// BLOCK/UNBLOCK ROUTES
// ============================================================================

app.post('/make-server-29f6739b/users/block', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { user_id } = await c.req.json();
    
    if (!user_id) {
      return c.json({ error: 'User ID is required' }, 400);
    }
    
    if (user_id === user.id) {
      return c.json({ error: 'Cannot block yourself' }, 400);
    }
    
    console.log(`🚫 User ${user.id} blocking user ${user_id}`);
    
    // Get current user profile
    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }
    
    // Add to blocked users list
    const blockedUsers = userProfile.blocked_users || [];
    if (!blockedUsers.includes(user_id)) {
      blockedUsers.push(user_id);
      await kv.set(`user:${user.id}`, {
        ...userProfile,
        blocked_users: blockedUsers,
      });
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Block user error:', error);
    return c.json({ error: 'Server error blocking user' }, 500);
  }
});

app.post('/make-server-29f6739b/users/unblock', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { user_id } = await c.req.json();
    
    if (!user_id) {
      return c.json({ error: 'User ID is required' }, 400);
    }
    
    console.log(`✅ User ${user.id} unblocking user ${user_id}`);
    
    // Get current user profile
    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }
    
    // Remove from blocked users list
    const blockedUsers = (userProfile.blocked_users || []).filter((id: string) => id !== user_id);
    await kv.set(`user:${user.id}`, {
      ...userProfile,
      blocked_users: blockedUsers,
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Unblock user error:', error);
    return c.json({ error: 'Server error unblocking user' }, 500);
  }
});

app.get('/make-server-29f6739b/users/blocked', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userProfile = await kv.get(`user:${user.id}`);
    const blockedUsers = userProfile?.blocked_users || [];
    
    return c.json({ blocked_users: blockedUsers });
  } catch (error) {
    console.error('Get blocked users error:', error);
    return c.json({ error: 'Server error getting blocked users' }, 500);
  }
});

// ============================================================================
// MESSAGE DELETE ROUTES
// ============================================================================

app.post('/make-server-29f6739b/messages/delete-for-me', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { message_id } = await c.req.json();
    
    if (!message_id) {
      return c.json({ error: 'Message ID is required' }, 400);
    }
    
    console.log(`🗑️ User ${user.id} deleting message ${message_id} for themselves`);
    
    // Find the message
    const messages = await kv.getByPrefix('message:');
    const message = messages.find((msg: any) => msg.id === message_id);
    
    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }
    
    // Add user to deleted_for_users list
    const deletedForUsers = message.deleted_for_users || [];
    if (!deletedForUsers.includes(user.id)) {
      deletedForUsers.push(user.id);
    }
    
    const messageKey = `message:${message.conversation_id}:${message_id}`;
    await kv.set(messageKey, {
      ...message,
      deleted_for_users: deletedForUsers,
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete message for me error:', error);
    return c.json({ error: 'Server error deleting message' }, 500);
  }
});

app.post('/make-server-29f6739b/messages/delete-for-everyone', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { message_id } = await c.req.json();
    
    if (!message_id) {
      return c.json({ error: 'Message ID is required' }, 400);
    }
    
    console.log(`🗑️ User ${user.id} deleting message ${message_id} for everyone`);
    
    // Find the message
    const messages = await kv.getByPrefix('message:');
    const message = messages.find((msg: any) => msg.id === message_id);
    
    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }
    
    // Check if user is the sender
    if (message.sender_id !== user.id) {
      return c.json({ error: 'Can only delete your own messages for everyone' }, 403);
    }
    
    // Check if message is less than 1 hour old (WhatsApp-style limit)
    const messageTime = new Date(message.created_at).getTime();
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    if (now - messageTime > hourInMs) {
      return c.json({ error: 'Can only delete messages within 1 hour for everyone' }, 403);
    }
    
    // Mark message as deleted for everyone
    const messageKey = `message:${message.conversation_id}:${message_id}`;
    await kv.set(messageKey, {
      ...message,
      deleted_for_everyone: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      body: undefined, // Remove message content
      attachments: undefined, // Remove attachments
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete message for everyone error:', error);
    return c.json({ error: 'Server error deleting message' }, 500);
  }
});

// ============================================================================
// CONVERSATION DELETE ROUTE
// ============================================================================

app.post('/make-server-29f6739b/conversations/delete', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { conversation_id } = await c.req.json();
    
    if (!conversation_id) {
      return c.json({ error: 'Conversation ID is required' }, 400);
    }
    
    console.log(`🗑️ User ${user.id} deleting conversation ${conversation_id}`);
    
    // Remove conversation from user's list
    const userConvKey = `user_conversations:${user.id}`;
    const userConvs = await kv.get(userConvKey) || [];
    const updatedConvs = userConvs.filter((id: string) => id !== conversation_id);
    await kv.set(userConvKey, updatedConvs);
    
    // Remove user from conversation members
    const memberKey = `conversation_member:${conversation_id}:${user.id}`;
    await kv.del(memberKey);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return c.json({ error: 'Server error deleting conversation' }, 500);
  }
});

// ============================================================================
// ADMIN/DEBUG ROUTES
// ============================================================================

// Health check
app.get('/make-server-29f6739b/health', (c) => {
  return c.json({ status: 'ok', service: 'AuroraLink API' });
});

// DANGER: Delete all users and data
app.post('/make-server-29f6739b/admin/delete-all-users', async (c) => {
  try {
    console.log('🚨 DANGER: Starting to delete all users and data...');
    
    const stats = {
      authUsersDeleted: 0,
      userProfilesDeleted: 0,
      conversationsDeleted: 0,
      messagesDeleted: 0,
      statusesDeleted: 0,
      reactionsDeleted: 0,
      presenceDeleted: 0,
      typingDeleted: 0,
      membersDeleted: 0,
      userConversationsDeleted: 0,
    };
    
    // 1. Get all users from Supabase Auth
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const allUsers = authData?.users || [];
    
    console.log(`📊 Found ${allUsers.length} users in Supabase Auth`);
    
    // 2. Delete all data from KV store for each user
    for (const authUser of allUsers) {
      const userId = authUser.id;
      console.log(`🗑️ Deleting all data for user: ${userId} (${authUser.email})`);
      
      // Delete user profile
      const userProfile = await kv.get(`user:${userId}`);
      if (userProfile) {
        await kv.del(`user:${userId}`);
        stats.userProfilesDeleted++;
      }
      
      // Delete presence
      const presence = await kv.get(`presence:${userId}`);
      if (presence) {
        await kv.del(`presence:${userId}`);
        stats.presenceDeleted++;
      }
      
      // Delete user conversations list
      const userConvs = await kv.get(`user_conversations:${userId}`);
      if (userConvs) {
        await kv.del(`user_conversations:${userId}`);
        stats.userConversationsDeleted++;
      }
    }
    
    // 3. Delete all conversations and related data
    const allConversations = await kv.getByPrefix('conversation:');
    console.log(`💬 Found ${allConversations.length} conversations`);
    
    for (const conv of allConversations) {
      const convId = conv.id;
      console.log(`🗑️ Deleting conversation: ${convId}`);
      
      // Delete conversation
      await kv.del(`conversation:${convId}`);
      stats.conversationsDeleted++;
      
      // Delete all messages in this conversation
      const messages = await kv.getByPrefix(`message:${convId}:`);
      for (const msg of messages) {
        await kv.del(`message:${convId}:${msg.id}`);
        stats.messagesDeleted++;
        
        // Delete message statuses
        const statuses = await kv.getByPrefix(`message_status:${msg.id}:`);
        for (const status of statuses) {
          await kv.del(`message_status:${msg.id}:${status.user_id}`);
          stats.statusesDeleted++;
        }
        
        // Delete reactions
        const reactions = await kv.getByPrefix(`reaction:${msg.id}:`);
        for (const reaction of reactions) {
          await kv.del(`reaction:${msg.id}:${reaction.user_id}`);
          stats.reactionsDeleted++;
        }
      }
      
      // Delete conversation members
      const members = await kv.getByPrefix(`conversation_member:${convId}:`);
      for (const member of members) {
        await kv.del(`conversation_member:${convId}:${member.user_id}`);
        stats.membersDeleted++;
      }
      
      // Delete typing indicators
      const typing = await kv.getByPrefix(`typing:${convId}:`);
      for (const t of typing) {
        await kv.del(`typing:${convId}:${t.user_id}`);
        stats.typingDeleted++;
      }
    }
    
    // 4. Delete all users from Supabase Auth
    console.log(`👤 Deleting ${allUsers.length} users from Supabase Auth...`);
    for (const authUser of allUsers) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      if (error) {
        console.error(`❌ Error deleting user ${authUser.id}:`, error);
      } else {
        console.log(`✅ Deleted auth user: ${authUser.email}`);
        stats.authUsersDeleted++;
      }
    }
    
    console.log('✅ All users and data deleted successfully!');
    console.log('📊 Deletion statistics:', stats);
    
    return c.json({
      success: true,
      message: 'All users and data have been deleted',
      stats,
    });
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return c.json({ 
      error: 'Server error during cleanup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================================================
// CALLS ROUTES - WebRTC Signaling
// ============================================================================

// Initiate a call
app.post('/make-server-29f6739b/calls/initiate', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { recipient_id, call_type } = await c.req.json();

    if (!recipient_id || !call_type) {
      return c.json({ error: 'Recipient ID and call type are required' }, 400);
    }

    console.log(`📞 User ${user.id} initiating ${call_type} call to ${recipient_id}`);

    // Create call record
    const callId = crypto.randomUUID();
    const call = {
      id: callId,
      caller_id: user.id,
      recipient_id,
      call_type,
      status: 'ringing',
      started_at: new Date().toISOString(),
    };

    await kv.set(`call:${callId}`, call);
    await kv.set(`call_incoming:${recipient_id}`, callId);

    return c.json({ call });
  } catch (error) {
    console.error('Initiate call error:', error);
    return c.json({ error: 'Server error initiating call' }, 500);
  }
});

// Send call signal (offer, answer, ICE candidate)
app.post('/make-server-29f6739b/calls/signal', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { call_id, signal_type, signal_data } = await c.req.json();

    if (!call_id || !signal_type || !signal_data) {
      return c.json({ error: 'Call ID, signal type, and signal data are required' }, 400);
    }

    console.log(`📡 User ${user.id} sending ${signal_type} signal for call ${call_id}`);

    // Get call record
    const call = await kv.get(`call:${call_id}`);
    if (!call) {
      return c.json({ error: 'Call not found' }, 404);
    }

    // Verify user is part of the call
    if (call.caller_id !== user.id && call.recipient_id !== user.id) {
      return c.json({ error: 'Unauthorized to send signals for this call' }, 403);
    }

    // Determine recipient
    const recipientId = call.caller_id === user.id ? call.recipient_id : call.caller_id;

    // Store signal
    const signalId = crypto.randomUUID();
    const signal = {
      id: signalId,
      call_id,
      from_user_id: user.id,
      to_user_id: recipientId,
      signal_type,
      signal_data,
      created_at: new Date().toISOString(),
    };

    await kv.set(`call_signal:${call_id}:${signalId}`, signal);

    return c.json({ success: true, signal });
  } catch (error) {
    console.error('Send call signal error:', error);
    return c.json({ error: 'Server error sending call signal' }, 500);
  }
});

// Get call signals
app.get('/make-server-29f6739b/calls/:callId/signals', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const callId = c.req.param('callId');
    const afterTimestamp = c.req.query('after');

    // Get call record
    const call = await kv.get(`call:${callId}`);
    if (!call) {
      return c.json({ error: 'Call not found' }, 404);
    }

    // Verify user is part of the call
    if (call.caller_id !== user.id && call.recipient_id !== user.id) {
      return c.json({ error: 'Unauthorized to get signals for this call' }, 403);
    }

    // Get all signals for this call
    const allSignals = await kv.getByPrefix(`call_signal:${callId}:`);
    
    // Filter signals for current user
    let signals = allSignals.filter((s: any) => s.to_user_id === user.id);

    // Filter by timestamp if provided
    if (afterTimestamp) {
      signals = signals.filter((s: any) => s.created_at > afterTimestamp);
    }

    return c.json({ signals });
  } catch (error) {
    console.error('Get call signals error:', error);
    return c.json({ error: 'Server error getting call signals' }, 500);
  }
});

// Accept a call
app.post('/make-server-29f6739b/calls/accept', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { call_id } = await c.req.json();

    if (!call_id) {
      return c.json({ error: 'Call ID is required' }, 400);
    }

    console.log(`✅ User ${user.id} accepting call ${call_id}`);

    // Get call record
    const call = await kv.get(`call:${call_id}`);
    if (!call) {
      return c.json({ error: 'Call not found' }, 404);
    }

    // Verify user is the recipient
    if (call.recipient_id !== user.id) {
      return c.json({ error: 'Unauthorized to accept this call' }, 403);
    }

    // Update call status
    await kv.set(`call:${call_id}`, {
      ...call,
      status: 'accepted',
    });

    // Clear incoming call notification
    await kv.del(`call_incoming:${user.id}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Accept call error:', error);
    return c.json({ error: 'Server error accepting call' }, 500);
  }
});

// Reject a call
app.post('/make-server-29f6739b/calls/reject', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { call_id } = await c.req.json();

    if (!call_id) {
      return c.json({ error: 'Call ID is required' }, 400);
    }

    console.log(`❌ User ${user.id} rejecting call ${call_id}`);

    // Get call record
    const call = await kv.get(`call:${call_id}`);
    if (!call) {
      return c.json({ error: 'Call not found' }, 404);
    }

    // Verify user is the recipient
    if (call.recipient_id !== user.id) {
      return c.json({ error: 'Unauthorized to reject this call' }, 403);
    }

    // Update call status
    await kv.set(`call:${call_id}`, {
      ...call,
      status: 'rejected',
      ended_at: new Date().toISOString(),
    });

    // Clear incoming call notification
    await kv.del(`call_incoming:${user.id}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Reject call error:', error);
    return c.json({ error: 'Server error rejecting call' }, 500);
  }
});

// End a call
app.post('/make-server-29f6739b/calls/end', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { call_id } = await c.req.json();

    if (!call_id) {
      return c.json({ error: 'Call ID is required' }, 400);
    }

    console.log(`📴 User ${user.id} ending call ${call_id}`);

    // Get call record
    const call = await kv.get(`call:${call_id}`);
    if (!call) {
      return c.json({ error: 'Call not found' }, 404);
    }

    // Verify user is part of the call
    if (call.caller_id !== user.id && call.recipient_id !== user.id) {
      return c.json({ error: 'Unauthorized to end this call' }, 403);
    }

    // Calculate duration
    const startedAt = new Date(call.started_at).getTime();
    const endedAt = new Date().getTime();
    const duration = Math.floor((endedAt - startedAt) / 1000);

    // Update call status
    await kv.set(`call:${call_id}`, {
      ...call,
      status: 'ended',
      ended_at: new Date().toISOString(),
      duration,
    });

    // Clear incoming call notifications
    await kv.del(`call_incoming:${call.caller_id}`);
    await kv.del(`call_incoming:${call.recipient_id}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('End call error:', error);
    return c.json({ error: 'Server error ending call' }, 500);
  }
});

// Check for incoming calls
app.get('/make-server-29f6739b/calls/incoming', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get incoming call ID
    const callId = await kv.get(`call_incoming:${user.id}`);
    
    if (!callId) {
      return c.json({ call: null });
    }

    // Get call record
    const call = await kv.get(`call:${callId}`);
    if (!call) {
      // Cleanup stale reference
      await kv.del(`call_incoming:${user.id}`);
      return c.json({ call: null });
    }

    // Get caller info
    const caller = await kv.get(`user:${call.caller_id}`);

    return c.json({
      call: {
        ...call,
        caller,
      },
    });
  } catch (error) {
    console.error('Check incoming calls error:', error);
    return c.json({ error: 'Server error checking incoming calls' }, 500);
  }
});

// ============================================================================
// 404 HANDLER
// ============================================================================

app.notFound((c) => {
  console.error(`404 - Route not found: ${c.req.method} ${c.req.url}`);
  return c.json({ error: 'Route not found' }, 404);
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ 
    error: 'Internal server error',
    message: err.message 
  }, 500);
});

// ============================================================================
// STORIES ROUTES (WhatsApp Status)
// ============================================================================

// Cleanup expired stories (24 hours old)
async function cleanupExpiredStories() {
  console.log('🧹 Starting story cleanup...');
  
  const allStories = await kv.getByPrefix('story:');
  const now = new Date();
  let deletedCount = 0;
  
  for (const story of allStories) {
    const expiresAt = new Date(story.expires_at);
    
    if (expiresAt < now) {
      // Story has expired - delete it and its views
      console.log(`🗑️ Deleting expired story: ${story.id} (expired at ${expiresAt.toISOString()})`);
      
      // Delete the story
      await kv.del(`story:${story.user_id}:${story.id}`);
      
      // Delete all views for this story
      const views = await kv.getByPrefix(`story_view:${story.id}:`);
      for (const view of views) {
        await kv.del(`story_view:${story.id}:${view.user_id}`);
      }
      
      deletedCount++;
    }
  }
  
  console.log(`✅ Cleanup complete. Deleted ${deletedCount} expired stories.`);
  return deletedCount;
}

// Get all stories from contacts
app.get('/make-server-29f6739b/stories', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log(`📖 Fetching stories for user: ${user.id}`);

    // Auto-cleanup expired stories every time stories are fetched
    await cleanupExpiredStories();

    // Get user's conversations to determine who they can see stories from
    const userConversations = await kv.get(`user_conversations:${user.id}`) || [];
    const contactUserIds = new Set<string>();
    
    // Collect all user IDs from conversations (these are the user's contacts)
    for (const convId of userConversations) {
      const members = await kv.getByPrefix(`conversation_member:${convId}:`);
      for (const member of members) {
        if (member.user_id !== user.id) {
          contactUserIds.add(member.user_id);
        }
      }
    }

    console.log(`👥 User has ${contactUserIds.size} contacts from ${userConversations.length} conversations`);

    // Get all stories that haven't expired
    const allStories = await kv.getByPrefix('story:');
    const now = new Date();

    // Filter expired stories and group by user
    const userStoriesMap = new Map();
    
    for (const story of allStories) {
      const expiresAt = new Date(story.expires_at);
      
      // Skip expired stories (double-check after cleanup)
      if (expiresAt < now) {
        continue;
      }

      // PRIVACY FIX: Only show stories from users you have conversations with
      // (not from your own user ID)
      if (story.user_id === user.id) {
        continue; // Skip own stories (they appear in "my stories")
      }
      
      if (!contactUserIds.has(story.user_id)) {
        continue; // Skip stories from non-contacts
      }

      // Get story owner's profile
      const owner = await kv.get(`user:${story.user_id}`);
      
      // DATA CLEANUP FIX: Skip if user no longer exists in database
      if (!owner) {
        console.log(`⚠️  Skipping story from deleted user: ${story.user_id}`);
        continue;
      }

      // Verify user still exists in Supabase Auth
      try {
        const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(story.user_id);
        if (error || !authUser) {
          console.log(`⚠️  User ${story.user_id} not found in Auth, skipping their stories`);
          // Optionally: Clean up this orphaned story
          await kv.del(`story:${story.user_id}:${story.id}`);
          continue;
        }
      } catch (err) {
        console.log(`⚠️  Error checking auth for user ${story.user_id}, skipping`);
        continue;
      }

      // Get views for this story
      const views = await kv.getByPrefix(`story_view:${story.id}:`);
      const hasViewed = views.some((v: any) => v.user_id === user.id);

      if (!userStoriesMap.has(story.user_id)) {
        userStoriesMap.set(story.user_id, {
          user: owner,
          stories: [],
          has_unviewed: false,
        });
      }

      const userStories = userStoriesMap.get(story.user_id);
      userStories.stories.push({
        ...story,
        view_count: views.length,
        has_viewed: hasViewed,
      });

      if (!hasViewed) {
        userStories.has_unviewed = true;
      }
    }

    // Sort stories within each user group (oldest to newest - WhatsApp behavior)
    userStoriesMap.forEach((userStories) => {
      userStories.stories.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    // Convert map to array and sort (unviewed first, then by latest story)
    const storiesList = Array.from(userStoriesMap.values())
      .sort((a, b) => {
        // Unviewed stories first
        if (a.has_unviewed && !b.has_unviewed) return -1;
        if (!a.has_unviewed && b.has_unviewed) return 1;
        
        // Then by latest story time
        const aLatest = Math.max(...a.stories.map((s: any) => new Date(s.created_at).getTime()));
        const bLatest = Math.max(...b.stories.map((s: any) => new Date(s.created_at).getTime()));
        return bLatest - aLatest;
      });

    console.log(`✅ Found ${storiesList.length} users with stories`);

    return c.json({ stories: storiesList });
  } catch (error) {
    console.error('Get stories error:', error);
    return c.json({ error: 'Server error fetching stories' }, 500);
  }
});

// Get my stories
app.get('/make-server-29f6739b/stories/my-stories', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Auto-cleanup expired stories when user checks their own stories
    await cleanupExpiredStories();

    const allStories = await kv.getByPrefix(`story:${user.id}:`);
    const now = new Date();

    // Filter expired and add view counts
    const stories = [];
    for (const story of allStories) {
      const expiresAt = new Date(story.expires_at);
      if (expiresAt >= now) {
        const views = await kv.getByPrefix(`story_view:${story.id}:`);
        const viewsWithUsers = await Promise.all(
          views.map(async (view: any) => {
            const viewer = await kv.get(`user:${view.user_id}`);
            return { ...view, user: viewer };
          })
        );
        
        stories.push({
          ...story,
          views: viewsWithUsers,
          view_count: views.length,
        });
      }
    }

    // Sort by creation time (newest first)
    stories.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return c.json({ stories });
  } catch (error) {
    console.error('Get my stories error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Create a story
app.post('/make-server-29f6739b/stories/create', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { type, media_url, text_content, background_color, caption } = await c.req.json();

    if (!type || (type !== 'text' && type !== 'image' && type !== 'video')) {
      return c.json({ error: 'Invalid story type' }, 400);
    }

    if (type === 'text' && !text_content) {
      return c.json({ error: 'Text content required for text stories' }, 400);
    }

    if ((type === 'image' || type === 'video') && !media_url) {
      return c.json({ error: 'Media URL required for image/video stories' }, 400);
    }

    console.log(`📸 User ${user.id} creating ${type} story`);

    const storyId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const story = {
      id: storyId,
      user_id: user.id,
      type,
      media_url,
      text_content,
      background_color: background_color || '#0057FF',
      caption,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    await kv.set(`story:${user.id}:${storyId}`, story);

    // Add user info to response
    const userProfile = await kv.get(`user:${user.id}`);

    return c.json({
      story: {
        ...story,
        user: userProfile,
        views: [],
        view_count: 0,
      },
    });
  } catch (error) {
    console.error('Create story error:', error);
    return c.json({ error: 'Server error creating story' }, 500);
  }
});

// View a story
app.post('/make-server-29f6739b/stories/view', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { story_id } = await c.req.json();

    if (!story_id) {
      return c.json({ error: 'Story ID is required' }, 400);
    }

    // Check if already viewed
    const existingView = await kv.get(`story_view:${story_id}:${user.id}`);
    if (existingView) {
      return c.json({ success: true, already_viewed: true });
    }

    const view = {
      id: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      story_id,
      user_id: user.id,
      viewed_at: new Date().toISOString(),
    };

    await kv.set(`story_view:${story_id}:${user.id}`, view);

    console.log(`👁️ User ${user.id} viewed story ${story_id}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('View story error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Manual cleanup endpoint (for admin/maintenance)
app.post('/make-server-29f6739b/stories/cleanup', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const deletedCount = await cleanupExpiredStories();

    return c.json({ 
      success: true, 
      deleted_count: deletedCount,
      message: `Cleaned up ${deletedCount} expired stories` 
    });
  } catch (error) {
    console.error('Manual cleanup error:', error);
    return c.json({ error: 'Server error during cleanup' }, 500);
  }
});

// ============================================================================
// FOLLOW SYSTEM ROUTES
// ============================================================================

// Initialize follow routes (follow, unfollow, followers list, following list)
addFollowRoutes(app, verifyUser);

// Get story views
app.get('/make-server-29f6739b/stories/:storyId/views', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const storyId = c.req.param('storyId');
    
    // Get the story to verify ownership
    const allStories = await kv.getByPrefix(`story:${user.id}:`);
    const story = allStories.find((s: any) => s.id === storyId);

    if (!story) {
      return c.json({ error: 'Story not found or unauthorized' }, 404);
    }

    const views = await kv.getByPrefix(`story_view:${storyId}:`);
    
    // Add user info to each view
    const viewsWithUsers = await Promise.all(
      views.map(async (view: any) => {
        const viewer = await kv.get(`user:${view.user_id}`);
        return { ...view, user: viewer };
      })
    );

    // Sort by view time (newest first)
    viewsWithUsers.sort((a, b) => 
      new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime()
    );

    return c.json({ views: viewsWithUsers });
  } catch (error) {
    console.error('Get story views error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Reply to a story
app.post('/make-server-29f6739b/stories/reply', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { story_id, message } = await c.req.json();

    if (!story_id || !message) {
      return c.json({ error: 'Story ID and message are required' }, 400);
    }

    // Get the story to find the owner
    const allStories = await kv.getByPrefix('story:');
    const story = allStories.find((s: any) => s.id === story_id);

    if (!story) {
      return c.json({ error: 'Story not found' }, 404);
    }

    console.log(`💬 User ${user.id} replying to story ${story_id}`);

    // Create or get DM conversation with story owner
    const userConvs = await kv.get(`user_conversations:${user.id}`) || [];
    const ownerConvs = await kv.get(`user_conversations:${story.user_id}`) || [];

    // Find existing DM conversation
    let conversationId = null;
    for (const convId of userConvs) {
      if (ownerConvs.includes(convId)) {
        const conv = await kv.get(`conversation:${convId}`);
        if (conv && conv.type === 'dm') {
          conversationId = convId;
          break;
        }
      }
    }

    // Create conversation if it doesn't exist
    if (!conversationId) {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const conversation = {
        id: conversationId,
        type: 'dm',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await kv.set(`conversation:${conversationId}`, conversation);

      // Add members
      for (const memberId of [user.id, story.user_id]) {
        await kv.set(`conversation_member:${conversationId}:${memberId}`, {
          id: `${conversationId}_${memberId}`,
          conversation_id: conversationId,
          user_id: memberId,
          role: memberId === user.id ? 'admin' : 'member',
          joined_at: new Date().toISOString(),
        });

        const userConvsKey = `user_conversations:${memberId}`;
        const convs = await kv.get(userConvsKey) || [];
        convs.push(conversationId);
        await kv.set(userConvsKey, convs);
      }
    }

    // Get story owner details
    const storyOwner = await kv.get(`user:${story.user_id}`);

    // Send the message with story reply metadata
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageObj = {
      id: messageId,
      conversation_id: conversationId,
      sender_id: user.id,
      body: message,
      type: 'story_reply',
      story_reply: {
        story_id: story.id,
        story_type: story.type,
        story_preview: story.type === 'text' ? story.text_content : story.media_url,
        story_background_color: story.background_color,
        story_user_id: story.user_id,
        story_user_name: storyOwner?.full_name || 'User',
      },
      created_at: new Date().toISOString(),
    };

    await kv.set(`message:${conversationId}:${messageId}`, messageObj);

    // Update conversation
    const conversation = await kv.get(`conversation:${conversationId}`);
    if (conversation) {
      await kv.set(`conversation:${conversationId}`, {
        ...conversation,
        last_message_id: messageId,
        updated_at: new Date().toISOString(),
      });
    }

    return c.json({ success: true, conversation_id: conversationId });
  } catch (error) {
    console.error('Reply to story error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Delete a story
app.post('/make-server-29f6739b/stories/delete', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { story_id } = await c.req.json();

    if (!story_id) {
      return c.json({ error: 'Story ID is required' }, 400);
    }

    // Get the story to verify ownership
    const allStories = await kv.getByPrefix(`story:${user.id}:`);
    const story = allStories.find((s: any) => s.id === story_id);

    if (!story) {
      return c.json({ error: 'Story not found or unauthorized' }, 404);
    }

    console.log(`🗑️ User ${user.id} deleting story ${story_id}`);

    // Delete story
    await kv.del(`story:${user.id}:${story_id}`);

    // Delete all views
    const views = await kv.getByPrefix(`story_view:${story_id}:`);
    for (const view of views) {
      await kv.del(`story_view:${story_id}:${view.user_id}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete story error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// ============================================================================
// ACCOUNT DELETION ROUTE
// ============================================================================

// Delete user account and all associated data
app.post('/make-server-29f6739b/account/delete', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.id;
    console.log(`🗑️ Starting account deletion for user: ${userId}`);

    // 1. Delete user profile
    console.log('  Deleting user profile...');
    await kv.del(`user:${userId}`);

    // 2. Delete presence
    console.log('  Deleting presence...');
    await kv.del(`presence:${userId}`);

    // 3. Delete all user's stories
    console.log('  Deleting stories...');
    const userStories = await kv.getByPrefix(`story:${userId}:`);
    for (const story of userStories) {
      await kv.del(`story:${userId}:${story.id}`);
      
      // Delete all views for this story
      const views = await kv.getByPrefix(`story_view:${story.id}:`);
      for (const view of views) {
        await kv.del(`story_view:${story.id}:${view.user_id}`);
      }
    }

    // 4. Delete story views by this user
    console.log('  Deleting story views...');
    const allStoryViews = await kv.getByPrefix('story_view:');
    for (const view of allStoryViews) {
      if (view.user_id === userId) {
        await kv.del(`story_view:${view.story_id}:${userId}`);
      }
    }

    // 5. Get user's conversations
    console.log('  Processing conversations...');
    const userConversations = await kv.get(`user_conversations:${userId}`) || [];
    
    for (const convId of userConversations) {
      // Delete user's conversation membership
      await kv.del(`conversation_member:${convId}:${userId}`);
      
      // Delete message statuses created by this user
      const allMessageStatuses = await kv.getByPrefix(`message_status:`);
      for (const status of allMessageStatuses) {
        if (status.user_id === userId) {
          await kv.del(`message_status:${status.message_id}:${userId}`);
        }
      }
      
      // Delete messages sent by this user
      const messages = await kv.getByPrefix(`message:${convId}:`);
      for (const message of messages) {
        if (message.sender_id === userId) {
          await kv.del(`message:${convId}:${message.id}`);
          
          // Delete all statuses for this message
          const statuses = await kv.getByPrefix(`message_status:${message.id}:`);
          for (const status of statuses) {
            await kv.del(`message_status:${message.id}:${status.user_id}`);
          }
          
          // Delete all reactions to this message
          const reactions = await kv.getByPrefix(`reaction:${message.id}:`);
          for (const reaction of reactions) {
            await kv.del(`reaction:${message.id}:${reaction.user_id}`);
          }
        }
      }
      
      // Delete reactions by this user
      const allReactions = await kv.getByPrefix('reaction:');
      for (const reaction of allReactions) {
        if (reaction.user_id === userId) {
          await kv.del(`reaction:${reaction.message_id}:${userId}`);
        }
      }
      
      // Check if conversation has other members
      const remainingMembers = await kv.getByPrefix(`conversation_member:${convId}:`);
      
      if (remainingMembers.length === 0) {
        // No members left, delete the entire conversation
        console.log(`  Deleting empty conversation: ${convId}`);
        await kv.del(`conversation:${convId}`);
        
        // Delete all messages in this conversation
        const convMessages = await kv.getByPrefix(`message:${convId}:`);
        for (const msg of convMessages) {
          await kv.del(`message:${convId}:${msg.id}`);
        }
      }
    }

    // 6. Delete user's conversation list
    console.log('  Deleting conversation list...');
    await kv.del(`user_conversations:${userId}`);

    // 7. Delete typing indicators
    console.log('  Deleting typing indicators...');
    const typingIndicators = await kv.getByPrefix('typing:');
    for (const typing of typingIndicators) {
      if (typing.user_id === userId) {
        await kv.del(`typing:${typing.conversation_id}:${userId}`);
      }
    }

    // 8. Delete from Supabase Auth
    console.log('  Deleting from Supabase Auth...');
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('  Error deleting from Auth:', authError);
      // Continue anyway - KV data is already deleted
    } else {
      console.log('  ✅ Deleted from Supabase Auth');
    }

    console.log(`✅ Account deletion complete for user: ${userId}`);

    return c.json({ 
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return c.json({ error: 'Server error deleting account' }, 500);
  }
});

// ============================================================================
// INSTAGRAM-STYLE FEED & POSTS
// ============================================================================

// Get feed of followed users' posts
app.get('/make-server-29f6739b/feed', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    // Get list of users current user follows
    const following = await safeKvGet(`following:${user.id}`, []);
    
    // Get all posts from followed users + own posts
    const posts = [];
    const userIds = [...following, user.id]; // Include own posts
    
    for (const userId of userIds) {
      const userPosts = await safeKvGetByPrefix(`post:${userId}:`);
      posts.push(...userPosts);
    }
    
    // Sort by created_at desc
    posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Add user data and like/save status
    for (const post of posts) {
      const postUser = await safeKvGet(`user:${post.user_id}`);
      post.user = postUser;
      post.is_liked = !!(await safeKvGet(`like:${post.id}:${user.id}`));
      post.is_saved = !!(await safeKvGet(`save:${post.id}:${user.id}`));
    }
    
    return c.json({ posts });
  } catch (error) {
    console.error('Get feed error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Get all posts for explore (public feed)
app.get('/make-server-29f6739b/feed/explore', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    // Get all posts from all users
    const posts = await safeKvGetByPrefix('post:');
    
    // Sort by created_at desc
    posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Add user data and like/save status
    for (const post of posts) {
      const postUser = await safeKvGet(`user:${post.user_id}`);
      post.user = postUser;
      post.is_liked = !!(await safeKvGet(`like:${post.id}:${user.id}`));
      post.is_saved = !!(await safeKvGet(`save:${post.id}:${user.id}`));
    }
    
    return c.json({ posts });
  } catch (error) {
    console.error('Get explore error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Get user's posts
app.get('/make-server-29f6739b/feed/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const currentUser = await verifyUser(c.req.header('Authorization'));
    if (!currentUser) return c.json({ error: 'Unauthorized' }, 401);
    
    const posts = await safeKvGetByPrefix(`post:${userId}:`);
    
    // Sort by created_at desc
    posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Add user data and like/save status
    const user = await safeKvGet(`user:${userId}`);
    for (const post of posts) {
      post.user = user;
      post.is_liked = !!(await safeKvGet(`like:${post.id}:${currentUser.id}`));
      post.is_saved = !!(await safeKvGet(`save:${post.id}:${currentUser.id}`));
    }
    
    return c.json({ posts });
  } catch (error) {
    console.error('Get user posts error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Get single post with comments
app.get('/make-server-29f6739b/feed/post/:postId', async (c) => {
  try {
    const postId = c.req.param('postId');
    const currentUser = await verifyUser(c.req.header('Authorization'));
    if (!currentUser) return c.json({ error: 'Unauthorized' }, 401);
    
    // Find post
    const allPosts = await safeKvGetByPrefix('post:');
    const post = allPosts.find((p: any) => p.id === postId);
    
    if (!post) return c.json({ error: 'Post not found' }, 404);
    
    // Add user data
    const user = await safeKvGet(`user:${post.user_id}`);
    post.user = user;
    post.is_liked = !!(await safeKvGet(`like:${post.id}:${currentUser.id}`));
    post.is_saved = !!(await safeKvGet(`save:${post.id}:${currentUser.id}`));
    
    // Get comments
    const comments = await safeKvGetByPrefix(`comment:${postId}:`);
    
    // Add user data to comments
    for (const comment of comments) {
      const commentUser = await safeKvGet(`user:${comment.user_id}`);
      comment.user = commentUser;
    }
    
    // Sort comments by created_at asc (oldest first)
    comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    return c.json({ post, comments });
  } catch (error) {
    console.error('Get post error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Get comments for a post
app.get('/make-server-29f6739b/feed/post/:postId/comments', async (c) => {
  try {
    const postId = c.req.param('postId');
    const currentUser = await verifyUser(c.req.header('Authorization'));
    if (!currentUser) return c.json({ error: 'Unauthorized' }, 401);
    
    // Get comments
    const comments = await safeKvGetByPrefix(`comment:${postId}:`);
    
    // Add user data to comments
    for (const comment of comments) {
      const commentUser = await safeKvGet(`user:${comment.user_id}`);
      comment.user = commentUser;
    }
    
    // Sort comments by created_at asc (oldest first)
    comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    return c.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Create post
app.post('/make-server-29f6739b/feed/create', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const caption = formData.get('caption') as string;
    const location = formData.get('location') as string;
    
    if (!file || !type) {
      return c.json({ error: 'File and type are required' }, 400);
    }
    
    if (type !== 'photo' && type !== 'reel') {
      return c.json({ error: 'Type must be photo or reel' }, 400);
    }
    
    console.log(`📸 User ${user.id} creating ${type} post, file: ${file.name}, size: ${file.size}`);
    
    // Upload file to Supabase Storage
    const bucketName = 'make-29f6739b-posts';
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    
    let uploadResult = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });
    
    if (uploadResult.error) {
      console.error('Upload error:', uploadResult.error);
      
      // If bucket doesn't exist, try to create it and retry
      if (uploadResult.error.message?.includes('Bucket not found') || uploadResult.error.statusCode === '404') {
        const bucketCreated = await ensureBucketExists(bucketName);
        
        if (!bucketCreated) {
          return c.json({ 
            error: 'Storage bucket not available. Please contact support.',
            details: uploadResult.error.message 
          }, 500);
        }
        
        // Retry the upload
        uploadResult = await supabaseAdmin.storage
          .from(bucketName)
          .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false,
          });
        
        if (uploadResult.error) {
          console.error('Retry upload error:', uploadResult.error);
          return c.json({ error: uploadResult.error.message }, 500);
        }
      } else {
        return c.json({ error: uploadResult.error.message }, 500);
      }
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    console.log(`✅ File uploaded to: ${publicUrl}`);
    
    // Create post
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const post = {
      id: postId,
      user_id: user.id,
      type,
      media_url: publicUrl,
      caption: caption || '',
      location: location || '',
      created_at: new Date().toISOString(),
      likes_count: 0,
      comments_count: 0,
    };
    
    await safeKvSet(`post:${user.id}:${postId}`, post);
    
    // Increment user's posts_count
    const userProfile = await safeKvGet(`user:${user.id}`);
    if (userProfile) {
      userProfile.posts_count = (userProfile.posts_count || 0) + 1;
      await safeKvSet(`user:${user.id}`, userProfile);
      console.log(`📊 User ${user.id} posts_count updated to: ${userProfile.posts_count}`);
    }
    
    console.log(`✅ Post created successfully: ${postId}`);
    
    return c.json({ 
      post: {
        ...post,
        user: userProfile,
        is_liked: false,
        is_saved: false,
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    return c.json({ error: 'Server error creating post', details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

// Delete post
app.delete('/make-server-29f6739b/feed/post/:postId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const postId = c.req.param('postId');
    
    // Find post
    const allPosts = await safeKvGetByPrefix('post:');
    const post = allPosts.find((p: any) => p.id === postId);
    
    if (!post) return c.json({ error: 'Post not found' }, 404);
    
    // Check ownership
    if (post.user_id !== user.id) {
      return c.json({ error: 'Unauthorized to delete this post' }, 403);
    }
    
    // Delete post
    await kv.del(`post:${post.user_id}:${postId}`);
    
    // Decrement user's posts_count
    const userProfile = await safeKvGet(`user:${post.user_id}`);
    if (userProfile) {
      userProfile.posts_count = Math.max(0, (userProfile.posts_count || 0) - 1);
      await safeKvSet(`user:${post.user_id}`, userProfile);
      console.log(`📊 User ${post.user_id} posts_count updated to: ${userProfile.posts_count}`);
    }
    
    // Delete all likes for this post
    const likes = await safeKvGetByPrefix(`like:${postId}:`);
    for (const like of likes) {
      await kv.del(`like:${postId}:${like.user_id}`);
    }
    
    // Delete all comments for this post
    const comments = await safeKvGetByPrefix(`comment:${postId}:`);
    for (const comment of comments) {
      await kv.del(`comment:${postId}:${comment.id}`);
    }
    
    // Delete all saves for this post
    const saves = await safeKvGetByPrefix(`save:${postId}:`);
    for (const save of saves) {
      await kv.del(`save:${postId}:${save.user_id}`);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return c.json({ error: 'Server error deleting post' }, 500);
  }
});

// Like post
app.post('/make-server-29f6739b/feed/like', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { post_id } = await c.req.json();
    
    // Find post
    const allPosts = await safeKvGetByPrefix('post:');
    const post = allPosts.find((p: any) => p.id === post_id);
    
    if (!post) return c.json({ error: 'Post not found' }, 404);
    
    // Check if already liked
    const existingLike = await safeKvGet(`like:${post_id}:${user.id}`);
    if (existingLike) {
      return c.json({ error: 'Already liked' }, 400);
    }
    
    // Create like
    await safeKvSet(`like:${post_id}:${user.id}`, {
      post_id,
      user_id: user.id,
      created_at: new Date().toISOString(),
    });
    
    // Increment count
    post.likes_count = (post.likes_count || 0) + 1;
    await safeKvSet(`post:${post.user_id}:${post.id}`, post);
    
    // Create notification for post owner
    await createNotification(post.user_id, 'like', user.id, post_id);
    
    return c.json({ success: true, likes_count: post.likes_count });
  } catch (error) {
    console.error('Like post error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Unlike post
app.post('/make-server-29f6739b/feed/unlike', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { post_id } = await c.req.json();
    
    // Find post
    const allPosts = await safeKvGetByPrefix('post:');
    const post = allPosts.find((p: any) => p.id === post_id);
    
    if (!post) return c.json({ error: 'Post not found' }, 404);
    
    // Delete like
    await kv.del(`like:${post_id}:${user.id}`);
    
    // Decrement count
    post.likes_count = Math.max(0, (post.likes_count || 0) - 1);
    await safeKvSet(`post:${post.user_id}:${post.id}`, post);
    
    return c.json({ success: true, likes_count: post.likes_count });
  } catch (error) {
    console.error('Unlike post error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Save post
app.post('/make-server-29f6739b/feed/save', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { post_id } = await c.req.json();
    
    // Check if already saved
    const existingSave = await safeKvGet(`save:${post_id}:${user.id}`);
    if (existingSave) {
      return c.json({ error: 'Already saved' }, 400);
    }
    
    // Create save
    await safeKvSet(`save:${post_id}:${user.id}`, {
      post_id,
      user_id: user.id,
      created_at: new Date().toISOString(),
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Save post error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Unsave post
app.post('/make-server-29f6739b/feed/unsave', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { post_id } = await c.req.json();
    
    // Delete save
    await kv.del(`save:${post_id}:${user.id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Unsave post error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Add comment
app.post('/make-server-29f6739b/feed/comment', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { post_id, text } = await c.req.json();
    
    if (!text || text.trim() === '') {
      return c.json({ error: 'Comment text is required' }, 400);
    }
    
    // Find post
    const allPosts = await safeKvGetByPrefix('post:');
    const post = allPosts.find((p: any) => p.id === post_id);
    
    if (!post) return c.json({ error: 'Post not found' }, 404);
    
    // Create comment
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const comment = {
      id: commentId,
      post_id,
      user_id: user.id,
      text,
      created_at: new Date().toISOString(),
    };
    
    await safeKvSet(`comment:${post_id}:${commentId}`, comment);
    
    // Increment count
    post.comments_count = (post.comments_count || 0) + 1;
    await safeKvSet(`post:${post.user_id}:${post.id}`, post);
    
    // Create notification for post owner
    await createNotification(post.user_id, 'comment', user.id, post_id, commentId);
    
    // Add user data to response
    const userProfile = await safeKvGet(`user:${user.id}`);
    
    return c.json({ 
      comment: {
        ...comment,
        user: userProfile,
      },
      comments_count: post.comments_count
    });
  } catch (error) {
    console.error('Add comment error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Delete comment
app.delete('/make-server-29f6739b/feed/comment/:commentId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const commentId = c.req.param('commentId');
    
    // Find comment
    const allComments = await safeKvGetByPrefix('comment:');
    const comment = allComments.find((cm: any) => cm.id === commentId);
    
    if (!comment) return c.json({ error: 'Comment not found' }, 404);
    
    // Check ownership
    if (comment.user_id !== user.id) {
      return c.json({ error: 'Unauthorized to delete this comment' }, 403);
    }
    
    // Delete comment
    await kv.del(`comment:${comment.post_id}:${commentId}`);
    
    // Decrement post's comment count
    const allPosts = await safeKvGetByPrefix('post:');
    const post = allPosts.find((p: any) => p.id === comment.post_id);
    
    if (post) {
      post.comments_count = Math.max(0, (post.comments_count || 0) - 1);
      await safeKvSet(`post:${post.user_id}:${post.id}`, post);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// ============================================================================
// FOLLOW SYSTEM
// ============================================================================

// Follow user
app.post('/make-server-29f6739b/follow', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { user_id } = await c.req.json();
    
    if (user_id === user.id) {
      return c.json({ error: 'Cannot follow yourself' }, 400);
    }
    
    // Check if target user exists
    const targetUser = await safeKvGet(`user:${user_id}`);
    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Add to following list
    const following = await safeKvGet(`following:${user.id}`, []);
    if (!following.includes(user_id)) {
      following.push(user_id);
      await safeKvSet(`following:${user.id}`, following);
    }
    
    // Add to followers list
    const followers = await safeKvGet(`followers:${user_id}`, []);
    if (!followers.includes(user.id)) {
      followers.push(user.id);
      await safeKvSet(`followers:${user_id}`, followers);
    }
    
    // Create notification for followed user
    await createNotification(user_id, 'follow', user.id);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Follow user error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Unfollow user
app.post('/make-server-29f6739b/unfollow', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { user_id } = await c.req.json();
    
    // Remove from following list
    const following = await safeKvGet(`following:${user.id}`, []);
    const index = following.indexOf(user_id);
    if (index > -1) {
      following.splice(index, 1);
      await safeKvSet(`following:${user.id}`, following);
    }
    
    // Remove from followers list
    const followers = await safeKvGet(`followers:${user_id}`, []);
    const followerIndex = followers.indexOf(user.id);
    if (followerIndex > -1) {
      followers.splice(followerIndex, 1);
      await safeKvSet(`followers:${user_id}`, followers);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Get user profile with stats (legacy route)
app.get('/make-server-29f6739b/profile/:userId', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('Authorization'));
    if (!currentUser) return c.json({ error: 'Unauthorized' }, 401);
    
    const userId = c.req.param('userId');
    
    console.log(`🔍 [LEGACY PROFILE] Loading profile for user: ${userId}`);
    
    // Get user profile
    let user = await safeKvGet(`user:${userId}`);
    
    // If user doesn't exist in KV store, create it from auth user data
    if (!user) {
      console.log(`⚠️  User profile not found for ${userId}, creating from auth data...`);
      
      // Validate UUID before calling getUserById
      if (!isValidUUID(userId)) {
        console.error(`❌ Invalid UUID format: ${userId}`);
        return c.json({ error: 'Invalid user ID format' }, 400);
      }
      
      try {
        // Get auth user data
        const { data: { user: authUser }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (error || !authUser) {
          console.error(`❌ Could not find auth user ${userId}:`, error);
          return c.json({ error: 'User not found' }, 404);
        }
        
        // Create initial profile
        user = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || `user${Date.now()}`,
          phone_number: authUser.phone || authUser.user_metadata?.phone_number || '',
          avatar_url: authUser.user_metadata?.avatar_url || null,
          bio: authUser.user_metadata?.bio || '',
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          created_at: authUser.created_at,
          updated_at: new Date().toISOString(),
        };
        
        await safeKvSet(`user:${userId}`, user);
        console.log(`✅ Created initial profile for user ${userId}`);
      } catch (err) {
        console.error(`❌ Error creating profile for ${userId}:`, err);
        return c.json({ error: 'User not found' }, 404);
      }
    }
    
    console.log(`📦 User object BEFORE recalc:`, {
      posts_count: user.posts_count,
      followers_count: user.followers_count,
      following_count: user.following_count,
    });
    
    // Get stats - ALWAYS recalculate
    const posts = await safeKvGetByPrefix(`post:${userId}:`);
    console.log(`📊 Found ${posts.length} posts with prefix: post:${userId}:`);
    if (posts.length > 0) {
      console.log(`   Sample post IDs:`, posts.slice(0, 3).map((p: any) => p.id));
    }
    
    const followers = await safeKvGet(`followers:${userId}`, []);
    console.log(`📊 Found ${followers.length} followers in array: followers:${userId}`);
    if (followers.length > 0) {
      console.log(`   Follower user IDs:`, followers);
    }
    
    const following = await safeKvGet(`following:${userId}`, []);
    console.log(`📊 Found ${following.length} following in array: following:${userId}`);
    if (following.length > 0) {
      console.log(`   Following user IDs:`, following);
    }
    
    // Update user profile with actual counts
    user.posts_count = posts.length;
    user.followers_count = followers.length;
    user.following_count = following.length;
    
    await safeKvSet(`user:${userId}`, user);
    console.log(`💾 Updated user profile with counts:`, {
      posts_count: user.posts_count,
      followers_count: user.followers_count,
      following_count: user.following_count,
    });
    
    // Check follow status
    const currentUserFollowing = await safeKvGet(`following:${currentUser.id}`, []);
    const currentUserFollowers = await safeKvGet(`followers:${currentUser.id}`, []);
    
    const profile = {
      ...user,
      posts_count: posts.length,
      followers_count: followers.length,
      following_count: following.length,
      is_following: currentUserFollowing.includes(userId),
      is_followed_by: currentUserFollowers.includes(userId),
    };
    
    console.log(`✅ Returning profile with counts:`, {
      posts_count: profile.posts_count,
      followers_count: profile.followers_count,
      following_count: profile.following_count,
    });
    
    return c.json({ user: profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Get user profile with stats (feed route)
app.get('/make-server-29f6739b/feed/profile/:userId', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('Authorization'));
    if (!currentUser) return c.json({ error: 'Unauthorized' }, 401);
    
    const userId = c.req.param('userId');
    
    console.log(`🔍 [FEED PROFILE] Loading profile for user: ${userId}`);
    
    // Get user profile
    let user = await safeKvGet(`user:${userId}`);
    
    // If user doesn't exist in KV store, create it from auth user data
    if (!user) {
      console.log(`⚠️  User profile not found for ${userId}, creating from auth data...`);
      
      // Validate UUID before calling getUserById
      if (!isValidUUID(userId)) {
        console.error(`❌ Invalid UUID format: ${userId}`);
        return c.json({ error: 'Invalid user ID format' }, 400);
      }
      
      try {
        // Get auth user data
        const { data: { user: authUser }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (error || !authUser) {
          console.error(`❌ Could not find auth user ${userId}:`, error);
          return c.json({ error: 'User not found' }, 404);
        }
        
        // Create initial profile
        user = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || `user${Date.now()}`,
          phone_number: authUser.phone || authUser.user_metadata?.phone_number || '',
          avatar_url: authUser.user_metadata?.avatar_url || null,
          bio: authUser.user_metadata?.bio || '',
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          created_at: authUser.created_at,
          updated_at: new Date().toISOString(),
        };
        
        await safeKvSet(`user:${userId}`, user);
        console.log(`✅ Created initial profile for user ${userId}`);
      } catch (err) {
        console.error(`❌ Error creating profile for ${userId}:`, err);
        return c.json({ error: 'User not found' }, 404);
      }
    }
    
    console.log(`📦 User object BEFORE recalc:`, {
      id: user.id,
      username: user.username,
      posts_count: user.posts_count,
      followers_count: user.followers_count,
      following_count: user.following_count,
    });
    
    // ALWAYS recalculate counts from actual data (not just when 0)
    console.log(`🔧 Calculating counts for user ${userId}...`);
    
    // Count actual posts
    const allPosts = await safeKvGetByPrefix(`post:${userId}:`);
    console.log(`📊 Found ${allPosts.length} posts with prefix: post:${userId}:`);
    if (allPosts.length > 0) {
      console.log(`   Sample post IDs:`, allPosts.slice(0, 3).map((p: any) => p.id));
      console.log(`   Sample post types:`, allPosts.slice(0, 3).map((p: any) => p.type));
    }
    
    // Count actual followers using followers:userId array
    const followersArray = await safeKvGet(`followers:${userId}`, []);
    console.log(`📊 Found ${followersArray.length} followers in array: followers:${userId}`);
    if (followersArray.length > 0) {
      console.log(`   Follower user IDs:`, followersArray);
    }
    
    // Count actual following using following:userId array
    const followingArray = await safeKvGet(`following:${userId}`, []);
    console.log(`📊 Found ${followingArray.length} following in array: following:${userId}`);
    if (followingArray.length > 0) {
      console.log(`   Following user IDs:`, followingArray);
    }
    
    // Update user profile with correct counts
    user.posts_count = allPosts.length;
    user.followers_count = followersArray.length;
    user.following_count = followingArray.length;
    
    await safeKvSet(`user:${userId}`, user);
    
    console.log(`💾 Updated user profile with counts:`, {
      posts_count: user.posts_count,
      followers_count: user.followers_count,
      following_count: user.following_count,
    });
    
    // Check if current user follows this user
    const currentUserFollowing = await safeKvGet(`following:${currentUser.id}`, []);
    const currentUserFollowers = await safeKvGet(`followers:${currentUser.id}`, []);
    
    const profile = {
      ...user,
      posts_count: user.posts_count,
      followers_count: user.followers_count,
      following_count: user.following_count,
      is_following: currentUserFollowing.includes(userId),
      is_followed_by: currentUserFollowers.includes(userId),
    };
    
    console.log(`✅ Returning profile with counts:`, {
      posts_count: profile.posts_count,
      followers_count: profile.followers_count,
      following_count: profile.following_count,
      is_following: profile.is_following,
      is_followed_by: profile.is_followed_by,
    });
    
    return c.json({ user: profile });
  } catch (error) {
    console.error('Get feed profile error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Diagnostic route - show what data exists for user
app.get('/make-server-29f6739b/profile/diagnostic', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 DIAGNOSTIC SCAN FOR USER: ${user.id}`);
    console.log(`   Username: ${user.username || 'N/A'}`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`${'='.repeat(80)}\n`);
    
    // Get user profile
    let userProfile = await safeKvGet(`user:${user.id}`);
    
    // If profile doesn't exist, create it
    if (!userProfile) {
      console.log(`⚠️  Profile not found, creating initial profile...`);
      const metadata = user.user_metadata || {};
      const emailPrefix = user.email ? user.email.split('@')[0] : 'user';
      
      userProfile = {
        id: user.id,
        email: user.email || '',
        full_name: metadata.full_name || emailPrefix,
        username: metadata.username || emailPrefix || `user${Date.now()}`,
        phone_number: user.phone || metadata.phone_number || '',
        avatar_url: metadata.avatar_url || null,
        bio: metadata.bio || '',
        posts_count: 0,
        followers_count: 0,
        following_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const saved = await safeKvSet(`user:${user.id}`, userProfile);
      if (saved) {
        console.log(`✅ Created initial profile for user ${user.id}`);
      } else {
        console.error(`❌ Failed to save initial profile for user ${user.id}`);
      }
    }
    console.log(`📦 User Profile Object:`);
    console.log(JSON.stringify(userProfile, null, 2));
    
    // Get all posts with detailed info
    console.log(`\n📊 Searching for posts with prefix: post:${user.id}:`);
    const allPosts = await safeKvGetByPrefix(`post:${user.id}:`);
    console.log(`   ✅ Found ${allPosts.length} posts`);
    if (allPosts.length > 0) {
      allPosts.forEach((post: any, idx: number) => {
        console.log(`   Post ${idx + 1}:`, {
          id: post.id,
          type: post.type,
          created_at: post.created_at,
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
        });
      });
    }
    
    // Get followers array with detailed info
    console.log(`\n📊 Searching for followers array: followers:${user.id}`);
    const followersArray = await safeKvGet(`followers:${user.id}`, []);
    console.log(`   ✅ Found ${followersArray.length} followers`);
    if (followersArray.length > 0) {
      console.log(`   Follower user IDs:`, followersArray);
      // Get each follower's info
      for (const followerId of followersArray) {
        const followerUser = await safeKvGet(`user:${followerId}`);
        console.log(`      - ${followerUser?.username || followerId} (${followerUser?.full_name || 'N/A'})`);
      }
    }
    
    // Get following array with detailed info
    console.log(`\n📊 Searching for following array: following:${user.id}`);
    const followingArray = await safeKvGet(`following:${user.id}`, []);
    console.log(`   ✅ Found ${followingArray.length} following`);
    if (followingArray.length > 0) {
      console.log(`   Following user IDs:`, followingArray);
      // Get each followed user's info
      for (const followingId of followingArray) {
        const followingUser = await safeKvGet(`user:${followingId}`);
        console.log(`      - ${followingUser?.username || followingId} (${followingUser?.full_name || 'N/A'})`);
      }
    }
    
    // Get all follow: keys (new follow request system)
    console.log(`\n📊 Searching for follow request keys: follow:`);
    const allFollowKeys = await safeKvGetByPrefix('follow:');
    const followKeysForUser = allFollowKeys.filter((f: any) => 
      f.follower_id === user.id || f.following_id === user.id
    );
    console.log(`   ✅ Found ${followKeysForUser.length} follow request records`);
    if (followKeysForUser.length > 0) {
      followKeysForUser.forEach((fr: any, idx: number) => {
        console.log(`   Follow Request ${idx + 1}:`, {
          follower_id: fr.follower_id,
          following_id: fr.following_id,
          status: fr.status,
          created_at: fr.created_at,
        });
      });
    }
    
    const diagnostic = {
      user_id: user.id,
      username: user.username,
      email: user.email,
      user_profile: userProfile,
      stored_counts: {
        posts_count: userProfile?.posts_count || 0,
        followers_count: userProfile?.followers_count || 0,
        following_count: userProfile?.following_count || 0,
      },
      actual_data: {
        posts: {
          count: allPosts.length,
          full_list: allPosts.map((p: any) => ({ 
            id: p.id, 
            type: p.type, 
            created_at: p.created_at,
            media_url: p.media_url,
            caption: p.caption?.substring(0, 50) || '',
          })),
        },
        followers: {
          count: followersArray.length,
          array: followersArray,
        },
        following: {
          count: followingArray.length,
          array: followingArray,
        },
        follow_requests: {
          count: followKeysForUser.length,
          list: followKeysForUser,
        },
      },
      recommendations: [],
    };
    
    // Add recommendations
    console.log(`\n📋 ANALYSIS:`);
    if (allPosts.length !== (userProfile?.posts_count || 0)) {
      const msg = `Posts count mismatch! Stored: ${userProfile?.posts_count || 0}, Actual: ${allPosts.length}`;
      console.log(`   ❌ ${msg}`);
      diagnostic.recommendations.push(msg);
    } else {
      console.log(`   ✅ Posts count is correct: ${allPosts.length}`);
    }
    
    if (followersArray.length !== (userProfile?.followers_count || 0)) {
      const msg = `Followers count mismatch! Stored: ${userProfile?.followers_count || 0}, Actual: ${followersArray.length}`;
      console.log(`   ❌ ${msg}`);
      diagnostic.recommendations.push(msg);
    } else {
      console.log(`   ✅ Followers count is correct: ${followersArray.length}`);
    }
    
    if (followingArray.length !== (userProfile?.following_count || 0)) {
      const msg = `Following count mismatch! Stored: ${userProfile?.following_count || 0}, Actual: ${followingArray.length}`;
      console.log(`   ❌ ${msg}`);
      diagnostic.recommendations.push(msg);
    } else {
      console.log(`   ✅ Following count is correct: ${followingArray.length}`);
    }
    
    if (diagnostic.recommendations.length === 0) {
      diagnostic.recommendations.push('All counts are accurate! ✅');
      console.log(`\n✅ All counts are accurate!`);
    } else {
      diagnostic.recommendations.push('⚠️ Use the repair endpoint to fix counts: POST /profile/repair-counts');
      console.log(`\n⚠️  FIX NEEDED: Use the "Fix Profile Counts" button in Settings`);
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`DIAGNOSTIC COMPLETE`);
    console.log(`${'='.repeat(80)}\n`);
    
    return c.json({ diagnostic });
  } catch (error) {
    console.error('Diagnostic error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
    return c.json({ 
      error: 'Server error running diagnostic',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Repair user counts - recalculate from actual data
app.post('/make-server-29f6739b/profile/repair-counts', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    console.log(`🔧 Manual count repair requested for user ${user.id}...`);
    
    // Get user profile
    let userProfile = await safeKvGet(`user:${user.id}`);
    
    // If profile doesn't exist, create it
    if (!userProfile) {
      console.log(`⚠️  Profile not found, creating initial profile...`);
      const metadata = user.user_metadata || {};
      const emailPrefix = user.email ? user.email.split('@')[0] : 'user';
      
      userProfile = {
        id: user.id,
        email: user.email || '',
        full_name: metadata.full_name || emailPrefix,
        username: metadata.username || emailPrefix || `user${Date.now()}`,
        phone_number: user.phone || metadata.phone_number || '',
        avatar_url: metadata.avatar_url || null,
        bio: metadata.bio || '',
        posts_count: 0,
        followers_count: 0,
        following_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const saved = await safeKvSet(`user:${user.id}`, userProfile);
      if (saved) {
        console.log(`✅ Created initial profile for user ${user.id}`);
      } else {
        console.error(`❌ Failed to save initial profile for user ${user.id}`);
      }
    }
    
    // Count actual posts using the correct key pattern
    const allPosts = await safeKvGetByPrefix(`post:${user.id}:`);
    console.log(`📊 Found ${allPosts.length} posts for user ${user.id}`);
    
    // Count actual followers using the followers array
    const followersArray = await safeKvGet(`followers:${user.id}`, []);
    console.log(`📊 Found ${followersArray.length} followers for user ${user.id}`);
    
    // Count actual following using the following array
    const followingArray = await safeKvGet(`following:${user.id}`, []);
    console.log(`📊 Found ${followingArray.length} following for user ${user.id}`);
    
    // Update user profile with correct counts
    const oldCounts = {
      posts: userProfile.posts_count || 0,
      followers: userProfile.followers_count || 0,
      following: userProfile.following_count || 0,
    };
    
    userProfile.posts_count = allPosts.length;
    userProfile.followers_count = followersArray.length;
    userProfile.following_count = followingArray.length;
    
    await safeKvSet(`user:${user.id}`, userProfile);
    
    console.log(`✅ Counts repaired for user ${user.id}:`);
    console.log(`   Posts: ${oldCounts.posts} → ${userProfile.posts_count}`);
    console.log(`   Followers: ${oldCounts.followers} → ${userProfile.followers_count}`);
    console.log(`   Following: ${oldCounts.following} → ${userProfile.following_count}`);
    
    return c.json({ 
      success: true,
      old_counts: oldCounts,
      new_counts: {
        posts: userProfile.posts_count,
        followers: userProfile.followers_count,
        following: userProfile.following_count,
      },
      message: 'Counts repaired successfully'
    });
  } catch (error) {
    console.error('Repair counts error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
    return c.json({ 
      error: 'Server error repairing counts',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get followers list
app.get('/make-server-29f6739b/followers/:userId', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('Authorization'));
    if (!currentUser) return c.json({ error: 'Unauthorized' }, 401);
    
    const userId = c.req.param('userId');
    const followerIds = await safeKvGet(`followers:${userId}`, []);
    
    // Get user data for each follower
    const followers = [];
    for (const followerId of followerIds) {
      const followerUser = await safeKvGet(`user:${followerId}`);
      if (followerUser) {
        followers.push(followerUser);
      }
    }
    
    return c.json({ followers });
  } catch (error) {
    console.error('Get followers error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Get following list
app.get('/make-server-29f6739b/following/:userId', async (c) => {
  try {
    const currentUser = await verifyUser(c.req.header('Authorization'));
    if (!currentUser) return c.json({ error: 'Unauthorized' }, 401);
    
    const userId = c.req.param('userId');
    const followingIds = await safeKvGet(`following:${userId}`, []);
    
    // Get user data for each followed user
    const following = [];
    for (const followedId of followingIds) {
      const followedUser = await safeKvGet(`user:${followedId}`);
      if (followedUser) {
        following.push(followedUser);
      }
    }
    
    return c.json({ following });
  } catch (error) {
    console.error('Get following error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// ============================================================================
// REELS FEED
// ============================================================================

// Get reels-only feed
app.get('/make-server-29f6739b/feed/reels', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    // Get all reels (type === 'reel')
    const allPosts = await safeKvGetByPrefix('post:');
    const reels = allPosts.filter((p: any) => p.type === 'reel');
    
    // Sort by created_at desc
    reels.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Add user data and like/save status
    for (const reel of reels) {
      const reelUser = await safeKvGet(`user:${reel.user_id}`);
      reel.user = reelUser;
      reel.is_liked = !!(await safeKvGet(`like:${reel.id}:${user.id}`));
      reel.is_saved = !!(await safeKvGet(`save:${reel.id}:${user.id}`));
      
      // Get comments count
      const comments = await safeKvGetByPrefix(`comment:${reel.id}:`);
      reel.comments_count = comments.length;
    }
    
    return c.json({ reels });
  } catch (error) {
    console.error('Get reels feed error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// ============================================================================
// NOTIFICATIONS SYSTEM
// ============================================================================

// Get user notifications
app.get('/make-server-29f6739b/notifications', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    // Get all notifications for this user
    const notifications = await safeKvGetByPrefix(`notification:${user.id}:`);
    
    // Sort by created_at desc (newest first)
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Add actor user data
    for (const notif of notifications) {
      if (notif.actor_id) {
        const actorUser = await safeKvGet(`user:${notif.actor_id}`);
        notif.actor = actorUser;
      }
      
      // Add post data if post_id exists
      if (notif.post_id) {
        const allPosts = await safeKvGetByPrefix('post:');
        const post = allPosts.find((p: any) => p.id === notif.post_id);
        if (post) {
          notif.post = post;
        }
      }
    }
    
    return c.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Mark notification as read
app.post('/make-server-29f6739b/notifications/:notificationId/read', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const notificationId = c.req.param('notificationId');
    
    // Find notification
    const notifications = await safeKvGetByPrefix(`notification:${user.id}:`);
    const notification = notifications.find((n: any) => n.id === notificationId);
    
    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }
    
    // Check ownership
    if (notification.user_id !== user.id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    // Mark as read
    notification.read = true;
    notification.read_at = new Date().toISOString();
    await safeKvSet(`notification:${user.id}:${notificationId}`, notification);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Mark all notifications as read
app.post('/make-server-29f6739b/notifications/read-all', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const notifications = await safeKvGetByPrefix(`notification:${user.id}:`);
    
    for (const notification of notifications) {
      if (!notification.read) {
        notification.read = true;
        notification.read_at = new Date().toISOString();
        await safeKvSet(`notification:${user.id}:${notification.id}`, notification);
      }
    }
    
    return c.json({ success: true, count: notifications.length });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return c.json({ error: 'Server error' }, 500);
  }
});

// Helper function to create notification
async function createNotification(userId: string, type: string, actorId: string, postId?: string, commentId?: string) {
  try {
    // Don't notify yourself
    if (userId === actorId) return;
    
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notification = {
      id: notificationId,
      user_id: userId,
      type, // 'like', 'comment', 'follow', 'follow_request', 'follow_accepted'
      actor_id: actorId,
      post_id: postId,
      comment_id: commentId,
      read: false,
      created_at: new Date().toISOString(),
    };
    
    await safeKvSet(`notification:${userId}:${notificationId}`, notification);
    console.log(`📬 Created ${type} notification for user ${userId} from ${actorId}`);
  } catch (error) {
    console.error('Create notification error:', error);
  }
}

// Server startup
console.log('🚀 ========================================');
console.log('🚀 AuroraLink Server Starting...');
console.log('🚀 ========================================');

Deno.serve(app.fetch);

console.log('✅ ========================================');
console.log('✅ AuroraLink Server Ready!');
console.log('✅ Health check: /make-server-29f6739b/health');
console.log('✅ ========================================');
