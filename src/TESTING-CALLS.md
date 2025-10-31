# 🧪 Testing Voice & Video Calls

## Quick Test Guide

### Setup (Required)
You need **2 browser windows** or **2 devices** to test calls:

1. **Window A**: Login as User A
2. **Window B**: Login as User B (different account)

### Test Scenario 1: Voice Call

#### Step 1: Initiate Call (User A)
1. Open a chat with User B
2. Click the **phone icon** in the top right
3. Grant microphone permission when prompted
4. ✅ You should see: "Calling User B..." with ringing animation

#### Step 2: Receive Call (User B)
1. Within 2 seconds, an incoming call dialog appears
2. ✅ You should see: User A's photo, name, and "Incoming call..."
3. Click the **green phone button** to accept
4. Grant microphone permission

#### Step 3: Active Call (Both Users)
1. ✅ Both users see the call duration timer (00:01, 00:02, etc.)
2. ✅ Test mute button - other person can't hear you
3. ✅ Test unmute - other person can hear you again
4. ✅ Either user can click red button to end call

#### Expected Results:
- Clear audio quality
- Real-time duration counter
- Smooth mute/unmute transitions
- Clean call ending

---

### Test Scenario 2: Video Call

#### Step 1: Initiate Call (User A)
1. Open a chat with User B
2. Click the **video camera icon** in the top right
3. Grant camera + microphone permissions
4. ✅ You should see: Your video in corner, "Calling..." status

#### Step 2: Receive Call (User B)
1. Incoming video call dialog appears
2. ✅ Shows video camera icon and "Incoming video call..."
3. Click the **green video button** to accept
4. Grant camera + microphone permissions

#### Step 3: Active Call (Both Users)
1. ✅ See other person's video in full screen
2. ✅ See your own video in small corner (draggable)
3. ✅ Test mute button - audio muted
4. ✅ Test camera off button - video stops
5. ✅ Test fullscreen button
6. ✅ Click red button to end call

#### Expected Results:
- Both videos visible and smooth
- Picture-in-picture local video
- All controls work properly
- Clean call ending

---

### Test Scenario 3: Reject Call

#### User A: Initiate Call
1. Start a voice or video call

#### User B: Reject Call
1. When incoming call appears, click **red decline button**

#### Expected Results:
- ✅ User B: "Call declined" toast message
- ✅ User A: Call ends automatically
- ✅ Both return to chat screen

---

### Test Scenario 4: Multiple Tabs

#### Setup
1. Open 3 browser tabs
2. Tab 1: User A
3. Tab 2: User B (first instance)
4. Tab 3: User B (second instance)

#### Test
1. User A calls User B
2. ✅ Both Tab 2 and Tab 3 (User B) should show incoming call
3. Accept in Tab 2
4. ✅ Tab 3's incoming call should disappear
5. ✅ Only Tab 2 is in the call

---

## 🔍 What to Check

### Console Logs
Open browser DevTools → Console:

```
[Call] Initiating voice call to User Name
[Call] Remote stream received
[Call] Connected
```

### Network Tab
1. Check API calls to `/calls/initiate`
2. Should see polling to `/calls/incoming`
3. During call: polling to `/calls/{id}/signals`

### Permissions
1. Browser should prompt for permissions
2. Check: `chrome://settings/content/camera`
3. Check: `chrome://settings/content/microphone`

---

## ❌ Common Issues & Fixes

### Issue: "No incoming call appears"
**Diagnosis:**
- Check console for errors
- Verify backend is running
- Check polling is active

**Fix:**
```javascript
// In console, manually check:
await fetch('https://{projectId}.supabase.co/functions/v1/make-server-29f6739b/calls/incoming', {
  headers: { 'Authorization': 'Bearer {token}' }
})
```

### Issue: "Permission denied"
**Diagnosis:**
- Browser blocked camera/microphone

**Fix:**
1. Click lock icon in address bar
2. Allow camera and microphone
3. Refresh page
4. Try call again

### Issue: "No video/audio"
**Diagnosis:**
- Camera/mic in use by another app
- Wrong device selected
- Hardware issue

**Fix:**
1. Close other apps using camera/mic
2. Check system settings
3. Try different browser
4. Restart device

### Issue: "Call connects but no media"
**Diagnosis:**
- WebRTC connection issue
- Firewall/NAT blocking

**Fix:**
1. Check network settings
2. Try different network
3. Check STUN server accessibility
4. May need TURN server for complex networks

---

## 📊 Performance Metrics

### Expected Metrics:
- **Call setup time**: < 3 seconds
- **Audio latency**: < 200ms
- **Video framerate**: 24-30 fps
- **Signal polling**: Every 1-2 seconds

### How to Measure:
```javascript
// In console during call:
// Check RTCPeerConnection stats
const pc = webrtcManager.current?.getPeerConnection();
const stats = await pc?.getStats();
stats.forEach(stat => console.log(stat));
```

---

## 🎯 Test Checklist

### Basic Functionality
- [ ] Voice call initiates successfully
- [ ] Video call initiates successfully
- [ ] Incoming call appears within 2 seconds
- [ ] Accept call works
- [ ] Reject call works
- [ ] End call works (both users)
- [ ] Call duration counter updates

### Audio Tests
- [ ] Can hear other person
- [ ] Other person can hear me
- [ ] Mute button works
- [ ] Unmute button works
- [ ] Audio quality is clear

### Video Tests
- [ ] Can see other person's video
- [ ] Other person can see my video
- [ ] Local video appears in corner
- [ ] Local video is draggable
- [ ] Camera off button works
- [ ] Camera on button works
- [ ] Fullscreen works
- [ ] Video quality is good

### Error Handling
- [ ] Permission denied shows helpful message
- [ ] Network error shows helpful message
- [ ] Call failure handled gracefully
- [ ] Multiple calls handled properly
- [ ] Browser refresh during call handled

### UI/UX
- [ ] Call screen looks professional
- [ ] Buttons are responsive
- [ ] Animations are smooth
- [ ] Status messages are clear
- [ ] Loading states appear when needed

---

## 🚀 Advanced Testing

### Load Testing
1. Make multiple sequential calls
2. Test call duration > 10 minutes
3. Test rapid accept/reject/end

### Network Testing
1. Test on WiFi
2. Test on mobile data (if applicable)
3. Test with throttled network (Chrome DevTools)
4. Test with network interruption

### Device Testing
1. Test on desktop
2. Test on mobile
3. Test different browsers
4. Test with external webcam/mic

---

## 💡 Tips

1. **Use headphones** to prevent echo
2. **Test in quiet environment** for best audio quality
3. **Good lighting** for better video quality
4. **Check browser support** - use modern browsers
5. **Monitor console** - catch errors early

---

## 📞 Quick Command Reference

```javascript
// Check if call is active
console.log(activeCall)

// Check WebRTC connection state
webrtcManager.current?.getPeerConnection()?.connectionState

// Check local stream
console.log(localStream?.getTracks())

// Check remote stream
console.log(remoteStream?.getTracks())

// Force end call (emergency)
handleEndCall()
```

---

## ✅ Success Criteria

A successful test means:
1. ✅ Calls initiate quickly (< 3 seconds)
2. ✅ Media quality is good
3. ✅ Controls work as expected
4. ✅ No console errors
5. ✅ Clean call endings
6. ✅ Proper state management
7. ✅ Good user experience

Happy testing! 🎉
