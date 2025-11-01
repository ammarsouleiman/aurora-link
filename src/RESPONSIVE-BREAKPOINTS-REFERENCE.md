# AuroraLink Responsive Breakpoints Reference

## Quick Reference Guide for All Components

### Tailwind Breakpoints
```
       0px ───────► 474px ───────► 639px ───────► ∞
         Default        xs           sm        md/lg/xl
      (Mobile S)   (Mobile M/L)   (Tablet)   (Desktop)
```

## Find User by Phone Dialog

### Screen Size Breakdown

#### 📱 320px - 474px (Small Mobile)
```
Dialog Width:    calc(100% - 1rem)    [16px margins]
Dialog Padding:  12px (p-3)
Country Button:  100px width
Text Sizes:      10-14px
Button Height:   44px (h-11)
Gaps:            6px (gap-1.5)
```

#### 📱 475px - 639px (Medium Mobile)  
```
Dialog Width:    calc(100% - 1.5rem)  [24px margins]
Dialog Padding:  16px (p-4)
Country Button:  110px width
Text Sizes:      11-16px  
Button Height:   44px (h-11)
Gaps:            8px (gap-2)
```

#### 💻 640px+ (Tablet/Desktop)
```
Dialog Width:    448px (max-w-md)
Dialog Padding:  24px (p-6)
Country Button:  130px width
Text Sizes:      12-18px
Button Height:   40px (h-10)
Gaps:            8px (gap-2)
```

## Component-Specific Breakpoints

### PhoneInput Component
| Element | 320-474px | 475-639px | 640px+ |
|---------|-----------|-----------|--------|
| Country Selector | 100px | 110px | 130px |
| Input Gap | 6px | 8px | 8px |
| Input Height | 44px | 44px | 40px |
| Dial Code Text | 12px | 14px | 14px |
| Flag Emoji | 16px | 16px | 18px |
| Dropdown Width | calc(100vw-2rem) | calc(100vw-2rem) | 320px |
| Dropdown Max Height | 50vh | 50vh | 300px |

### User Card (Found State)
| Element | 320-474px | 475-639px | 640px+ |
|---------|-----------|-----------|--------|
| Card Padding | 10px | 12px | 16px |
| Avatar Gap | 10px | 12px | 16px |
| Name Size | 14px | 14px | 16px |
| Username Size | 11px | 12px | 14px |
| Status Size | 10px | 11px | 12px |

### Action Buttons
| Property | 320-474px | 475-639px | 640px+ |
|----------|-----------|-----------|--------|
| Layout | Stack (column) | Row | Row |
| Gap | 8px | 8px | 8px |
| Height | 44px | 44px | 40px |
| Padding X | 8px | 12px | 12px |
| Text Size | 14px | 14px | 16px |

## Typography Scale

### Headings
```css
/* Dialog Title */
text-sm      →  14px  (320-474px)
xs:text-base →  16px  (475-639px)
sm:text-lg   →  18px  (640px+)

/* Section Headers */
text-xs      →  12px  (320-474px)
sm:text-sm   →  14px  (640px+)
```

### Body Text
```css
/* Primary Text */
text-sm      →  14px  (320-639px)
sm:text-base →  16px  (640px+)

/* Secondary Text */
text-xs      →  12px  (320-474px)
xs:text-xs   →  12px  (475-639px)
sm:text-sm   →  14px  (640px+)
```

### Micro Text (Hints, Info)
```css
/* Info Banners */
text-[10px]    →  10px  (320-474px)
xs:text-[11px] →  11px  (475-639px)
sm:text-xs     →  12px  (640px+)

/* Format Hints */
text-[11px]  →  11px  (320-474px)
sm:text-xs   →  12px  (640px+)
```

## Spacing System

### Padding
| Class | 320-474px | 475-639px | 640px+ |
|-------|-----------|-----------|--------|
| p-3 xs:p-4 sm:p-6 | 12px | 16px | 24px |
| p-2.5 xs:p-3 sm:p-4 | 10px | 12px | 16px |
| p-2 xs:p-2.5 sm:p-3 | 8px | 10px | 12px |

### Gaps
| Class | 320-474px | 475-639px | 640px+ |
|-------|-----------|-----------|--------|
| gap-1.5 sm:gap-2 | 6px | 6px | 8px |
| gap-2 | 8px | 8px | 8px |
| gap-3 sm:gap-4 | 12px | 12px | 16px |
| gap-2.5 xs:gap-3 sm:gap-4 | 10px | 12px | 16px |

### Margins
| Class | 320-474px | 475-639px | 640px+ |
|-------|-----------|-----------|--------|
| mr-1.5 sm:mr-2 | 6px | 6px | 8px |
| mb-2 sm:mb-3 | 8px | 8px | 12px |

## Touch Targets (WCAG 2.1 AA)

### Minimum Sizes
```
Mobile (0-639px):   44 × 44px  (h-11)
Desktop (640px+):   40 × 40px  (h-10)

Rationale: Mobile users need larger targets for finger taps
```

### Interactive Elements
```css
/* All Buttons */
h-11 sm:h-10                    → 44px / 40px
touch-manipulation              → Disables 300ms delay

/* Country Selector */
h-11 sm:h-10                    → 44px / 40px
min-w-[100px]                   → Sufficient tap area

/* Phone Input */
h-11 sm:h-10                    → 44px / 40px
```

## Responsive Images & Icons

### Avatar Sizes
```css
size="lg"   →  56px × 56px  (all breakpoints)
```

### Icons
```css
/* Primary Icons (Search, Phone, UserPlus) */
h-4 w-4           →  16px  (320-639px)
sm:h-5 sm:w-5     →  20px  (640px+)

/* Secondary Icons (ChevronDown, Check) */
h-3.5 w-3.5       →  14px  (320-474px)
sm:h-4 sm:w-4     →  16px  (475px+)
```

## Layout Patterns

### Dialog Container
```css
/* Horizontal Margins */
320-474px:   calc(100% - 1rem)      = 16px total margin
475-639px:   calc(100% - 1.5rem)    = 24px total margin
640px+:      max-w-md (448px)       = centered

/* Vertical Behavior */
max-h-[90vh]                        = Never exceeds screen
overflow-y-auto                     = Scrollable content
```

### Flex Layouts
```css
/* Two-Button Layout */
320-474px:   flex-col               = Stacked
475px+:      flex-row               = Side-by-side

/* Avatar + Text */
gap-2.5 xs:gap-3 sm:gap-4          = Responsive spacing
min-w-0                             = Enables text truncation
```

## Critical Calculations

### Viewport-Aware Widths
```css
/* Popover Dropdown */
w-[min(320px, calc(100vw - 2rem))]

Breakdown:
- Preferred: 320px
- Maximum: 100vw - 32px (16px padding each side)
- Result: Whichever is smaller
```

### Dynamic Heights
```css
/* Dropdown Max Height */
max-h-[min(300px, 50vh)]

Breakdown:
- Preferred: 300px
- Maximum: 50% of viewport height
- Result: Prevents overflow on short screens
```

## Real Device Examples

### iPhone SE (375px wide)
```
Dialog:        359px (375 - 16)
Country Btn:   100px
Phone Input:   ~253px
Popover:       343px (375 - 32)
```

### iPhone 14 Pro (393px wide)
```
Dialog:        377px (393 - 16)
Country Btn:   100px
Phone Input:   ~271px
Popover:       361px (393 - 32)
```

### Pixel 5 (393px wide)
```
Same as iPhone 14 Pro
```

### iPhone 14 Pro Max (428px wide)
```
Dialog:        404px (428 - 24) [xs breakpoint]
Country Btn:   110px
Phone Input:   ~288px
Popover:       396px (428 - 32)
```

### iPad Mini (768px wide)
```
Dialog:        448px (max-w-md) [sm breakpoint]
Country Btn:   130px
Phone Input:   ~310px
Popover:       320px (fixed)
```

## Testing Commands

### Quick Visual Test
```tsx
// Test at specific widths in DevTools
320px   →  Galaxy Fold, Small Android
375px   →  iPhone SE, iPhone 12 mini
390px   →  iPhone 12/13 Pro
393px   →  Pixel 5, Galaxy S21
412px   →  Pixel 6, Galaxy S22
428px   →  iPhone 14 Pro Max
475px   →  Large phones (xs breakpoint trigger)
640px   →  Small tablets (sm breakpoint trigger)
```

### Breakpoint Test Points
```
Test these exact widths:
- 320px  (absolute minimum)
- 374px  (just below xs)
- 375px  (common iPhone)
- 474px  (just below xs)
- 475px  (xs breakpoint)
- 639px  (just below sm)
- 640px  (sm breakpoint)
```

## Common Patterns

### Progressive Enhancement
```css
/* Start small, scale up */
text-xs xs:text-sm sm:text-base

/* Mobile-first padding */
p-2 xs:p-3 sm:p-4

/* Responsive gaps */
gap-1.5 xs:gap-2 sm:gap-3
```

### Defensive CSS
```css
/* Prevent overflow */
min-w-0              → Allows shrinking
truncate             → Text ellipsis
max-w-full           → Respect container

/* Prevent distortion */
flex-shrink-0        → Icons stay sized
aspect-ratio         → Images stay proportional
```

### Touch Optimization
```css
touch-manipulation   → Remove tap delay
h-11 sm:h-10        → 44px mobile, 40px desktop
cursor-pointer       → Visual affordance
```

## Pro Tips

1. **Always test at 320px** - If it works here, it works everywhere
2. **Use calc() for margins** - Ensures consistent edge spacing
3. **Combine min() and calc()** - Best of both worlds
4. **Test touch targets** - Use finger, not mouse
5. **Watch for text wrap** - Long words can break layouts
6. **Check RTL languages** - Arabic, Hebrew may need adjustments
7. **Verify on real devices** - Simulator ≠ actual phone
8. **Monitor collision detection** - Popovers near edges

---

**Last Updated**: 2025-10-31
**Applies To**: AuroraLink v1.0+
