# 🚀 Quick Start - Build 8.0.8

## For Users: 3 Simple Steps

1. **Open AuroraLink**
2. **Log in** with your email and password
3. **Done!** Everything works normally

That's it! 🎉

---

## For Developers: What Changed

```typescript
// NEW: Nuclear session cleaner (runs FIRST)
import './utils/nuclear-session-cleaner';

// Clears ALL localStorage/sessionStorage once per build
// Version: v8.0.8-nuclear-20251102
```

```typescript
// UPDATED: API error handling
if (response.status === 401) {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = window.location.origin;
}
```

---

## Console Commands

### Check if nuclear clear ran:
```javascript
localStorage.getItem('aurora_nuclear_clear')
// Should return: "v8.0.8-nuclear-20251102"
```

### Force nuclear clear again:
```javascript
localStorage.removeItem('aurora_nuclear_clear');
location.reload();
```

### Manual session clear:
```javascript
clearAuroraSession();
```

---

## Expected Behavior

### ✅ First Load After Update
```
1. Nuclear cleaner runs
2. All storage cleared
3. User sees login screen
4. User logs in
5. App works normally
```

### ✅ Second Load (and all future loads)
```
1. Nuclear cleaner checks version
2. Version matches → skip clear
3. App continues with existing session
4. No logout required
```

---

## Troubleshooting

### Still seeing "Auth session missing!" errors?

**Try this:**
```javascript
// In console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then log in again.

### Need to debug?

**Check console for:**
```
[NUCLEAR] ✅ NUCLEAR CLEAR COMPLETE
[AuroraLink] v8.0.8 - Nuclear Auth Fix Build
[AuroraLink] 🧹 All auth session errors fixed
```

---

## Support

📖 **Full documentation:** `/BUILD_8.0.8_NUCLEAR_FIX.md`  
👥 **User guide:** `/USER_GUIDE_8.0.8.md`  
📊 **Status report:** `/BUILD_STATUS_8.0.8.md`

---

**Build 8.0.8 - Auth errors fixed! ✅**
