# Voice Messages & Emoji Reactions

## Overview
AuroraLink now supports voice messages and emoji reactions, providing a richer messaging experience similar to modern messaging apps like WhatsApp.

## Voice Messages

### Features
- **Record Audio**: Hold the microphone button to start recording
- **Live Waveform**: Visual feedback during recording
- **Pause/Resume**: Pause and resume recording as needed
- **Duration Counter**: Shows recording duration in real-time
- **Playback Controls**: Play/pause, seek, and duration display
- **Auto-send**: Voice messages are automatically sent when recording is complete

### How to Use
1. In a conversation, click the microphone button (appears when the input is empty)
2. Recording starts automatically - speak your message
3. Use the pause button to pause recording
4. Click send to finish and send the voice message
5. Click cancel (X) to discard the recording

### Technical Details
- Uses Web MediaRecorder API
- Audio format: WebM
- Files are uploaded to Supabase Storage as attachments
- Message type: `voice`
- Requires microphone permissions

## Emoji Reactions

### Features
- **Quick Reactions**: React to any message with emojis
- **Multiple Reactions**: Messages can have multiple different emoji reactions
- **Reaction Count**: Shows count when multiple users react with the same emoji
- **Emoji Picker**: Browse emojis by category (Smileys, Gestures, Hearts, Objects)
- **Visual Display**: Reactions appear below the message bubble

### How to Use
1. Hover over any message to see the action buttons
2. Click the smile icon to open the emoji picker
3. Select an emoji from the categories
4. The reaction is added to the message instantly

### Available Emoji Categories
- **Smileys**: Faces and expressions
- **Gestures**: Hands and gestures
- **Hearts**: Various heart emojis
- **Objects**: Celebration and activity emojis

## Message Composer Enhancements

### Emoji Input
- Click the smile icon in the message input to add emojis to your text
- Emojis can be combined with text messages
- Emoji picker appears as a popover above the input

### Voice Recording UI
- When recording, the entire composer transforms into a recording interface
- Shows waveform animation for visual feedback
- Displays recording duration
- Provides pause/resume and cancel options

## Backend Integration

### Voice Messages
- Uploaded to: `make-29f6739b-attachments` bucket
- Attachment type: `audio`
- Stored with signed URLs for secure access

### Reactions
- Stored in KV store with key pattern: `reaction:{messageId}:{userId}`
- Each reaction includes: id, message_id, user_id, emoji, created_at
- Reactions are fetched along with messages for real-time display

## Components

### New Components
1. **EmojiPicker** (`/components/EmojiPicker.tsx`)
   - Tabbed interface for emoji categories
   - Grid layout for easy selection
   - Popover-based UI

2. **VoiceRecorder** (`/components/VoiceRecorder.tsx`)
   - Recording controls and UI
   - Waveform animation
   - Timer and pause/resume functionality

3. **VoiceMessagePlayer** (`/components/VoiceMessagePlayer.tsx`)
   - Audio playback controls
   - Seekable progress bar
   - Duration display

### Updated Components
1. **MessageComposer** - Integrated emoji picker and voice recording
2. **MessageBubble** - Added reaction display and voice message player
3. **ConversationScreen** - Added reaction handling

## Future Enhancements

### Potential Features
- [ ] Remove reactions (currently only add is supported)
- [ ] More emoji categories and search
- [ ] Voice message speed control (1.5x, 2x playback)
- [ ] Visual waveform for voice messages
- [ ] Voice message drafts
- [ ] Custom emoji/stickers
- [ ] Reaction notifications
- [ ] Long-press for quick reactions (mobile)

## Browser Compatibility

- Voice Recording: Requires modern browsers with MediaRecorder API support
- Emojis: Universal support across all modern browsers
- Audio Playback: HTML5 Audio element (universal support)

## Troubleshooting Voice Messages

### Common Issues

**"Microphone Access Denied"**
- Click the lock icon in your browser's address bar
- Set Microphone permissions to "Allow"
- Refresh the page

**Permission Dialog Appears**
- First time using voice messages, you'll see a permission dialog
- Click "Allow Microphone Access" to enable recording
- You can test your microphone in Settings → Microphone Test

**No Microphone Found**
- Check if your microphone is connected and powered on
- Verify it works in other apps
- Check system sound settings

**Microphone Already in Use**
- Close other apps using the microphone (Zoom, Skype, etc.)
- Close other browser tabs that might be recording

### Testing Your Microphone
1. Go to Settings
2. Find "Microphone Test" card
3. Click "Test Microphone"
4. Follow the prompts to grant access
5. Verify it's working

### Need More Help?
See [Voice Messages Troubleshooting Guide](docs/voice-messages-troubleshooting.md) for detailed solutions.
