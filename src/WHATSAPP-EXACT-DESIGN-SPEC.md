# 📱 WhatsApp-Exact Design Specification

## Complete Design Token System

### 🎨 **1. Input Bar Specifications**

#### Dimensions
```
Height: 58px (including padding)
Min Height: 44px (input field)
Max Height: 200px (when expanded with text)
Bottom Padding: max(6px, env(safe-area-inset-bottom))
```

#### Input Field (Pill-Shaped)
```css
Border Radius: 20px
Padding: 10px 14px (vertical horizontal)
Font Size: 15px
Line Height: 1.4
Background: #F3F4F6 (light) / #1E2838 (dark)
Max Height: 120px (scrollable after)
```

#### Icon Sizes
```
Emoji/Attach/Mic: 22px × 22px
Send Icon: 20px × 20px
Button Container: 36px × 36px (action buttons)
Send Button Container: 44px × 44px
```

#### Animation
```css
Transition: 160-220ms cubic-bezier(0.25, 0.8, 0.25, 1)
Active Scale: 0.95 (send button)
Active Scale: 0.92 (action buttons)
```

---

### 💬 **2. Message Bubble Specifications**

#### Dimensions
```
Max Width: 72% of screen width
Min Width: 50px
Padding: 10px 12px (text bubbles)
Padding: 10px (media bubbles)
```

#### Border Radius (WhatsApp Asymmetry)
```css
/* Sent (Right Side) */
Border Radius: 16px
Top Right: 4px (sharp corner on last in group)
Regular: 16px (all corners when not last)

/* Received (Left Side) */
Border Radius: 16px
Top Left: 4px (sharp corner on last in group)
Regular: 16px (all corners when not last)
```

#### Colors
```css
/* Sent Messages */
Background: #0057FF
Text: #FFFFFF

/* Received Messages */
Background: #F3F4F6
Text: #111827

/* Dark Mode Sent */
Background: #005C4B
Text: #FFFFFF

/* Dark Mode Received */
Background: #1F2937
Text: #F9FAFB
```

#### Shadows
```css
box-shadow: 0 1px 0.5px rgba(11, 20, 26, 0.13);

/* Dark Mode */
box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
```

#### Vertical Spacing
```
Within Group: 3px (mb-[3px])
Between Groups: 12px (mb-3)
Avatar to Bubble: 8px (gap-2)
```

---

### 👤 **3. Avatar Specifications**

#### Size
```
Width: 32px (w-8)
Height: 32px (h-8)
Border Radius: 50% (circular)
Border: 2px solid white (optional, for online status)
```

#### Display Rules
```
Show: Only for first message in group (received messages)
Hide: For sent messages
Hide: For subsequent messages in same group
```

#### Position
```
Alignment: Bottom of message group (self-end)
Gap from Bubble: 8px (gap-2)
```

---

### ⏱️ **4. Timestamp Specifications**

#### Typography
```
Font Size: 11px
Font Weight: 400 (normal)
Opacity: 70%
Color: Inherit from bubble
```

#### Position
```
Under Bubble: 2px margin top (mt-0.5)
Alignment: Match bubble alignment (left/right)
Inside Bubble (with text): Bottom-right, absolute
Padding from Edge: 12px right, 8px bottom
```

#### Format
```
12-hour format: "2:45 PM"
24-hour format: "14:45" (based on locale)
```

---

### ✓ **5. Read Receipt Specifications**

#### Icon Sizes
```
Width: 14px (w-3.5)
Height: 14px (h-3.5)
Stroke Width: 2px
```

#### Colors
```css
/* Sent (Single Check) */
Color: rgba(255, 255, 255, 0.6)
Opacity: 60%

/* Delivered (Double Checks) */
Color: rgba(255, 255, 255, 0.6)
Opacity: 60%

/* Read (Double Checks) */
Color: #53bdeb
Opacity: 100%
```

#### Position
```
Alignment: Next to timestamp
Gap from Timestamp: 4px (ml-1)
Vertical Alignment: Center with timestamp
```

---

### 📷 **6. Media Card Specifications**

#### Image Messages
```
Min Width: 200px
Max Width: 330px
Max Height: 400px
Border Radius: 12px
Aspect Ratio: Auto (maintains original)
```

#### Padding
```
Container Padding: 0 (image fills container)
Caption Padding: 12px 10px (if caption exists)
Overlay Padding: 8px (timestamp overlay)
```

#### Gradient Overlay
```css
/* For timestamp visibility */
background: linear-gradient(
  180deg,
  transparent 0%,
  rgba(0, 0, 0, 0.3) 50%,
  rgba(0, 0, 0, 0.6) 100%
);
height: 64px (from bottom)
```

#### Shadow
```css
box-shadow: 0 1px 0.5px rgba(11, 20, 26, 0.13);
```

---

### ✨ **7. Animation Specifications**

#### Message Appear
```css
Duration: 180ms
Easing: cubic-bezier(0.25, 0.8, 0.25, 1)
Transform: translateY(10px) → translateY(0)
Scale: 0.95 → 1
Opacity: 0 → 1
```

#### Button Press (Active State)
```css
Duration: 120ms
Easing: cubic-bezier(0.25, 0.8, 0.25, 1)
Transform: scale(0.95) for send button
Transform: scale(0.92) for action buttons
```

#### Keyboard Transition
```css
Duration: 200ms
Easing: cubic-bezier(0.25, 0.8, 0.25, 1)
Property: all (smooth layout shift)
```

#### Hover States (Desktop)
```css
Transition: 150ms ease
Opacity: 0 → 1 (message actions)
Background: transparent → var(--hover-surface)
```

---

### 📐 **8. Responsive Breakpoints**

#### Extra Small Phones (< 375px)
```css
Container Padding: 8px (px-2)
Message Max Width: 75%
Font Size: 15px
Avatar Size: 28px
```

#### Small Phones (375px - 413px)
```css
Container Padding: 8px (px-2)
Message Max Width: 72%
Font Size: 15px
Avatar Size: 32px
```

#### Medium Phones (414px - 767px)
```css
Container Padding: 8px (px-2)
Message Max Width: 72%
Font Size: 15px
Avatar Size: 32px
```

#### Large Phones (768px+)
```css
Container Padding: 12px (px-3)
Message Max Width: 68%
Font Size: 15px
Avatar Size: 32px
```

---

### 📏 **9. Exact Spacing Tokens**

#### Message Container
```
Padding Horizontal: 8px (px-2)
Padding Vertical: 8px (py-2)
Min Height: Full viewport minus header/composer
```

#### Message Groups
```
First Message Top Margin: 0
Between Messages (Same Sender): 3px
Between Messages (Different Sender): 12px
Last Message Bottom Margin: 12px
```

#### Composer Spacing
```
Container Padding: 6px 8px
Gap Between Elements: 6px
Bottom Safe Area: env(safe-area-inset-bottom)
```

#### Header Spacing
```
Padding Horizontal: 12px (px-3)
Padding Vertical: 8px (py-2)
Gap Between Elements: 10px (gap-2.5)
Avatar Size: 40px (w-10 h-10)
Icon Size: 20px (w-5 h-5)
```

---

### 🎯 **10. Typography System**

#### Message Text
```
Font Size: 15px
Line Height: 1.4 (normal messages)
Line Height: 1.45 (long messages > 200 chars)
Font Weight: 400 (normal)
Color: Inherit from bubble
```

#### Timestamps
```
Font Size: 11px
Line Height: 1.2
Font Weight: 400
Opacity: 70%
```

#### Date Separators
```
Font Size: 11px
Line Height: 1.2
Font Weight: 400
Padding: 6px 10px (px-2.5 py-1)
Border Radius: 6px (rounded-md)
Background: rgba(var(--surface), 0.95) with blur
```

#### Sender Names (Group Chats)
```
Font Size: 12px
Line Height: 1.2
Font Weight: 500 (medium)
Margin Bottom: 2px
```

---

### 🎨 **11. Color Palette (Complete)**

#### Light Mode
```css
--primary: #0057FF
--primary-foreground: #FFFFFF
--background: #FFFFFF
--foreground: #111827
--surface: #F7F8FA
--muted: #F3F4F6
--muted-foreground: #6B7280
--border: #E5E7EB

/* Chat Specific */
--chat-background: #EFEAE2
--message-sent: #0057FF
--message-sent-foreground: #FFFFFF
--message-received: #F3F4F6
--message-received-foreground: #111827

/* Read Receipts */
--read-receipt-read: #53bdeb
--read-receipt-delivered: #9CA3AF
--read-receipt-sent: #9CA3AF
```

#### Dark Mode
```css
--primary: #0057FF
--primary-foreground: #FFFFFF
--background: #0B0F1A
--foreground: #F9FAFB
--surface: #151D2E
--muted: #1E2838
--muted-foreground: #9CA3AF
--border: #2D3748

/* Chat Specific */
--chat-background: #0B0F1A
--message-sent: #005C4B
--message-sent-foreground: #FFFFFF
--message-received: #1F2937
--message-received-foreground: #F9FAFB
```

---

### 🔲 **12. Border Radius System**

```css
/* Buttons */
Button (Round): 50% (full circle)
Button (Rounded): 8px

/* Input Fields */
Input (Pill): 20px
Input (Standard): 8px

/* Messages */
Message Bubble: 16px
Message Corner Cut: 4px (WhatsApp asymmetry)
Image in Message: 12px

/* Cards */
Card: 12px
Dialog: 16px
Modal: 20px

/* Avatars */
Avatar: 50% (circular)
```

---

### 📱 **13. Touch Target Sizes (WCAG 2.1 AA)**

```css
/* Minimum Touch Targets */
Primary Buttons: 44px × 44px
Action Buttons: 36px × 36px (with 44px interactive area)
Text Input: 44px minimum height
Links: 44px × 44px minimum
Avatar (Tappable): 40px × 40px

/* Recommended */
Send Button: 44px × 44px
Emoji Button: 36px × 36px
Attach Button: 36px × 36px
Mic Button: 36px × 36px (48px when solo)
```

---

### ⚡ **14. Performance Targets**

#### Animation Frame Rates
```
Scrolling: 60 FPS
Message Appear: 60 FPS
Keyboard Transition: 60 FPS
Button Press: 60 FPS
```

#### Load Times
```
Initial Render: < 100ms
Message Send: < 50ms (optimistic UI)
Scroll to Bottom: < 50ms (instant on load)
Image Load: Progressive with placeholder
```

#### Memory Usage
```
Use refs for scroll state (not state)
Memoize expensive calculations
Passive event listeners for scroll
Clean up intervals on unmount
```

---

### 🎭 **15. Interaction States**

#### Button States
```css
/* Rest */
Background: transparent
Opacity: 100%

/* Hover (Desktop) */
Background: var(--hover-surface)
Transition: 150ms ease

/* Active (Press) */
Transform: scale(0.95)
Duration: 120ms
Background: var(--hover-surface)

/* Disabled */
Opacity: 50%
Cursor: not-allowed
```

#### Input States
```css
/* Rest */
Background: var(--muted)
Border: none

/* Focus */
Background: var(--muted)
Ring: 2px solid var(--primary) at 20% opacity
Outline: none

/* Disabled */
Background: var(--muted)
Opacity: 50%
Cursor: not-allowed
```

#### Message States
```css
/* Appearing */
Animation: messageAppear 180ms
Opacity: 0 → 1
Transform: translateY(10px) → 0

/* Hover (Desktop) */
Show Actions: Fade in 200ms
Background: Unchanged

/* Selected */
Background: var(--primary) at 5% opacity (optional)
```

---

### 📊 **16. Comprehensive Measurement Table**

| Element | Property | Light Mode | Dark Mode | Notes |
|---------|----------|------------|-----------|-------|
| **Input Bar** | Height | 58px | 58px | Including padding |
| | Input Height | 44-120px | 44-120px | Auto-expands |
| | Padding | 6px 8px | 6px 8px | Top/bottom left/right |
| | Border Radius | 20px | 20px | Pill shape |
| **Message Bubble** | Max Width | 72% | 72% | Of container |
| | Padding | 10px 12px | 10px 12px | Vertical horizontal |
| | Border Radius | 16px | 16px | With 4px corner |
| | Gap (in group) | 3px | 3px | mb-[3px] |
| | Gap (between) | 12px | 12px | mb-3 |
| **Avatar** | Size | 32px | 32px | w-8 h-8 |
| | Gap | 8px | 8px | gap-2 |
| **Timestamp** | Font Size | 11px | 11px | |
| | Opacity | 70% | 70% | |
| | Margin Top | 2px | 2px | Below bubble |
| **Read Ticks** | Size | 14px | 14px | w-3.5 h-3.5 |
| | Color (read) | #53bdeb | #53bdeb | Blue |
| | Gap | 4px | 4px | From timestamp |
| **Icons** | Action | 22px | 22px | Emoji, attach, mic |
| | Send | 20px | 20px | Send arrow |
| **Animations** | Appear | 180ms | 180ms | Message fade-in |
| | Press | 120ms | 120ms | Button active |
| | Keyboard | 200ms | 200ms | Layout shift |
| **Spacing** | Container | 8px | 8px | px-2 py-2 |
| | Composer | 6px | 6px | Between items |
| | Header | 12px | 12px | px-3 |

---

### 📐 **17. Screen Size Test Matrix**

| Device | Width | Container Padding | Message Width | Avatar | Input Height |
|--------|-------|-------------------|---------------|--------|--------------|
| iPhone SE | 320px | 8px | 72% (230px) | 32px | 44-120px |
| iPhone 12 mini | 375px | 8px | 72% (270px) | 32px | 44-120px |
| iPhone 12/13 | 390px | 8px | 72% (280px) | 32px | 44-120px |
| iPhone 12 Pro | 414px | 8px | 72% (298px) | 32px | 44-120px |
| iPhone 14 Pro Max | 428px | 8px | 72% (308px) | 32px | 44-120px |
| Pixel 5 | 393px | 8px | 72% (283px) | 32px | 44-120px |
| Galaxy S21 | 360px | 8px | 72% (259px) | 32px | 44-120px |

---

### ✅ **18. Implementation Checklist**

#### Layout
- [x] Fixed input bar at bottom (58px height)
- [x] Pill-shaped input (20px border-radius)
- [x] Icon sizes (20-22px)
- [x] Keyboard smooth transition (200ms)
- [x] Safe area support

#### Message Bubbles
- [x] Max width 72%
- [x] Padding 10px 12px
- [x] Vertical spacing 3px/12px
- [x] Rounded corners 16px with 4px cut
- [x] Avatar grouping logic
- [x] WhatsApp colors

#### Scrolling
- [x] Auto-scroll on send/receive
- [x] Preserve position when scrolled up
- [x] Smooth behavior (cubic-bezier)
- [x] Overscroll bounce on mobile

#### Timestamps & Ticks
- [x] 11px font size
- [x] Below bubble alignment
- [x] Read receipts (12px, subtle)
- [x] Delivered/read colors

#### Media
- [x] Card padding 10px
- [x] Subtle shadow
- [x] Fixed aspect ratio
- [x] Clear padding from edges

#### Micro-interactions
- [x] Message appear (fade+slide 180ms)
- [x] Tap states (scale 0.95)
- [x] Smooth press feedback
- [x] Hover actions (desktop)

#### Responsiveness
- [x] 320px width tested
- [x] 375px width tested
- [x] 412px width tested
- [x] 428px width tested
- [x] Exact numeric values documented

---

### 🎯 **Summary**

This specification provides **pixel-perfect** implementation guidelines for a WhatsApp-quality chat interface. All measurements, colors, animations, and interactions have been precisely defined to match WhatsApp's professional UX standards.

**Key Principles:**
1. **Precise measurements** - Every padding, margin, and size specified in pixels
2. **Smooth animations** - 160-220ms cubic-bezier for natural feel
3. **Mobile-first** - Optimized for 320px-428px phone widths
4. **Touch-friendly** - 44px minimum touch targets (WCAG 2.1 AA)
5. **Production-ready** - All edge cases and states documented

**Implementation Status:** ✅ Complete and Production-Ready

---

**Version:** 1.0.0  
**Last Updated:** 2025-10-31  
**Status:** Production Ready ✅
