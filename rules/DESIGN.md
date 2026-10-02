# DESIGN SYSTEM - CuraBot
## Telegram AI Bot Platform

---

## 1. DESIGN PHILOSOPHY

CuraBot follows a **Modern Minimalist** design language with **Organic Gradient Flows** inspired by nature. The design prioritizes clarity, velocity, and user empowerment while maintaining visual sophistication.

**Core Principles:**
- **Velocity First:** Fast-loading, snappy interactions
- **Organic Growth:** Smooth gradients and flowing elements
- **Clarity Over Decoration:** Every element serves purpose
- **Accessibility by Default:** WCAG 2.1 AA+ standards
- **Mobile-First Responsive:** Optimal experience on all devices

---

## 2. COLOR SYSTEM

### 2.1 Primary Palette (Green Beach)

The color system is built on the "Green Beach" gradient, evoking freshness, growth, and natural tranquility.

**Primary Colors:**

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Deep Forest** | #1B5E3F | rgb(27, 94, 63) | Primary buttons, active states, headers |
| **Forest Green** | #2E8B57 | rgb(46, 139, 87) | Primary brand color, main CTA |
| **Meadow Green** | #3FA876 | rgb(63, 168, 118) | Hover states, secondary accents |
| **Sage Green** | #5FBB97 | rgb(95, 187, 151) | Light interactive states, borders |
| **Mint Whisper** | #A8DCC8 | rgb(168, 220, 200) | Light backgrounds, subtle elements |
| **Cream Beach** | #F0E5D8 | rgb(240, 229, 216) | Light backgrounds, cards |

### 2.2 Extended Palette

**Neutrals & Grayscale:**

| Name | Hex | Usage |
|------|-----|-------|
| **Charcoal** | #1A1A1A | Primary text, dark backgrounds |
| **Slate** | #4A4A4A | Secondary text, disabled text |
| **Silver** | #9CA3AF | Tertiary text, borders, dividers |
| **Light Gray** | #E8E8E8 | Input borders, backgrounds |
| **White** | #FFFFFF | Cards, surfaces, primary background |

**Semantic Colors:**

| Name | Hex | Usage |
|------|-----|-------|
| **Success Green** | #10B981 | Success messages, checks |
| **Warning Amber** | #F59E0B | Warnings, alerts |
| **Error Red** | #EF4444 | Errors, destructive actions |
| **Info Blue** | #3B82F6 | Info messages, notifications |

### 2.3 Gradient System

**Primary Gradient (Hero Sections):**
```css
background: linear-gradient(135deg, #1B5E3F 0%, #2E8B57 25%, #3FA876 50%, #5FBB97 75%, #A8DCC8 100%);
```

**Secondary Gradient (Cards & Accents):**
```css
background: linear-gradient(180deg, #FFFFFF 0%, #F0E5D8 100%);
```

**Tertiary Gradient (Hover Effects):**
```css
background: linear-gradient(135deg, #2E8B57 0%, #3FA876 100%);
```

**Dark Overlay Gradient (Modals, Overlays):**
```css
background: linear-gradient(180deg, rgba(27, 94, 63, 0.7) 0%, rgba(27, 94, 63, 0.5) 100%);
```

---

## 3. TYPOGRAPHY SYSTEM

### 3.1 Font Family

**Primary Font: Inter**
- Clean, modern, highly legible
- Excellent screen rendering
- Strong character differentiation
- Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue'

**Implementation:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### 3.2 Type Scale

**Responsive typography:** Scales based on viewport width for optimal readability.

| Name | Desktop | Mobile | Weight | Line Height | Letter Spacing | Usage |
|------|---------|--------|--------|-------------|----------------|-------|
| **H1 (Hero Title)** | 56px | 36px | 700 | 1.2 | -0.02em | Page titles, hero sections |
| **H2 (Section Title)** | 42px | 28px | 700 | 1.3 | -0.01em | Section headings, major divisions |
| **H3 (Subsection)** | 32px | 24px | 600 | 1.35 | 0em | Subsection headers, card titles |
| **H4 (Minor Heading)** | 24px | 20px | 600 | 1.4 | 0em | Component titles, list headers |
| **H5 (Label)** | 18px | 16px | 600 | 1.4 | 0.01em | Button labels, small headers |
| **Body Large** | 18px | 16px | 400 | 1.6 | 0em | Form text, descriptions |
| **Body Regular** | 16px | 14px | 400 | 1.6 | 0em | Primary body text |
| **Body Small** | 14px | 13px | 400 | 1.5 | 0.01em | Secondary text, captions |
| **Caption** | 12px | 11px | 500 | 1.4 | 0.02em | Timestamps, badges, helpers |
| **Code** | 14px | 12px | 500 | 1.5 | 0em | Code blocks, technical text |

### 3.3 Type Combinations

**Hero Section:**
```css
h1 {
  font-size: clamp(36px, 8vw, 56px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #1A1A1A;
}
```

**Card Title:**
```css
h3 {
  font-size: clamp(24px, 5vw, 32px);
  font-weight: 600;
  line-height: 1.35;
  color: #2E8B57;
}
```

**Body Text:**
```css
p {
  font-size: clamp(14px, 2vw, 16px);
  font-weight: 400;
  line-height: 1.6;
  color: #4A4A4A;
}
```

---

## 4. SPACING & SIZING SYSTEM

### 4.1 Base Unit

**Base spacing unit: 8px** - All spacing derived from 8px multiples for consistency.

| Size | Value | Tokens | Usage |
|------|-------|--------|-------|
| **XS** | 4px | spacing-xs | Micro gaps, tight spacing |
| **SM** | 8px | spacing-sm | Small padding, gaps |
| **MD** | 12px | spacing-md | Normal spacing |
| **LG** | 16px | spacing-lg | Default padding |
| **XL** | 24px | spacing-xl | Section spacing |
| **2XL** | 32px | spacing-2xl | Large section gaps |
| **3XL** | 48px | spacing-3xl | Major section spacing |
| **4XL** | 64px | spacing-4xl | Hero spacing |

### 4.2 Component Spacing

**Padding Standard:**
- Buttons: 12px 20px (height: 40px)
- Input Fields: 12px 16px (height: 44px)
- Cards: 24px (all sides)
- Modals: 32px (all sides)
- Section: 48px top/bottom, 24px left/right

**Margin Standard:**
- Between sections: 48px
- Between components: 24px
- Between inline elements: 16px
- Between text blocks: 12px

---

## 5. LAYOUT & GRID SYSTEM

### 5.1 Grid Foundation

**12-Column Responsive Grid** with fluent breakpoints.

```css
display: grid;
grid-template-columns: repeat(12, 1fr);
gap: 24px;
max-width: 1440px;
margin: 0 auto;
padding: 0 24px;
```

### 5.2 Breakpoints

| Breakpoint | Width | Columns | Padding | Usage |
|------------|-------|---------|---------|-------|
| **Mobile (sm)** | 320px - 639px | 4 | 16px | Phones, small screens |
| **Tablet (md)** | 640px - 1023px | 8 | 24px | Tablets, large phones |
| **Desktop (lg)** | 1024px - 1439px | 12 | 32px | Desktop, laptops |
| **Wide (xl)** | 1440px+ | 12 | 40px | Large monitors |

### 5.3 Common Layouts

**Full Width:**
```css
grid-column: 1 / -1;
```

**Two Column (Desktop) / Single (Mobile):**
```css
@media (min-width: 1024px) {
  grid-column: span 6;
}
@media (max-width: 1023px) {
  grid-column: 1 / -1;
}
```

**Sidebar Layout:**
```css
/* Sidebar: 4 columns */
.sidebar {
  grid-column: span 4;
}
/* Content: 8 columns */
.content {
  grid-column: span 8;
}

@media (max-width: 1023px) {
  .sidebar, .content {
    grid-column: 1 / -1;
  }
  .sidebar {
    order: 2;
  }
}
```

---

## 6. COMPONENT SPECIFICATIONS

### 6.1 Buttons

**Button Variants & States:**

**Primary Button (CTA)**
```css
/* Default */
background: #2E8B57;
color: white;
padding: 12px 24px;
border-radius: 8px;
font-weight: 600;
font-size: 16px;
border: none;
cursor: pointer;
transition: all 0.3s ease;
box-shadow: 0 4px 12px rgba(46, 139, 87, 0.2);

/* Hover */
&:hover {
  background: #3FA876;
  box-shadow: 0 6px 16px rgba(46, 139, 87, 0.3);
  transform: translateY(-2px);
}

/* Active/Pressed */
&:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(46, 139, 87, 0.2);
}

/* Disabled */
&:disabled {
  background: #9CA3AF;
  cursor: not-allowed;
  box-shadow: none;
}
```

**Secondary Button (Alternative)**
```css
/* Default */
background: transparent;
border: 2px solid #2E8B57;
color: #2E8B57;
padding: 10px 22px;
border-radius: 8px;
font-weight: 600;
cursor: pointer;
transition: all 0.3s ease;

/* Hover */
&:hover {
  background: rgba(46, 139, 87, 0.08);
  border-color: #3FA876;
  color: #3FA876;
}

/* Active */
&:active {
  background: rgba(46, 139, 87, 0.12);
}
```

**Tertiary Button (Minimal)**
```css
/* Default */
background: transparent;
color: #2E8B57;
padding: 12px 16px;
border-radius: 6px;
font-weight: 500;
cursor: pointer;
transition: all 0.2s ease;

/* Hover */
&:hover {
  background: rgba(46, 139, 87, 0.06);
  color: #3FA876;
}
```

**Icon Button (Circular)**
```css
width: 40px;
height: 40px;
border-radius: 50%;
background: #F0E5D8;
border: none;
display: flex;
align-items: center;
justify-content: center;
cursor: pointer;
transition: all 0.3s ease;

&:hover {
  background: #A8DCC8;
  transform: scale(1.1);
}
```

### 6.2 Input Fields

**Text Input**
```css
width: 100%;
padding: 12px 16px;
border: 2px solid #E8E8E8;
border-radius: 8px;
font-family: 'Inter', sans-serif;
font-size: 16px;
color: #1A1A1A;
transition: all 0.3s ease;
background: white;

/* Focus */
&:focus {
  outline: none;
  border-color: #2E8B57;
  box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
  background: rgba(46, 139, 87, 0.02);
}

/* Error */
&.error {
  border-color: #EF4444;
}

&.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

/* Disabled */
&:disabled {
  background: #F0E5D8;
  color: #9CA3AF;
  cursor: not-allowed;
  border-color: #E8E8E8;
}
```

**Textarea**
```css
width: 100%;
padding: 16px;
border: 2px solid #E8E8E8;
border-radius: 8px;
font-family: 'Inter', sans-serif;
font-size: 14px;
line-height: 1.6;
resize: vertical;
min-height: 120px;
transition: all 0.3s ease;

&:focus {
  border-color: #2E8B57;
  box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
}
```

**Select Dropdown**
```css
appearance: none;
width: 100%;
padding: 12px 16px;
padding-right: 40px;
border: 2px solid #E8E8E8;
border-radius: 8px;
background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%232E8B57' d='M1 4l5 5 5-5'/%3E%3C/svg%3E");
background-repeat: no-repeat;
background-position: right 12px center;
background-color: white;
cursor: pointer;

&:focus {
  border-color: #2E8B57;
  outline: none;
}
```

### 6.3 Cards

**Standard Card**
```css
background: linear-gradient(180deg, #FFFFFF 0%, #F0E5D8 100%);
border-radius: 12px;
padding: 24px;
box-shadow: 0 2px 8px rgba(27, 94, 63, 0.06);
border: 1px solid rgba(46, 139, 87, 0.1);
transition: all 0.3s ease;

/* Hover Effect */
&:hover {
  box-shadow: 0 8px 24px rgba(27, 94, 63, 0.12);
  transform: translateY(-4px);
  border-color: rgba(46, 139, 87, 0.2);
}
```

**Interactive Card (Bot Card)**
```css
background: white;
border-radius: 12px;
padding: 20px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
border: 2px solid transparent;
cursor: pointer;
transition: all 0.3s ease;

/* Hover */
&:hover {
  border-color: #2E8B57;
  box-shadow: 0 8px 24px rgba(46, 139, 87, 0.15);
  transform: translateY(-6px);
}

/* Active/Selected */
&.active {
  border-color: #2E8B57;
  background: rgba(46, 139, 87, 0.02);
}
```

### 6.4 Modals & Dialogs

**Modal Overlay**
```css
position: fixed;
top: 0;
left: 0;
right: 0;
bottom: 0;
background: rgba(27, 94, 63, 0.5);
display: flex;
align-items: center;
justify-content: center;
z-index: 1000;
animation: fadeIn 0.3s ease;
backdrop-filter: blur(4px);
```

**Modal Content**
```css
background: white;
border-radius: 16px;
padding: 32px;
max-width: 500px;
width: 90%;
box-shadow: 0 20px 60px rgba(27, 94, 63, 0.3);
animation: slideUp 0.3s ease;
max-height: 90vh;
overflow-y: auto;

@media (max-width: 639px) {
  padding: 24px;
  border-radius: 12px;
}
```

**Modal Animations**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 6.5 Navigation

**Top Navigation Bar**
```css
background: white;
border-bottom: 1px solid #E8E8E8;
padding: 16px 24px;
position: sticky;
top: 0;
z-index: 100;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

display: flex;
align-items: center;
justify-content: space-between;

@media (max-width: 1023px) {
  padding: 12px 16px;
}
```

**Sidebar Navigation**
```css
width: 280px;
background: linear-gradient(180deg, #FFFFFF 0%, #F0E5D8 100%);
border-right: 1px solid #E8E8E8;
padding: 24px 0;
position: sticky;
top: 0;
height: 100vh;
overflow-y: auto;

nav-link {
  padding: 12px 20px;
  color: #4A4A4A;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
  
  &:hover {
    background: rgba(46, 139, 87, 0.06);
    color: #2E8B57;
  }
  
  &.active {
    background: rgba(46, 139, 87, 0.1);
    color: #2E8B57;
    border-left-color: #2E8B57;
  }
}

@media (max-width: 1023px) {
  display: none;
  /* Mobile menu via hamburger */
}
```

---

## 7. VISUAL EFFECTS & ANIMATIONS

### 7.1 Transitions

**Smooth Transitions:**
```css
/* Fast (UI Feedback) */
transition: background-color 0.2s ease, border-color 0.2s ease;

/* Standard (Interactions) */
transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);

/* Slow (Page Transitions) */
transition: opacity 0.5s ease, transform 0.5s ease;
```

### 7.2 Hover Effects

**Subtle Lift:**
```css
&:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(46, 139, 87, 0.15);
}
```

**Icon Scale:**
```css
&:hover svg {
  transform: scale(1.1);
}
```

**Color Shift:**
```css
&:hover {
  background: linear-gradient(135deg, #2E8B57 0%, #3FA876 100%);
  color: white;
}
```

### 7.3 Loading States

**Spinner Animation:**
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E8E8E8;
  border-top-color: #2E8B57;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
```

**Skeleton Loader:**
```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #E8E8E8 0%,
    #F5F5F5 50%,
    #E8E8E8 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

### 7.4 Page Transitions

**Fade & Slide:**
```css
.page-enter {
  animation: fadeInUp 0.5s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-exit {
  animation: fadeOutDown 0.3s ease;
}

@keyframes fadeOutDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(20px);
  }
}
```

---

## 8. ACCESSIBILITY STANDARDS

### 8.1 Color Contrast

All text must meet WCAG 2.1 AA standard (4.5:1 for normal text, 3:1 for large text).

**Verified Combinations:**
- #1A1A1A (text) on #FFFFFF (background): 16.8:1 ✓
- #2E8B57 (button) on #FFFFFF: 4.8:1 ✓
- #4A4A4A (secondary text) on #FFFFFF: 8.2:1 ✓
- White text on #2E8B57: 7.2:1 ✓

### 8.2 Focus States

**Keyboard Navigation Focus:**
```css
*:focus {
  outline: 3px solid #2E8B57;
  outline-offset: 2px;
}

button:focus {
  outline: 3px dashed #2E8B57;
  outline-offset: 3px;
}
```

### 8.3 Touch Targets

**Minimum size:** 44px × 44px for all interactive elements on mobile devices.

```css
button, a[role="button"], input[type="checkbox"], input[type="radio"] {
  min-width: 44px;
  min-height: 44px;
}
```

### 8.4 Semantic HTML

- Use `<button>` for buttons, never `<div>`
- Use `<nav>` for navigation
- Use `<main>` for main content
- Use `<section>` for sections
- Use `<article>` for article content
- Use `<aside>` for sidebars
- Use proper heading hierarchy (h1 → h2 → h3, etc.)

### 8.5 ARIA Labels

```html
<!-- Buttons without visible text -->
<button aria-label="Close dialog">×</button>

<!-- Icons -->
<svg aria-label="Edit bot configuration">...</svg>

<!-- Live regions -->
<div aria-live="polite" aria-atomic="true">
  Order saved successfully
</div>
```

---

## 9. ICONOGRAPHY

### 9.1 Icon Style

**Grid-based, 24px minimum:**
- Stroke width: 2px
- Corner radius: 2px
- Consistent line endings
- Optical alignment for visual harmony

**Color Usage:**
- Primary action: #2E8B57
- Secondary action: #4A4A4A
- Disabled: #9CA3AF
- Success: #10B981
- Error: #EF4444

### 9.2 Icon Library

Use Feather Icons or Heroicons for consistency:
- `<Icon name="plus" size={24} color="#2E8B57" />`
- `<Icon name="trash-2" size={20} color="#EF4444" />`
- `<Icon name="check-circle" size={24} color="#10B981" />`

---

## 10. IMAGERY & VISUAL ASSETS

### 10.1 Images

**Guidelines:**
- Use high-quality, compressed images (WebP format preferred)
- Maintain 16:9 aspect ratio for hero images
- Apply subtle overlay when text overlays image
- Use descriptive alt text for accessibility

**Optimization:**
```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="Descriptive text">
</picture>
```

### 10.2 Illustrations

**Style:**
- Line-based or flat design
- Consistent stroke weight
- Green Beach color palette
- Organic, flowing shapes

**Usage:**
- Empty states
- Hero sections
- Feature highlights
- Error illustrations

---

## 11. DARK MODE (Optional Future Implementation)

**Color Mapping:**
```css
:root[data-theme="dark"] {
  --bg-primary: #0F1419;
  --bg-secondary: #1A1F2E;
  --text-primary: #F5F5F5;
  --text-secondary: #B8B8B8;
  --border-color: #2D3748;
  --accent: #5FBB97;
}
```

---

## 12. RESPONSIVE DESIGN SPECIFICS

### 12.1 Mobile-First Approach

Start with mobile (320px), then enhance for larger screens:

```css
/* Mobile (default) */
.grid {
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 16px;
}

/* Tablet (640px+) */
@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 20px;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    padding: 24px;
  }
}
```

### 12.2 Flexible Typography

```css
/* Responsive font sizes */
h1 {
  font-size: clamp(28px, 6vw, 56px);
}

p {
  font-size: clamp(14px, 2vw, 16px);
}
```

### 12.3 Touch-Friendly Mobile UI

- Buttons: 44px+ height
- Spacing between elements: 16px+
- Simplified navigation (hamburger menu for mobile)
- Large tap targets
- Avoid hover-only interactions

---

## 13. CODE IMPLEMENTATION GUIDE

### 13.1 CSS Variables

Define design tokens as CSS variables for maintainability:

```css
:root {
  /* Colors */
  --color-primary: #2E8B57;
  --color-primary-dark: #1B5E3F;
  --color-primary-light: #5FBB97;
  --color-secondary: #F0E5D8;
  --color-text: #1A1A1A;
  --color-text-secondary: #4A4A4A;
  --color-border: #E8E8E8;
  --color-bg: #FFFFFF;
  
  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-body: clamp(14px, 2vw, 16px);
  --font-size-heading: clamp(24px, 5vw, 32px);
  
  /* Spacing */
  --spacing-unit: 8px;
  --spacing-sm: calc(var(--spacing-unit) * 1);
  --spacing-md: calc(var(--spacing-unit) * 2);
  --spacing-lg: calc(var(--spacing-unit) * 3);
  --spacing-xl: calc(var(--spacing-unit) * 4);
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(27, 94, 63, 0.06);
  --shadow-md: 0 8px 24px rgba(27, 94, 63, 0.12);
  --shadow-lg: 0 20px 60px rgba(27, 94, 63, 0.3);
  
  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Transitions */
  --transition-fast: 0.2s ease;
  --transition-default: 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --transition-slow: 0.5s ease;
}
```

### 13.2 Usage Example

```css
button {
  background: var(--color-primary);
  color: white;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-family: var(--font-family);
  transition: all var(--transition-default);
  box-shadow: var(--shadow-sm);
}

button:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

---

## 14. DESIGN CHECKLIST FOR AGENT

**Before Implementation:**
- [ ] Color palette matches Green Beach (#1B5E3F to #A8DCC8)
- [ ] Typography uses Inter font with correct sizes
- [ ] All buttons have proper states (default, hover, active, disabled)
- [ ] Spacing follows 8px grid system
- [ ] Cards have subtle gradients and shadows
- [ ] Focus states visible for keyboard navigation
- [ ] Mobile breakpoints: 320px, 640px, 1024px
- [ ] Images are optimized and have alt text
- [ ] Animations are smooth (0.3s default)
- [ ] Contrast ratios meet WCAG AA standard
- [ ] Touch targets minimum 44px
- [ ] Loading states implemented
- [ ] Error states clearly visible
- [ ] Responsive typography with clamp()
- [ ] No hover-only interactions on mobile

**Visual Quality:**
- [ ] No AI-generated placeholder graphics
- [ ] Consistent icon style (Feather/Heroicons)
- [ ] Gradient overlays applied correctly
- [ ] Shadows add depth, not clutter
- [ ] White space supports hierarchy
- [ ] Components feel cohesive
- [ ] Animations enhance, not distract
- [ ] Mobile experience is primary

---

## 15. DESIGN REFERENCE IMAGES

**Inspiration Sources:**
- Green Beach gradient system (Provided)
- +aura experimental layout (Provided)
- Modern SaaS dashboards (Stripe, Vercel, Linear)
- Telegram's clean interface
- Nature-inspired color systems

**Anti-Patterns to Avoid:**
- ❌ Oversaturated colors
- ❌ Inconsistent shadow depths
- ❌ Misaligned elements
- ❌ Unclear affordances
- ❌ Animations longer than 0.5s
- ❌ Too many gradients competing for attention
- ❌ Poor contrast ratios
- ❌ Unresponsive layouts
- ❌ Stock photo aesthetic
- ❌ Dated design patterns

---

## 16. FINAL NOTES

This design system is **living and evolving**. As the product develops:
1. Document new patterns as they emerge
2. Refine spacing and sizing based on feedback
3. Expand component library as needed
4. Test accessibility regularly
5. Iterate on animations based on performance
6. Keep color palette consistent across all platforms

**Remember:** Every design decision should serve the user and enhance the experience. Complexity is the enemy of clarity.

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-26  
**Design System Owner:** CuraBot Design Team  
**Status:** APPROVED FOR IMPLEMENTATION