# Quick Fix Guide: Authentication Errors

## If You See the Auth Error Screen

### ✅ Simple Solution (Recommended)
1. Click the **"Clear Session & Reload"** button
2. Wait for the page to reload
3. Log in again with your credentials

That's it! The app will automatically:
- Sign you out from Supabase
- Clear all corrupted session data
- Reload the page
- Show the login screen

### 🔧 Alternative: Browser Console Commands

If the button doesn't work, open the browser console and run:

```javascript
// Basic clear (recommended)
window.clearAuroraSession()

// Emergency clear (if basic doesn't work)
window.emergencyClearSession()
```

### 🚨 If Issues Persist

After 3 failed auth attempts, the app will automatically:
- Skip the error screen
- Go straight to the auth screen
- Let you try logging in fresh

## Common Causes

### 1. Switched Projects
**Why it happens**: You logged into a different AuroraLink instance
**Solution**: Click "Clear Session & Reload"

### 2. Session Expired
**Why it happens**: You were logged in for a long time
**Solution**: Click "Clear Session & Reload"

### 3. Browser Data Conflict
**Why it happens**: Cached data from old sessions
**Solution**: Click "Clear Session & Reload"

## Prevention Tips

- ✅ Use one AuroraLink instance per browser tab
- ✅ Log out properly when switching projects
- ✅ Refresh the page if you see unusual behavior
- ✅ Clear browser cache periodically

## For Developers

### Debug Mode
Check the browser console for detailed logs:
- `[Session Recovery]` - Session validation logs
- `[Startup]` - App initialization logs
- `[Auth]` - Authentication process logs
- `[Auth Error]` - Error recovery logs

### Key Error Messages
- "Token from different project" → Project mismatch
- "Token is expired" → Session too old
- "Invalid JWT format" → Corrupted token
- "Auth session missing" → Critical auth error

### Manual Testing
Force an auth error for testing:
```javascript
// Corrupt the session
localStorage.setItem('sb-[project-id]-auth-token', 'invalid-data')
// Reload page to trigger error detection
window.location.reload()
```

## Technical Details

The fix includes:
- Automatic session validation on startup
- Comprehensive error detection
- Infinite loop prevention (max 3 retries)
- Graceful degradation to auth screen
- Complete session cleanup on error

All session clearing now uses the `clearAuthSession()` utility which:
1. Finds all Supabase-related localStorage keys
2. Removes auth tokens and session data
3. Cleans up any corrupted entries
4. Logs the cleanup process

## Need More Help?

Check these documents:
- `AUTH-ERROR-BOUNDARY-FIX.md` - Complete technical details
- `AUTH-SESSION-ERROR-FIX.md` - Original session fix documentation
- `AUTH-DOCS-INDEX.md` - All auth documentation

Or open the browser console and look for error messages starting with:
- `[Session Recovery]`
- `[Startup]`
- `[Auth Error]`
