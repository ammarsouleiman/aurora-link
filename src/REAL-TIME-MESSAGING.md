# AuroraLink Real-Time Messaging

## ✅ Activated Features

### 1. **Phone Number Search & Direct Messaging**
- Users can search for other users by phone number
- Automatically creates a direct message conversation when a user is found
- Seamless flow from search → chat creation → messaging

### 2. **Real-Time Message Polling**
- **ConversationScreen**: Messages refresh every 2 seconds
- **HomeScreen**: Conversations list refreshes every 3 seconds
- New messages appear automatically without page refresh

### 3. **Message Sending & Receiving**
- Full message support (text, images, files)
- Reply to messages
- Message status tracking
- Typing indicators (API ready)

### 4. **User Experience**
- Toast notifications for important actions
- Auto-scroll to latest message
- Loading states and skeletons
- Error handling with user-friendly messages

## 🔄 How It Works

### Search User by Phone
1. Click "New Chat" button (+ icon)
2. Click "Find User by Phone Number"
3. Enter phone number in E.164 format
4. Click "Search"
5. When user is found, click "Start Chat"
6. Automatically creates conversation and opens chat screen

### Send Messages
1. Type your message in the composer
2. Press Enter or click Send button
3. Message is sent to backend
4. Message appears in chat immediately
5. Other user receives message on next poll (2 seconds)

### Receive Messages
- Messages automatically refresh every 2 seconds
- No manual refresh needed
- Conversation list updates every 3 seconds

## 📡 Backend Endpoints

### Conversations
- `POST /conversations/create` - Create new conversation
- `GET /conversations` - List user's conversations
- `GET /conversations/:id` - Get conversation with messages

### Messages
- `POST /messages/send` - Send a message
- `POST /messages/mark-read` - Mark messages as read
- `POST /messages/react` - React to a message

### User Search
- `POST /users/search-by-phone` - Find user by phone number (searches Supabase Auth)

## 🎯 Key Features

### ✅ Working Now
- ✅ User signup with phone number
- ✅ Phone number stored in KV store for search
- ✅ Phone number search functionality
- ✅ Automatic conversation creation
- ✅ Real-time message polling
- ✅ Send text messages
- ✅ Receive messages
- ✅ Message history
- ✅ Conversation list
- ✅ User online status
- ✅ Dark/light theme

### 🚀 Ready for Enhancement
- WebSocket real-time (upgrade from polling)
- Push notifications
- Voice/video calling
- Message reactions
- Read receipts
- Media messages (images/files)
- Group chats
- User presence (online/offline)

## 💬 Quick Start

1. **Sign up** with email, password, name, and phone number
2. **Find a friend** by clicking + → "Find User by Phone Number"
3. **Search** their phone number (e.g., +1234567890)
4. **Start chatting** - conversation is created automatically
5. **Send messages** - they appear in real-time!

## 🔧 Technical Details

### Polling Intervals
- **Messages**: 2 seconds (ConversationScreen)
- **Conversations**: 3 seconds (HomeScreen)

### Data Storage
- **Supabase Auth**: User authentication + phone numbers in user_metadata
- **KV Store**: Messages, conversations, user profiles

### Message Flow
```
User A types message
    ↓
Frontend sends to /messages/send
    ↓
Backend saves to KV store
    ↓
User B polls every 2 seconds
    ↓
User B receives new message
```

## 📝 Notes

- No email verification required - signup is instant
- Phone number is required for signup
- Phone number must be in E.164 format (+1234567890)
- **Phone numbers are stored in Supabase Auth user_metadata** (single source of truth)
- Phone search queries Supabase Auth Admin API directly
- Messages are stored permanently in KV store
- **Smart loading states** - Only show loaders on initial load, silent background updates
- **Background polling** - Messages refresh every 3s, conversations every 5s (silently)
- Polling can be upgraded to WebSocket for true real-time later

## 📱 Phone Number Storage

Phone numbers are stored **exclusively in Supabase Auth** (`user.user_metadata.phone_number`) and searched via the Admin API. There is NO separate phone index in the KV store. This ensures:
- Single source of truth
- Automatic cleanup when users are deleted
- Consistent data across the system
- Secure storage in Supabase infrastructure

See [PHONE-NUMBER-STORAGE.md](./PHONE-NUMBER-STORAGE.md) for detailed technical information.
