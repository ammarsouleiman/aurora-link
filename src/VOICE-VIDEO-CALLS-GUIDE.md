# 📞 Voice & Video Calls - Complete Guide

## Overview
AuroraLink now features **production-ready voice and video calling** using WebRTC with signaling through your Supabase backend!

## ✨ Features

### Voice Calls
- 📞 Crystal-clear audio quality with echo cancellation
- 🎙️ Mute/unmute controls
- ⏱️ Real-time call duration tracking
- 🔔 Incoming call notifications with ringtone UI
- 📱 Accept/reject call controls

### Video Calls
- 📹 HD video streaming (up to 720p)
- 🎥 Front/back camera support
- 📺 Picture-in-picture local video preview
- 🚫 Camera on/off toggle
- 🎙️ Mute/unmute controls
- 🖥️ Fullscreen mode
- 💅 Professional WhatsApp-style UI

## 🎯 How to Use

### Making a Call
1. Open any direct message conversation (calls work only in DMs, not groups)
2. Click the **video camera icon** (top right) for video call
3. Or click the **phone icon** for voice call
4. Grant camera/microphone permissions when prompted
5. Wait for the other person to answer

### Receiving a Call
1. An incoming call dialog will appear automatically
2. See the caller's name, photo, and call type
3. Click the **green button** to accept
4. Or click the **red button** to decline
5. Grant permissions when accepting

### During a Call
- **Mute/Unmute**: Toggle microphone
- **Video On/Off**: Toggle camera (video calls only)
- **End Call**: Red hang-up button
- **Fullscreen**: Expand video to fullscreen (video calls only)

## 🏗️ Architecture

### Components
- **CallScreen** (`/components/screens/CallScreen.tsx`)
  - Main call interface
  - Handles video/voice UI
  - Controls (mute, video, end call)
  
- **IncomingCallDialog** (`/components/IncomingCallDialog.tsx`)
  - Beautiful incoming call overlay
  - Accept/reject interface
  
- **WebRTCManager** (`/utils/webrtc.ts`)
  - WebRTC connection management
  - Media stream handling
  - ICE candidate processing

### Backend Routes
All in `/supabase/functions/server/index.tsx`:

- `POST /calls/initiate` - Start a new call
- `POST /calls/signal` - Send WebRTC signals (offer, answer, ICE candidates)
- `GET /calls/:callId/signals` - Poll for incoming signals
- `POST /calls/accept` - Accept an incoming call
- `POST /calls/reject` - Reject an incoming call
- `POST /calls/end` - End an active call
- `GET /calls/incoming` - Check for incoming calls

### Data Flow
1. **Caller initiates call** → Backend creates call record
2. **Recipient polls** → Detects incoming call
3. **Recipient accepts** → Both establish WebRTC connection
4. **Signaling** → Offer/Answer/ICE candidates exchanged via backend
5. **Media flows** → Direct peer-to-peer WebRTC connection
6. **Either user ends** → Cleanup and return to chat

## 🔧 Technical Details

### WebRTC Configuration
- **STUN servers**: Google's public STUN servers
- **Media constraints**:
  - Audio: Echo cancellation, noise suppression, auto gain
  - Video: 1280x720 ideal resolution, front camera default

### Storage in KV Store
```typescript
// Call record
call: {
  id: string,
  caller_id: string,
  recipient_id: string,
  call_type: 'voice' | 'video',
  status: 'ringing' | 'accepted' | 'rejected' | 'ended',
  started_at: timestamp,
  ended_at?: timestamp,
  duration?: number
}

// Call signals (WebRTC signaling)
call_signal:{callId}:{signalId}: {
  signal_type: 'offer' | 'answer' | 'ice-candidate',
  signal_data: RTCSessionDescription | RTCIceCandidate,
  from_user_id: string,
  to_user_id: string,
  created_at: timestamp
}

// Incoming call notification
call_incoming:{userId}: callId
```

### State Management
The App.tsx manages:
- `activeCall` - Current active call state
- `incomingCall` - Incoming call waiting for answer
- `localStream` - User's camera/microphone stream
- `remoteStream` - Other person's stream
- `webrtcManager` - WebRTC connection manager

### Polling Intervals
- **Incoming calls**: Checked every 2 seconds
- **Signals**: Polled every 1 second during active call

## 🎨 UI/UX Features

### Voice Call Screen
- Large animated avatar of the other person
- Call status (Connecting... / Ringing... / 00:23)
- Animated pulse rings during ringing
- Floating controls at bottom
- Beautiful gradient background

### Video Call Screen
- Remote video fullscreen
- Draggable picture-in-picture local video
- Overlay controls (auto-hide possible)
- Call info at top
- Professional shadows and animations

### Incoming Call Dialog
- Modal overlay with blur backdrop
- Caller avatar with pulse animation
- Clear call type indicator (voice/video)
- Large accept (green) and reject (red) buttons
- Smooth animations

## 🚀 Performance Optimizations

1. **Peer-to-peer media**: After signaling, media flows directly between peers
2. **Signal polling**: Only during active calls
3. **Stream cleanup**: Properly stops all tracks on call end
4. **Memory management**: WebRTC connections closed properly

## 🐛 Troubleshooting

### "Failed to access camera/microphone"
- **Solution**: Grant permissions in browser settings
- Check: Browser → Settings → Site Settings → Permissions

### "Call failed to connect"
- **Solution**: Check network/firewall settings
- STUN/TURN servers may be blocked
- Try different network

### "No incoming call notification"
- **Solution**: Ensure backend is running
- Check browser console for polling errors
- Verify user is logged in

### "Video not showing"
- **Solution**: Restart call
- Check camera not in use by another app
- Try voice call first to test

## 🔐 Security Considerations

1. **Media encryption**: WebRTC encrypts all media streams
2. **Signaling**: Goes through authenticated backend
3. **Access control**: Only call participants can exchange signals
4. **Session validation**: All requests require valid JWT token

## 🎯 Future Enhancements

Potential improvements:
- [ ] Group video calls (multi-party)
- [ ] Screen sharing
- [ ] Call history with duration tracking
- [ ] Push notifications for incoming calls
- [ ] TURN server for better NAT traversal
- [ ] Recording capabilities
- [ ] Reactions during calls
- [ ] Background blur for video

## 📱 Browser Compatibility

✅ **Fully Supported:**
- Chrome/Edge 80+
- Firefox 75+
- Safari 14+
- Opera 67+

⚠️ **Limited Support:**
- Safari 11-13 (audio only)
- Mobile browsers (may require HTTPS)

❌ **Not Supported:**
- Internet Explorer
- Very old browsers

## 💡 Best Practices

1. **Always test permissions**: Prompt users clearly
2. **Handle errors gracefully**: Show helpful error messages
3. **Cleanup properly**: Always end calls cleanly
4. **Monitor connection**: Handle network drops
5. **User feedback**: Show connection status clearly

## 📞 Quick Reference

### Start a Video Call
```typescript
// From conversation screen, click video icon
handleInitiateCall(recipientUser, 'video')
```

### Start a Voice Call
```typescript
// From conversation screen, click phone icon
handleInitiateCall(recipientUser, 'voice')
```

### Accept Incoming Call
```typescript
// Shown automatically when call arrives
handleAcceptCall()
```

### End Call
```typescript
// Click red hang-up button
handleEndCall()
```

---

## 🎉 Ready to Call!

Your AuroraLink app now has professional-grade calling! Users can make crystal-clear voice and HD video calls directly from any chat conversation. The system uses industry-standard WebRTC with your secure Supabase backend for signaling.

**Try it out:** Open a chat and click the phone or video icon! 📞📹
