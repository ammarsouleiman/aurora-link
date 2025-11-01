# Mobile Testing Checklist - Find User by Phone Dialog

## Quick Testing Guide

Use this checklist to verify the "Find User by Phone" dialog works perfectly across all mobile screen sizes.

---

## 🔧 DevTools Setup

### Chrome DevTools
1. Open DevTools (F12 or Cmd+Option+I)
2. Click device toolbar icon (Cmd+Shift+M)
3. Select "Responsive" mode
4. Test at each width below

### Firefox DevTools
1. Open DevTools (F12)
2. Click responsive design mode (Cmd+Option+M)
3. Select device or enter custom width
4. Test at each breakpoint

---

## 📏 Test Widths

Test the dialog at these exact widths:

### Critical Breakpoints
- [ ] **320px** - Absolute minimum (Galaxy Fold inner screen)
- [ ] **375px** - iPhone SE, most common mobile size
- [ ] **390px** - iPhone 12/13/14 Pro
- [ ] **393px** - Google Pixel 5/6
- [ ] **412px** - Samsung Galaxy S series
- [ ] **428px** - iPhone 14 Pro Max
- [ ] **474px** - Just before XS breakpoint
- [ ] **475px** - XS breakpoint trigger
- [ ] **639px** - Just before SM breakpoint
- [ ] **640px** - SM breakpoint trigger (tablet)

---

## ✅ Visual Tests

### At 320px (Smallest)
- [ ] Dialog has visible margins (8px on each side)
- [ ] Title "Find User by Phone" is fully visible
- [ ] Description text is readable (not too small)
- [ ] Country selector shows flag + dial code
- [ ] Country selector is 100px wide
- [ ] Phone input fills remaining space
- [ ] Search button is full width
- [ ] Search button height is 44px (touch-friendly)
- [ ] Info banner text fits (may wrap to 2 lines)
- [ ] NO horizontal scrolling
- [ ] Close button (X) is accessible

### At 375px (iPhone SE)
- [ ] Dialog feels comfortable, not cramped
- [ ] All text is easily readable
- [ ] Country selector has proper spacing
- [ ] Phone input has adequate width
- [ ] All elements properly aligned
- [ ] Consistent margins all around

### At 475px (XS Breakpoint)
- [ ] Dialog margins increase to 12px each side
- [ ] Country selector widens to 110px
- [ ] Text sizes increase slightly
- [ ] More breathing room in layout
- [ ] Buttons show enhanced layout (if found user)

### At 640px+ (Tablet/Desktop)
- [ ] Dialog centers and limits to 448px max width
- [ ] Country selector expands to 130px
- [ ] Text uses larger, desktop-appropriate sizes
- [ ] Button heights reduce to 40px
- [ ] Padding increases to 24px
- [ ] Overall spacious appearance

---

## 🎯 Interaction Tests

### Country Selector
- [ ] Click/tap opens dropdown
- [ ] Dropdown doesn't overflow screen edges
- [ ] Dropdown is scrollable if needed
- [ ] Can search for countries
- [ ] Can select a country
- [ ] Dropdown closes after selection
- [ ] Flag emoji displays correctly
- [ ] Dial code updates properly

### Phone Input
- [ ] Can type numbers
- [ ] Placeholder shows correct format
- [ ] Input accepts spaces/hyphens/parentheses
- [ ] Input filters out non-digit characters
- [ ] Validation checkmark appears when valid
- [ ] Error message displays below input
- [ ] Format hint shows below input (when no error)

### Search Button
- [ ] Button is easily tappable (44px height on mobile)
- [ ] Shows loading state when searching
- [ ] Disables when no phone number entered
- [ ] Icon and text both visible
- [ ] Text doesn't overflow/wrap

### Found User State
- [ ] User card displays properly
- [ ] Avatar shows (or placeholder)
- [ ] Online/offline status visible
- [ ] Name truncates if too long
- [ ] Username truncates if too long
- [ ] Status message clips at 1 line
- [ ] "Start Chat" button is full width on small screens
- [ ] Buttons stack vertically on small screens (< 475px)
- [ ] Buttons show side-by-side on larger screens (≥ 475px)
- [ ] "Search Again" button resets form

---

## 🖐️ Touch Target Tests

### Minimum Sizes (WCAG 2.1 AA)
- [ ] All buttons are ≥44px tall on mobile (< 640px)
- [ ] All buttons are ≥40px tall on desktop (≥ 640px)
- [ ] Country selector is easily tappable
- [ ] Close button (X) is easily tappable
- [ ] No accidental taps on wrong elements

### Spacing
- [ ] Sufficient space between buttons
- [ ] Can tap buttons without hitting neighbors
- [ ] Comfortable one-handed use on small phones

---

## 📱 Real Device Tests

### iPhone (Safari)
- [ ] Dialog renders correctly
- [ ] Country dropdown works
- [ ] Input keyboard appears properly
- [ ] Touch targets feel right
- [ ] No layout shifts
- [ ] Animations are smooth
- [ ] Safe area insets respected (if applicable)

### Android (Chrome)
- [ ] Dialog renders correctly
- [ ] Country dropdown works
- [ ] Input keyboard appears properly
- [ ] Touch targets feel right
- [ ] No layout shifts
- [ ] Animations are smooth
- [ ] Navigation bar doesn't overlap content

---

## 🔄 Rotation Tests

### Portrait → Landscape
- [ ] Dialog remains properly sized
- [ ] Content still accessible
- [ ] No horizontal overflow
- [ ] Buttons remain tappable

### Landscape → Portrait
- [ ] Dialog resizes smoothly
- [ ] Layout returns to portrait mode
- [ ] All content visible

---

## 🎨 Visual Polish Tests

### Typography
- [ ] All text is readable (not too small)
- [ ] Proper hierarchy (title > description > body)
- [ ] Consistent line heights
- [ ] No awkward text wrapping

### Spacing
- [ ] Consistent padding throughout
- [ ] Proper gaps between elements
- [ ] Comfortable whitespace
- [ ] Not too cramped or too spacious

### Colors & Contrast
- [ ] All text meets contrast requirements
- [ ] Success state (found user) clearly visible
- [ ] Error messages stand out
- [ ] Borders visible but not harsh

### Icons
- [ ] All icons properly sized
- [ ] Icons don't distort or shrink weird
- [ ] Icons align with text
- [ ] Emojis (flags) display correctly

---

## ⚠️ Edge Case Tests

### Long Content
- [ ] Long country names truncate properly
- [ ] Long user names truncate with ellipsis
- [ ] Long usernames truncate with ellipsis
- [ ] Long status messages clip at 1 line
- [ ] Long dial codes fit in selector

### Empty States
- [ ] Missing avatar shows placeholder
- [ ] Missing status message doesn't break layout
- [ ] Empty search shows appropriate state

### Error States
- [ ] Error messages display properly
- [ ] Error messages don't overflow
- [ ] Multiple errors (if applicable) stack nicely

### Loading States
- [ ] Search button shows spinner
- [ ] Text changes to "Searching..."
- [ ] Button stays disabled during search

---

## 🚀 Performance Tests

### Animation Smoothness
- [ ] Dialog open/close is smooth (60fps)
- [ ] Dropdown open/close is smooth
- [ ] No janky animations
- [ ] No layout thrashing

### Scroll Performance
- [ ] Country dropdown scrolls smoothly
- [ ] Dialog content scrolls smoothly (if exceeds viewport)
- [ ] No lag when scrolling

### Responsiveness
- [ ] Instant feedback on button press
- [ ] Input responds immediately to typing
- [ ] Country selection feels snappy

---

## 🔍 Accessibility Tests

### Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Focus indicators are visible
- [ ] Can close dialog with Escape key
- [ ] Enter key submits form

### Screen Reader
- [ ] Dialog title announced
- [ ] Description read properly
- [ ] Form fields have proper labels
- [ ] Error messages associated with inputs
- [ ] Button purposes clear

### Zoom & Text Resize
- [ ] Works at 200% text size
- [ ] Layout doesn't break when zoomed
- [ ] All content still accessible

---

## 📊 Testing Checklist Summary

### Must Test
✅ **320px** - Absolute minimum
✅ **375px** - Most common iPhone
✅ **393px** - Most common Android
✅ **475px** - XS breakpoint
✅ **640px** - SM breakpoint

### Should Test
- [ ] 428px - Largest iPhone
- [ ] Real iPhone device
- [ ] Real Android device
- [ ] Landscape orientation

### Nice to Test
- [ ] 280px - Galaxy Fold closed (extreme)
- [ ] 768px - Tablet
- [ ] Various Android brands

---

## 🎯 Pass Criteria

The dialog passes if:

✅ **No horizontal scroll** at any width ≥320px
✅ **All text readable** at smallest size (320px)
✅ **All buttons tappable** with normal finger size
✅ **Dropdown never overflows** viewport
✅ **Layout looks intentional** at all sizes (not broken)
✅ **Touch targets ≥44px** on mobile
✅ **Animations smooth** and performant
✅ **No console errors** or warnings

---

## 📝 Reporting Issues

If you find any issues, note:

1. **Screen width** where issue occurs
2. **Device/browser** being used
3. **Screenshot** of the issue
4. **Steps to reproduce**
5. **Expected vs. actual** behavior

---

## ✅ Final Verification

- [ ] Tested at all critical breakpoints
- [ ] Tested on at least 1 real iPhone
- [ ] Tested on at least 1 real Android
- [ ] No horizontal overflow at any size
- [ ] All interactions work smoothly
- [ ] Accessibility requirements met
- [ ] Performance is smooth
- [ ] Ready for production

---

**Status**: Use this checklist every time you make changes to the dialog
**Last Updated**: October 31, 2025
