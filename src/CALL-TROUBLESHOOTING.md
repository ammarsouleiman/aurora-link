# 🔧 Call Troubleshooting Guide

## Quick Diagnostics

### ❓ How to Know What's Wrong

#### 1. Check Console Messages
Open DevTools (F12) → Console tab:

**Healthy Call:**
```
[Call] Initiating voice call to John Doe
[WebRTC] Created and set local offer
[Call] Remote stream received
[Call] Connected
```

**Problem Call:**
```
❌ [WebRTC] Failed to get user media: NotAllowedError
❌ [Call] Error initiating call: Permission denied
```

#### 2. Check Call State
```javascript
// In console:
console.log('Active Call:', activeCall)
console.log('Local Stream:', localStream)
console.log('Remote Stream:', remoteStream)
console.log('WebRTC State:', webrtcManager.current?.getPeerConnection()?.connectionState)
```

---

## 🚨 Common Problems & Solutions

### Problem 1: "Failed to access camera/microphone"

#### Symptoms:
- Call fails to start
- Error message about permissions
- Console: `NotAllowedError` or `NotFoundError`

#### Causes:
- ❌ Permissions not granted
- ❌ Camera/mic in use by another app
- ❌ No camera/mic available
- ❌ Browser settings blocking

#### Solutions:

**Solution A: Grant Permissions**
```
Chrome: chrome://settings/content/camera
Firefox: about:preferences#privacy
Safari: Preferences → Websites → Camera/Microphone
```

**Solution B: Check Device Availability**
```javascript
// In console:
navigator.mediaDevices.enumerateDevices()
  .then(devices => console.log(devices))
```

**Solution C: Clear Browser Cache**
1. Close all tabs of the site
2. Clear site data
3. Restart browser
4. Try again

---

### Problem 2: "Call doesn't connect"

#### Symptoms:
- Stuck on "Connecting..." or "Ringing..."
- No video/audio after accepting
- Call ends immediately

#### Causes:
- ❌ Network/firewall blocking WebRTC
- ❌ STUN server unreachable
- ❌ Backend not responding
- ❌ Signaling failure

#### Solutions:

**Solution A: Check Backend**
```javascript
// Test backend endpoint:
fetch('https://{projectId}.supabase.co/functions/v1/make-server-29f6739b/health')
  .then(r => r.json())
  .then(d => console.log('Backend:', d))
```

**Solution B: Check WebRTC Connection**
```javascript
// In console during call:
const pc = webrtcManager.current?.getPeerConnection()
console.log('Connection State:', pc?.connectionState)
console.log('ICE State:', pc?.iceConnectionState)
console.log('Signaling State:', pc?.signalingState)
```

**Solution C: Network Test**
```javascript
// Test STUN server:
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
})
pc.onicecandidate = e => console.log('ICE:', e.candidate)
pc.createOffer()
  .then(offer => pc.setLocalDescription(offer))
```

---

### Problem 3: "Incoming call doesn't appear"

#### Symptoms:
- Recipient doesn't see incoming call dialog
- No notification of incoming call
- Call appears but delayed (> 5 seconds)

#### Causes:
- ❌ Polling not working
- ❌ Not logged in
- ❌ Backend error
- ❌ Browser tab inactive

#### Solutions:

**Solution A: Check Polling**
```javascript
// In console:
console.log('Current View:', currentView)
console.log('Current User:', currentUser)
// Polling only works when currentView !== 'call'
```

**Solution B: Manual Check**
```javascript
// Manually check for incoming calls:
const result = await callsApi.checkIncoming()
console.log('Incoming calls:', result)
```

**Solution C: Verify Login**
```javascript
// Check if logged in:
const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)
```

---

### Problem 4: "No audio/video during call"

#### Symptoms:
- Call connects but can't hear/see other person
- Can see self but not other person
- Other person can see/hear you but you can't see/hear them

#### Causes:
- ❌ Remote stream not received
- ❌ Media tracks not added
- ❌ Audio/video muted
- ❌ WebRTC negotiation failed

#### Solutions:

**Solution A: Check Streams**
```javascript
// In console during call:
console.log('Local Stream Tracks:', localStream?.getTracks())
console.log('Remote Stream Tracks:', remoteStream?.getTracks())

// Check if tracks are active:
localStream?.getTracks().forEach(track => {
  console.log(`${track.kind}: enabled=${track.enabled}, muted=${track.muted}`)
})
```

**Solution B: Check WebRTC Stats**
```javascript
const pc = webrtcManager.current?.getPeerConnection()
const stats = await pc?.getStats()
stats.forEach(stat => {
  if (stat.type === 'inbound-rtp') {
    console.log('Receiving:', stat)
  }
})
```

**Solution C: Restart Call**
1. End current call
2. Wait 3 seconds
3. Start new call
4. Check if media flows

---

### Problem 5: "Poor video/audio quality"

#### Symptoms:
- Choppy video
- Audio cutting out
- Lag/delay
- Low framerate

#### Causes:
- ❌ Poor network connection
- ❌ CPU overload
- ❌ Too many tabs open
- ❌ Low bandwidth

#### Solutions:

**Solution A: Check Network**
```javascript
// Check connection:
navigator.connection?.effectiveType // Should be '4g'
navigator.connection?.downlink // Should be > 1 Mbps
```

**Solution B: Reduce Quality**
```javascript
// Lower resolution (in webrtc.ts):
video: {
  width: { ideal: 640 },  // Instead of 1280
  height: { ideal: 480 }, // Instead of 720
  facingMode: 'user',
}
```

**Solution C: Close Other Apps**
1. Close unnecessary browser tabs
2. Close other video apps
3. Disable browser extensions
4. Restart browser

---

### Problem 6: "Call ends unexpectedly"

#### Symptoms:
- Call disconnects after few seconds/minutes
- "Call ended" appears suddenly
- Returns to chat without warning

#### Causes:
- ❌ Network interruption
- ❌ Browser tab closed/refreshed
- ❌ Device went to sleep
- ❌ Other person ended call

#### Solutions:

**Solution A: Check Connection State**
```javascript
// Monitor connection:
webrtcManager.current?.onConnectionStateChange((state) => {
  console.log('Connection state changed:', state)
  if (state === 'failed' || state === 'disconnected') {
    console.error('Call connection lost!')
  }
})
```

**Solution B: Network Monitoring**
```javascript
// Listen for offline events:
window.addEventListener('online', () => console.log('Back online'))
window.addEventListener('offline', () => console.log('Lost connection'))
```

---

## 🔍 Advanced Debugging

### WebRTC Stats Inspector
```javascript
async function inspectCall() {
  const pc = webrtcManager.current?.getPeerConnection()
  if (!pc) return console.log('No peer connection')
  
  const stats = await pc.getStats()
  const report = {}
  
  stats.forEach(stat => {
    if (!report[stat.type]) report[stat.type] = []
    report[stat.type].push(stat)
  })
  
  console.table(report)
}

// Run during active call:
inspectCall()
```

### Signal History
```javascript
// Check signals exchanged:
const result = await callsApi.getSignals(activeCall.id)
console.log('Signals:', result.data?.signals)
```

### Backend Logs
Check server logs in Supabase dashboard:
1. Go to Edge Functions
2. Click on `make-server-29f6739b`
3. View logs
4. Look for call-related messages

---

## 🚨 Emergency Fixes

### Nuclear Option: Force Reset
```javascript
// If everything is broken:
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### Manual Call Cleanup
```javascript
// If call state is stuck:
if (webrtcManager.current) {
  webrtcManager.current.cleanup()
}
localStream?.getTracks().forEach(track => track.stop())
setActiveCall(null)
setLocalStream(null)
setRemoteStream(null)
setCurrentView('home')
```

---

## 📋 Diagnostic Checklist

Run through this before reporting an issue:

- [ ] Browser is up to date
- [ ] Permissions granted
- [ ] Backend is running
- [ ] Logged in successfully
- [ ] Network connection stable
- [ ] No firewall blocking WebRTC
- [ ] Camera/mic not in use elsewhere
- [ ] Tried in incognito mode
- [ ] Tried different browser
- [ ] Checked console for errors
- [ ] Checked Network tab in DevTools

---

## 🆘 Still Stuck?

### Collect Debug Info:

```javascript
// Copy this entire output:
console.log({
  browser: navigator.userAgent,
  currentView,
  hasActiveCall: !!activeCall,
  hasLocalStream: !!localStream,
  hasRemoteStream: !!remoteStream,
  webrtcState: webrtcManager.current?.getPeerConnection()?.connectionState,
  iceState: webrtcManager.current?.getPeerConnection()?.iceConnectionState,
  localTracks: localStream?.getTracks().map(t => ({
    kind: t.kind,
    enabled: t.enabled,
    muted: t.muted
  })),
  remoteTracks: remoteStream?.getTracks().map(t => ({
    kind: t.kind,
    enabled: t.enabled,
    muted: t.muted
  }))
})
```

### Report Format:
```
**Issue**: [Brief description]
**Steps to reproduce**: [1. Do this, 2. Then this...]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Console errors**: [Copy errors here]
**Debug info**: [Paste output from above]
**Browser**: [Chrome 120, Firefox 115, etc.]
**Device**: [Desktop Windows, Mobile iOS, etc.]
```

---

## ✅ Prevention Tips

1. **Test permissions first**: Always test in settings before making important calls
2. **Use good network**: WiFi preferred over cellular
3. **Keep browser updated**: WebRTC improves with each version
4. **Close other apps**: Free up camera/mic resources
5. **Monitor console**: Catch issues early
6. **Use headphones**: Prevent echo and feedback

---

## 🎯 Quick Fixes by Error Message

### "NotAllowedError: Permission denied"
→ Grant camera/microphone permissions in browser settings

### "NotFoundError: Requested device not found"
→ Plug in camera/mic, or check device drivers

### "AbortError: Starting videoinput failed"
→ Close other apps using camera

### "TypeError: Cannot read property 'getPeerConnection'"
→ WebRTC manager not initialized, restart call

### "Failed to fetch"
→ Backend down or network issue, check connection

### "Unauthorized"
→ Session expired, log out and log back in

---

Remember: Most call issues are related to **permissions**, **network**, or **device availability**. Start there! 🚀
