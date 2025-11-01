# 🔧 Chat Interface Troubleshooting Guide

## Common Issues & Quick Fixes

### 1. **Messages Not Scrolling to Bottom**

#### Symptoms
- New messages appear but screen doesn't scroll
- Have to manually scroll to see new messages
- Stuck at old position

#### Diagnosis
```typescript
// Check in browser console:
console.log('Should auto scroll:', shouldAutoScrollRef.current);
console.log('Is user scrolling:', isUserScrollingRef.current);
```

#### Solutions

**A. User Scrolled Up (Expected Behavior)**
- This is intentional! User is reading old messages
- Scroll to bottom manually to re-enable auto-scroll
- This matches WhatsApp behavior

**B. State Got Stuck**
```typescript
// Force reset the scroll state
shouldAutoScrollRef.current = true;
scrollToBottom(true, 'smooth');
```

**C. Ref Not Attached**
```typescript
// Verify refs are attached:
console.log('End ref:', messagesEndRef.current);
console.log('Container ref:', messagesContainerRef.current);
```

### 2. **Layout Breaks When Keyboard Appears**

#### Symptoms
- Composer gets hidden behind keyboard
- Messages area doesn't shrink
- Weird spacing issues

#### Check This
```css
/* Container should have: */
.h-screen-safe {
  height: 100vh;
  height: -webkit-fill-available; /* iOS fix */
}

/* Messages should have: */
.flex-1 {
  flex: 1 1 0%;
  min-height: 0; /* Critical! */
}

/* Composer should have: */
.shrink-0 {
  flex-shrink: 0;
}
```

#### iOS Safari Specific
```html
<!-- Add to index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
```

### 3. **Scroll Position Jumps Around**

#### Symptoms
- Screen jumps when new messages arrive
- Can't stay on old messages
- Erratic scrolling behavior

#### Root Cause
Usually auto-scroll triggering when it shouldn't

#### Fix
```typescript
// Make sure scroll detection threshold is right:
const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

// Increase threshold if too sensitive:
const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
```

#### Debug
```typescript
// Add to scroll handler:
const handleScroll = () => {
  const { scrollTop, scrollHeight, clientHeight } = container;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  
  console.log('Distance from bottom:', distanceFromBottom);
  console.log('Is near bottom:', distanceFromBottom < 150);
};
```

### 4. **Messages Look Cramped**

#### Check Spacing
```typescript
// In message rendering:
{isLastInGroup ? 'mb-1.5' : 'mb-[2px]'}

// Should be:
- mb-[2px]   = 2px between messages in same group
- mb-1.5     = 6px between different groups
```

#### Check Container Padding
```css
/* Should be: */
.chat-container {
  padding: 0.5rem; /* 8px all around */
}
```

### 5. **Safe Area Issues on Notched Devices**

#### Symptoms
- Header/composer cut off by notch
- Content hidden behind home indicator
- Uneven padding

#### Check These Classes
```tsx
<div className="pt-safe">       {/* Header */}
<div className="pb-safe">       {/* Composer */}
<div className="h-screen-safe"> {/* Container */}
```

#### Verify CSS
```css
.pt-safe {
  padding-top: env(safe-area-inset-top);
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}

.h-screen-safe {
  height: 100vh;
  height: -webkit-fill-available;
}
```

### 6. **Performance Issues / Laggy Scrolling**

#### Symptoms
- Scroll feels janky
- Stutters when scrolling
- Slow to respond

#### Check Event Listeners
```typescript
// Should use passive listeners:
container.addEventListener('scroll', handleScroll, { passive: true });
```

#### Verify CSS
```css
.smooth-scroll {
  -webkit-overflow-scrolling: touch;
  will-change: scroll-position;
  overscroll-behavior: contain;
}
```

#### Reduce Re-renders
```typescript
// Use refs instead of state for scroll flags:
const shouldAutoScrollRef = useRef(true);  // ✅ Good
const [shouldAutoScroll, setShouldAutoScroll] = useState(true); // ❌ Bad
```

### 7. **Initial Load Doesn't Scroll to Bottom**

#### Symptoms
- Chat loads but shows top of conversation
- Have to scroll down manually on first load

#### Fix
```typescript
useEffect(() => {
  if (messages.length === 0) return;
  
  const isInitialLoad = lastMessageCountRef.current === 0;
  
  if (isInitialLoad) {
    // Use 'auto' for instant scroll on initial load
    setTimeout(() => scrollToBottom(true, 'auto'), 50);
  }
}, [messages]);
```

### 8. **Messages Have Wrong Colors**

#### Check CSS Variables
```css
/* Light mode */
--message-sent: #0057FF;
--message-sent-foreground: #FFFFFF;
--message-received: #F3F4F6;
--message-received-foreground: #000000;

/* Dark mode */
.dark {
  --message-sent: #005C4B;
  --message-sent-foreground: #FFFFFF;
  --message-received: #1F2937;
  --message-received-foreground: #FFFFFF;
}
```

### 9. **Avatar Not Showing/Wrong Size**

#### Check These
```tsx
<Avatar
  size="sm"               // Should be "sm"
  className="w-7 h-7"     // 28px exactly
  showBorder={true}       // For better visibility
/>
```

#### Debug
```typescript
console.log('Avatar URL:', message.sender?.avatar_url);
console.log('Fallback text:', message.sender?.full_name);
```

### 10. **Date Separators Not Showing**

#### Logic Check
```typescript
const showDateSeparator = index === 0 || 
  new Date(message.created_at).toDateString() !== 
  new Date(prevMessage.created_at).toDateString();
```

#### Verify Data
```typescript
console.log('Current date:', new Date(message.created_at).toDateString());
console.log('Prev date:', prevMessage ? new Date(prevMessage.created_at).toDateString() : 'none');
```

## Browser-Specific Issues

### iOS Safari

**Issue**: Layout jumps when keyboard appears
```css
/* Fix */
body {
  position: fixed;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

#root {
  height: 100vh;
  height: -webkit-fill-available;
  overflow: hidden;
}
```

**Issue**: Scroll bounces at top/bottom
```css
/* Fix */
.messages-container {
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
```

### Android Chrome

**Issue**: Address bar hiding/showing causes jumps
```css
/* Use dvh instead of vh */
.h-screen-safe {
  height: 100dvh;
}
```

**Issue**: Pull-to-refresh interfering
```css
.messages-container {
  overscroll-behavior-y: contain;
}
```

## Performance Debugging

### Check Re-renders
```typescript
// Add to component:
useEffect(() => {
  console.log('ConversationScreen rendered');
});

// Add to message bubble:
useEffect(() => {
  console.log('MessageBubble rendered:', message.id);
});
```

### Monitor Scroll Performance
```typescript
let lastLog = 0;
const handleScroll = () => {
  const now = Date.now();
  if (now - lastLog > 1000) { // Log once per second
    console.log('Scroll FPS:', Math.round(1000 / (now - lastLog)));
    lastLog = now;
  }
};
```

### Check Memory Leaks
```typescript
// Verify cleanup:
useEffect(() => {
  const interval = setInterval(...);
  
  return () => {
    clearInterval(interval); // Must clean up!
  };
}, []);
```

## Quick Diagnostic Checklist

### ✅ Scroll Behavior
- [ ] Initial load scrolls to bottom instantly
- [ ] Sending message scrolls to bottom smoothly
- [ ] Receiving message scrolls when at bottom
- [ ] Receiving message preserves scroll when up
- [ ] Scrolling to bottom re-enables auto-scroll
- [ ] No jumps or janky behavior

### ✅ Layout
- [ ] Header fixed at top
- [ ] Messages area scrollable
- [ ] Composer fixed at bottom
- [ ] Keyboard doesn't hide composer
- [ ] Safe areas respected
- [ ] No horizontal scroll

### ✅ Spacing
- [ ] 2px between messages in group
- [ ] 6px between different groups
- [ ] Date separators have 8px margins
- [ ] Container has 8px padding
- [ ] Avatars 28px with 6px gap

### ✅ Visual
- [ ] Bubbles have correct colors
- [ ] Shadows are subtle (0.13 opacity)
- [ ] Tails point correct direction
- [ ] Timestamps bottom-right, 11px
- [ ] Read receipts showing correctly
- [ ] Avatars showing and sized right

### ✅ Performance
- [ ] Smooth 60 FPS scrolling
- [ ] No lag when typing
- [ ] Fast initial load
- [ ] Efficient re-renders
- [ ] No memory leaks

## Emergency Reset

If everything is broken:

```typescript
// 1. Force scroll to bottom
useEffect(() => {
  setTimeout(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, 100);
}, [messages]);

// 2. Reset all refs
shouldAutoScrollRef.current = true;
isUserScrollingRef.current = false;
lastScrollHeight.current = 0;

// 3. Clear and reload messages
setMessages([]);
setTimeout(() => loadConversation(true), 100);
```

## Getting Help

### Information to Provide

1. **Browser & Device**
   - Browser name and version
   - Device model
   - OS version

2. **Console Logs**
   - Any error messages
   - Scroll state values
   - Ref values

3. **Steps to Reproduce**
   - Exact actions taken
   - Expected behavior
   - Actual behavior

4. **Screenshots**
   - Current appearance
   - Console showing errors
   - Network tab if applicable

### Useful Debug Code

```typescript
// Add to ConversationScreen:
useEffect(() => {
  console.log('=== CHAT DEBUG ===');
  console.log('Messages:', messages.length);
  console.log('Should auto scroll:', shouldAutoScrollRef.current);
  console.log('Is user scrolling:', isUserScrollingRef.current);
  console.log('Container:', messagesContainerRef.current ? 'attached' : 'missing');
  console.log('End ref:', messagesEndRef.current ? 'attached' : 'missing');
  
  if (messagesContainerRef.current) {
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    console.log('Scroll state:', {
      scrollTop,
      scrollHeight,
      clientHeight,
      distanceFromBottom: scrollHeight - scrollTop - clientHeight
    });
  }
}, [messages]);
```

## Summary

Most issues are caused by:
1. ❌ Missing refs
2. ❌ Wrong CSS for flex layout
3. ❌ Safe area not handled
4. ❌ Scroll state stuck
5. ❌ Too many re-renders

**Quick Fix Process:**
1. Check browser console for errors
2. Verify refs are attached
3. Check scroll state values
4. Verify CSS classes
5. Test on different device/browser
6. Use debug code above

---

**Status**: ✅ Most issues preventable with proper implementation  
**Difficulty**: 🟢 Easy to debug with right tools  
**Documentation**: 📚 Comprehensive troubleshooting provided
