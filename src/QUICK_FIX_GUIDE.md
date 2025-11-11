# 🔧 Quick Fix Guide - Auth Errors

## If You See "Auth session missing" Errors

### Automatic Fix (No Action Needed)
The app now automatically detects and clears invalid sessions. Just wait for the page to reload.

### Manual Fix (If Needed)

If you're still seeing errors, open your browser console (F12) and run:

```javascript
fixAuthNow()
```

This will:
1. Clear all session data
2. Clear localStorage
3. Clear sessionStorage  
4. Clear cookies
5. Reload the page

### What Changed in Build 8.0.6

✅ **Pre-flight Check**: Invalid tokens are caught BEFORE making any API calls  
✅ **Immediate Clearing**: Bad sessions are cleared on page load  
✅ **Auto-Reload**: Page automatically reloads to login screen  
✅ **Better Errors**: Clear messages about what went wrong  
✅ **Import Fixes**: Fixed missing imports causing TypeErrors  

### Common Errors Fixed

1. **"Auth session missing"** → Invalid/expired token → Auto-cleared ✅
2. **"TypeError: (void 0) is not a function"** → Wrong import path → Fixed ✅
3. **Wrong project tokens** → Detected and cleared immediately ✅
4. **Expired tokens** → Caught before use → Auto-cleared ✅

### How to Prevent Issues

1. **Don't manually edit localStorage** - Let the app manage it
2. **Log out properly** - Use the logout button, don't just close the browser
3. **One project at a time** - Don't switch between different Supabase projects in the same browser
4. **Clear browser on errors** - If you see repeated errors, run `fixAuthNow()`

### Console Commands

```javascript
// Quick fix for auth errors
fixAuthNow()

// Check if session is valid
window.checkSession()

// Clear session (basic)
window.clearAuroraSession()

// Emergency clear (nuclear option)
window.emergencyClearSession()

// Check token cache
window.checkTokenCache()
```

### What Happens When Token Is Invalid

```
1. Page loads
   ↓
2. Pre-flight validator checks token
   ↓
3. If invalid:
   - Logs error to console
   - Clears localStorage
   - Clears sessionStorage
   - Shows toast message
   - Redirects to login
   ↓
4. If valid:
   - Continues normal startup
   - Monitors for 401 errors
   - Auto-refreshes when near expiry
```

### Technical Details

The new validation checks:
- ✅ Token format (must be valid JWT)
- ✅ Token structure (must have 3 parts)
- ✅ Project match (issuer must match current project)
- ✅ Expiration (must not be expired)

### Still Having Issues?

1. Run `fixAuthNow()` in console
2. If that doesn't work, manually clear browser data:
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Clear storage"
   - Click "Clear site data"
3. Refresh the page
4. Log in again

---

**Build 8.0.6** - Comprehensive Auth Error Fix  
November 1, 2025
