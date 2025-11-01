# Voice Messages Troubleshooting Guide

## Common Issues and Solutions

### 1. "Microphone Access Denied" Error

**Problem:** Browser blocks microphone access when trying to record.

**Solutions:**
- Click the lock icon in your browser's address bar
- Find "Microphone" permissions and set to "Allow"
- Refresh the page after changing permissions
- If blocked permanently, you may need to reset site permissions:
  - Chrome: Settings → Privacy & Security → Site Settings → Microphone
  - Firefox: Settings → Privacy & Security → Permissions → Microphone
  - Safari: Preferences → Websites → Microphone

### 2. "No Microphone Found" Error

**Problem:** Browser cannot detect any microphone.

**Solutions:**
- Check if your microphone is connected and powered on
- Try unplugging and reconnecting your microphone
- Check system sound settings to verify microphone is detected
- Try a different microphone
- On Mac: System Settings → Privacy & Security → Microphone
- On Windows: Settings → Privacy → Microphone

### 3. "Microphone is Busy" Error

**Problem:** Another application is using the microphone.

**Solutions:**
- Close other applications that might use the microphone (Zoom, Skype, Discord, etc.)
- Close other browser tabs that might be using the microphone
- Restart your browser
- Restart your computer if the issue persists

### 4. Recording Doesn't Start

**Problem:** Clicking the microphone button does nothing.

**Solutions:**
- Check if you denied the permission dialog - you'll need to enable it in settings
- Make sure you're using a supported browser (Chrome, Firefox, Safari, Edge)
- Try the microphone test in Settings to diagnose the issue
- Clear browser cache and reload the page

### 5. No Sound in Voice Messages

**Problem:** Recording works but playback is silent.

**Solutions:**
- Check your microphone volume in system settings
- Test your microphone in another app to verify it's working
- Make sure you're speaking close enough to the microphone
- Check if the microphone is muted in system settings

### 6. Poor Audio Quality

**Problem:** Voice messages sound distorted or unclear.

**Solutions:**
- Move closer to the microphone
- Reduce background noise
- Use an external microphone for better quality
- Check microphone settings and adjust input volume
- Avoid speaking too loudly (which can cause distortion)

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Edge 49+
- ✅ Firefox 25+
- ✅ Safari 11+
- ✅ Opera 36+

### Not Supported
- ❌ Internet Explorer
- ❌ Older mobile browsers

## Security Requirements

### HTTPS Required
Voice recording requires a secure connection (HTTPS) except when testing on:
- `localhost`
- `127.0.0.1`
- `::1` (IPv6 localhost)

If you see permission errors on a deployed site, make sure it's served over HTTPS.

## Permission States

### Prompt (Default)
- User hasn't decided yet
- Permission dialog will appear when clicking record
- Can grant or deny permission

### Granted
- User has allowed microphone access
- Recording will start immediately
- Can be revoked in browser settings

### Denied
- User has blocked microphone access
- Must manually enable in browser settings
- App cannot request again programmatically

## Testing Your Setup

### Using the Built-in Test
1. Go to Settings
2. Scroll to "Microphone Test" section
3. Click "Test Microphone"
4. Grant permission when prompted
5. Check the result

### Manual Testing
1. Open another app that uses microphone (e.g., voice recorder)
2. Verify microphone works there
3. If it works elsewhere, the issue is with browser permissions
4. If it doesn't work anywhere, check system settings

## Getting Help

If you've tried all troubleshooting steps and voice messages still don't work:

1. **Check browser console for errors:**
   - Press F12 to open developer tools
   - Look for red errors in the Console tab
   - Share these errors when asking for help

2. **Provide system information:**
   - Browser name and version
   - Operating system
   - Microphone model/type
   - Error messages you see

3. **Try a different browser:**
   - Sometimes browser-specific issues can be resolved by switching browsers
   - This helps identify if it's a browser issue or system issue

## Privacy & Security

### What We Record
- Audio is only recorded when you press and hold the microphone button
- No passive listening or background recording
- Recordings are stored securely in encrypted storage

### Permissions We Need
- **Microphone access:** To record voice messages
- **Storage access:** To temporarily store recordings before upload

### Your Privacy
- You can revoke microphone access anytime in browser settings
- Deleting a voice message removes it from our servers
- We never share recordings with third parties
