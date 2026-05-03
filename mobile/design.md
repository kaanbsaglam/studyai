# StudyAI Mobile — Design System

**Purpose:** Single source of truth for the StudyAI mobile companion app's visual language, derived entirely from the existing web application. All tokens are extracted from real code — no invented values. Every mobile component must feel like the same product as the web app.

**Mobile Stack:** React Native with [NativeWind](https://www.nativewind.dev/) v4 (Tailwind CSS for React Native). Design tokens are expressed as a `tailwind.config.js` at the end of this document. The Tailwind version used on web is **v4.1.18** via `@tailwindcss/vite`; NativeWind v4 uses Tailwind v3-compatible config syntax — minor mapping notes are called out per section.

---

## Table of Contents

1. [Color Palette](#1-color-palette)
2. [Border Radius Scale](#2-border-radius-scale)
3. [Shadow System](#3-shadow-system)
4. [Effects — Gradients, Blur, Glassmorphism, Glow](#4-effects)
5. [Transitions & Animations](#5-transitions--animations)
6. [Typography](#6-typography)
7. [Spacing Scale](#7-spacing-scale)
8. [Mobile-Specific Considerations](#8-mobile-specific-considerations)
9. [Component Mapping](#9-component-mapping)
10. [tailwind.config.js Snippet](#10-tailwindconfigjs-snippet)

---

## 1. Color Palette

The web app ships three themes: **Light** (default), **Dark**, and **Earth**. All values are CSS custom properties in `frontend/src/index.css` lines 381–502. The mobile app must support the same three themes.

### 1.1 Semantic Token Map

| Token | Role | Light | Dark | Earth |
|---|---|---|---|---|
| `--page-bg` | App / screen background | `#f5f7fbe3` | `#121212` | `#f3efe6` |
| `--card-bg` | Card / sheet surface | `#ffffff` | `#1E1E1E` | `#fbf8f1` |
| `--card-border` | Card border | `#e2e8f0` | `transparent` | `#d8cdbb` |
| `--input-bg` | Input field background | `#f8fafc` | `#121212` | `#f6f1e7` |
| `--input-border` | Input field border | `#cbd5e1` | `#424242` | `#c7b8a2` |
| `--text-primary` | Primary body text | `#0f172a` | `#E0E0E0` | `#3f2f1f` |
| `--text-secondary` | Secondary / caption text | `#64748b` | `#A0A0A0` | `#6f5b45` |
| `--text-muted` | Placeholder / disabled text | `#8fa1b9` | `#757575` | `#8b775f` |
| `--accent` | Brand accent / primary interactive | `#4a6db4` | `#7BC9FE` | `#8b5e34` |
| `--accent-soft` | Accent tint for backgrounds | `rgba(43,108,238,0.12)` | `rgba(123,201,254,0.15)` | `rgba(139,94,52,0.18)` |
| `--accent-strong` | Pressed / darker accent | `#3c5873` | `#3b82f6` | `#6f4a28` |
| `--link-color` | Hyperlink color | `#4f46e5` | `#7BC9FE` | `#8b5e34` |
| `--link-hover-color` | Hyperlink hover | `#4338ca` | `#BAE6FD` | `#6f4a28` |
| `--btn-bg` | Secondary button background | `#ffffff` | `#2C2C2C` | `#fbf8f1` |
| `--btn-bg-hover` | Secondary button hover bg | `#f1f5f9` | `#383838` | `#f0e8d8` |
| `--btn-text` | Secondary button text | `#0f172a` (via `--text-primary`) | `#E0E0E0` | `#3f2f1f` |
| `--btn-border` | Secondary button border | `#cbd5e1` (via `--input-border`) | `#444444` | `#c7b8a2` |
| `--btn-border-hover` | Secondary button border hover | `#4a6db4` (via `--accent`) | `#555555` | `#8b5e34` (via `--accent`) |
| `--btn-primary-bg` | Primary button background | `#4a6db4` (via `--accent`) | `#7BC9FE` | `#8b5e34` |
| `--btn-primary-bg-hover` | Primary button pressed | `#3c5873` (via `--accent-strong`) | `#3b82f6` | `#6f4a28` |
| `--btn-primary-text` | Primary button label | `#ffffff` | `#121212` | `#ffffff` |
| `--btn-focus-ring` | Focus ring glow | `rgba(43,108,238,0.35)` | `rgba(123,201,254,0.45)` | `rgba(139,94,52,0.35)` |
| `--tab-inactive-bg` | Inactive tab background | `#e5e7eb` | `#2C2C2C` | `#e8ddc6` |
| `--tab-inactive-bg-hover` | Inactive tab hover | `#d1d5db` | `#383838` | `#ddcfb0` |
| `--tab-inactive-text` | Inactive tab label | `#4b5563` | `#B0B0B0` | `#6f5b45` |
| `--separator-via` | Divider / separator line | `rgba(15,23,42,0.10)` | `rgba(255,255,255,0.20)` | `rgba(120,90,40,0.18)` |

> Sources: `frontend/src/index.css` lines 388–422 (light), 430–464 (dark), 468–502 (earth).

### 1.2 Fixed / Non-Themed Colors

These appear inline in the codebase and are not theme-switched:

| Usage | Value | Source |
|---|---|---|
| Search input blue highlight | `#60a5fa` | `index.css:296` |
| Search input green highlight | `#22c55e` | `index.css:300` |
| Spinner border | `rgba(148,163,184,0.45)` | `index.css:342` |
| Dark notes divider | `rgba(123,201,254,0.55)` | `index.css:26` |
| Landing hero eyebrow dot glow | `rgba(139,94,52,0.35)` | `landing.module.css:96` |

### 1.3 Mobile Adaptation Notes

- On mobile, `--page-bg` maps to the root `View` background — apply it via the `bg-page` utility defined in the Tailwind config.
- Dark mode should be driven by the system color scheme (`useColorScheme()` in React Native) and mapped to the same dark-theme tokens.
- The `rgba` alpha tokens (accent-soft, separator-via, focus-ring) should be expressed as hex8 or via NativeWind's `opacity` modifier.

---

## 2. Border Radius Scale

> Sources: `frontend/src/index.css` lines 133, 167, 193, 418, 557, 615; `frontend/src/pages/landing/landing.module.css` lines 41, 56, 78, 88, 211, 270, 307, 355, 424.

| Token name | Value | Usage |
|---|---|---|
| `radius-xs` | `2px` | Sticky note corners (`landing.module.css:260`) |
| `radius-sm` | `4px` | Code lang badge, PDF illustration inner (`index.css:167`, `landing.module.css:167,185`) |
| `radius-md` | `6px` | Notes illustration (`landing.module.css:237`) |
| `radius-base` | `8px` | Brand mark, notebook illustration (`landing.module.css:41,211`) |
| `radius-lg` | `10px` | Buttons (`--btn-radius`), code-viewer container, copy button (`index.css:133,193,418`) |
| `radius-xl` | `12px` | Button lg variant, feature chip, feature header icon (`landing.module.css:78,270,307`) |
| `radius-2xl` | `16px` | Plan card, button xl variant (`landing.module.css:78,355`) |
| `radius-full` | `9999px` | Pill buttons (`index.css:615`), eyebrow badge, language toggle (`landing.module.css:88,424`) |

### Mobile Adaptation Notes

- All radii carry over unchanged — they form part of the brand identity.
- `radius-lg` (10px) is the default interactive element radius.
- Bottom sheets and modals on mobile use `radius-2xl` (16px) on the top two corners only.

---

## 3. Shadow System

> Sources: `frontend/src/index.css` lines 31–34, 401, 411, 417, 443, 453, 459, 481, 491, 497; `frontend/src/pages/landing/landing.module.css` lines 44, 65, 67, 70, 91, 96, 163, 212, 260, 272, 311, 357, 362, 369.

### 3.1 Theme Shadows (Card / Container)

| Token | Value | Theme |
|---|---|---|
| `--shadow` (light) | `0 5px 50px -12px rgba(0,0,0,0.201)` | Light — `index.css:401` |
| `--shadow` (dark) | `0 5px 50px -12px rgba(0,0,0,0.5)` | Dark — `index.css:443` |
| `--shadow` (earth) | `0 5px 40px -16px rgba(88,64,42,0.2)` | Earth — `index.css:481` |

### 3.2 Button Shadows

| Token | Light | Dark | Earth |
|---|---|---|---|
| `--btn-shadow-hover` | `0 1px 3px rgba(0,0,0,0.08)` | `0 1px 3px rgba(0,0,0,0.3)` | `0 1px 3px rgba(88,64,42,0.1)` |
| `--btn-primary-shadow-hover` | `0 1px 4px rgba(43,108,238,0.2)` | `0 1px 4px rgba(123,201,254,0.3)` | `0 1px 4px rgba(139,94,52,0.2)` |

> Sources: `index.css:411,417,453,459,491,497`

### 3.3 Specialty Shadows

| Usage | Value | Source |
|---|---|---|
| PDF page focus halo (dark) | `0 0 0 1px rgba(231,231,231,0.108), 0 0 28px rgba(113,113,113,0.182), 0 10px 30px rgba(86,86,86,0.665)` | `index.css:31–34` |
| Landing primary button | `0 1px 0 rgba(255,255,255,0.25) inset, 0 6px 18px -8px rgba(139,94,52,0.55)` | `landing.module.css:65` |
| Landing primary button hover | `0 1px 0 rgba(255,255,255,0.3) inset, 0 10px 24px -8px rgba(139,94,52,0.65)` | `landing.module.css:67` |
| Landing plan card (pro) | `0 0 0 1px rgba(139,94,52,0.12), 0 24px 50px -22px rgba(139,94,52,0.35)` | `landing.module.css:362` |
| Feature chip | `0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(88,64,42,0.35), 0 4px 14px -8px rgba(88,64,42,0.18)` | `landing.module.css:272` |
| Notebook card | `0 1px 2px rgba(88,64,42,0.08), 0 14px 28px -16px rgba(88,64,42,0.25)` | `landing.module.css:212` |

### 3.4 Mobile Adaptation Notes

- React Native's `shadow*` props (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`) and `elevation` (Android) do not support multi-layer or inset shadows.
- **Mobile equivalent mapping:**
  - `--shadow` card shadow → `shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4`
  - Button pressed shadow → use `elevation: 2` on Android; skip on iOS (use opacity change instead).
  - Inset and multi-layer shadows: **omit** on mobile. Use a subtle border or `elevation` delta instead.
- For the Earth theme on mobile, tint `shadowColor` with `#58402A` and reduce opacity accordingly.

---

## 4. Effects

### 4.1 Hero Glow (Radial Gradients)

| Theme | Value | Source |
|---|---|---|
| Light | `radial-gradient(circle at center, rgba(148,163,184,0.25) 0%, rgba(16,22,34,0) 70%)` | `index.css:400` |
| Dark | `radial-gradient(circle at center, rgba(123,201,254,0.15) 0%, rgba(18,18,18,0) 70%)` | `index.css:442` |
| Earth | `radial-gradient(circle at center, rgba(181,139,96,0.35) 0%, rgba(16,22,34,0) 70%)` | `index.css:480` |

### 4.2 Glassmorphism (Navigation Bar)

```
backdrop-filter: blur(14px) saturate(140%);
-webkit-backdrop-filter: blur(14px) saturate(140%);
```
> Source: `landing.module.css:25–26`

### 4.3 Landing Background Texture

```css
/* Page background gradient vignette — landing.module.css:12–14 */
radial-gradient(1200px 700px at 0% 0%, rgba(139,94,52,0.06), transparent 60%),
radial-gradient(1000px 600px at 100% 100%, rgba(74,109,180,0.05), transparent 60%)

/* Hero grid lines — landing.module.css:139–141 */
linear-gradient(rgba(139,94,52,0.06) 1px, transparent 1px),
linear-gradient(90deg, rgba(139,94,52,0.06) 1px, transparent 1px)
```

### 4.4 Accent Gradients

| Usage | Value | Source |
|---|---|---|
| Brand mark | `linear-gradient(140deg, #8b5e34 0%, #c97b4a 100%)` | `landing.module.css:42` |
| Feature icon | `linear-gradient(135deg, #f0e8d8, #fbf8f1)` | `landing.module.css:308` |
| Plan Pro card | `linear-gradient(180deg, #faf6ec 0%, #fbf8f1 100%)` | `landing.module.css:360` |
| Final CTA glow | `radial-gradient(ellipse 60% 80% at 50% 100%, rgba(139,94,52,0.12), transparent 60%)` | `landing.module.css:393` |
| Sticky note overlay | `linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 30%)` | `landing.module.css:261` |

### 4.5 Mobile Adaptation Notes

- `backdrop-filter` is not available in React Native. Use `expo-blur` (`BlurView`) for glassmorphism navigation bar.
- CSS radial/linear gradients → use `expo-linear-gradient` with equivalent color stops. For radial gradients, approximate with a centered `LinearGradient` using `useNativeDriver`.
- Hero grid lines are decorative — omit on mobile or use a very faint static background image.
- Brand mark gradient (`linear-gradient(140deg, #8b5e34, #c97b4a)`) **must be preserved** — core identity element.

---

## 5. Transitions & Animations

> Sources: `frontend/src/index.css`, `frontend/src/components/PageTransition.module.css`, `frontend/src/pages/landing/landing.module.css`

### 5.1 Core Durations & Easings

| Usage | Duration | Easing | Source |
|---|---|---|---|
| Link color change | `0.2s` | `ease` | `index.css:18,537` |
| Button all properties | `0.2s` | `ease` | `index.css:568` |
| Link-btn all properties | `0.2s` | `ease` | `index.css:618` |
| Code viewer copy button | `0.15s` | `ease` | `index.css:195` |
| Page entry transition | `0.55s` | `cubic-bezier(0.22, 1, 0.36, 1)` | `PageTransition.module.css:7–8` |
| Page transition delay | `0.25s` | — | `PageTransition.module.css:8` |
| Landing button micro-interaction | `0.12s` transform, `0.18s` bg/border/shadow | `ease` | `landing.module.css:59` |
| Scene item hover | `0.35s` | `ease` | `landing.module.css:164` |

### 5.2 Keyframe Animations

| Name | Definition | Duration | Usage |
|---|---|---|---|
| `fade-in` | `opacity:0, translateY(4px)` → `opacity:1, translateY(0)` | `0.2s ease-out` | Generic element entry — `index.css:12–18` |
| `fadeIn` (page) | `opacity:0, translateY(18px)` → `opacity:1, translateY(0)` | `0.55s cubic-bezier(0.22,1,0.36,1)` with `0.25s` delay | Screen/page entry — `PageTransition.module.css:1–8` |
| `bobA` | `translateY(0) rotate(-5deg)` ↔ `translateY(-10px) rotate(-3deg)` | `7s ease-in-out infinite` | Landing floating illustration |
| `bobB` | `translateY(0) rotate(4deg)` ↔ `translateY(-7px) rotate(6deg)` | `8s ease-in-out infinite` | Landing floating illustration |
| `bobC` | `translateY(0) rotate(-2deg)` ↔ `translateY(-5px) rotate(0)` | `6.5s ease-in-out infinite` | Landing floating illustration |
| `bobD` | `translateY(0) rotate(8deg)` ↔ `translateY(-9px) rotate(5deg)` | `9s ease-in-out infinite` | Landing floating illustration |
| `bobE` | `translateY(0) rotate(-8deg)` ↔ `translateY(-6px) rotate(-10deg)` | `5s ease-in-out infinite` | Landing floating illustration |
| `search-border-cycle` | color-cycle on border | `1.2s ease-in-out infinite` | Search input active state — `index.css:328` |
| `search-spin` | `rotate(360deg)` | `0.75s linear infinite` | Spinner — `index.css:345` |

### 5.3 Mobile Adaptation Notes

- CSS transitions → React Native `Animated` API or `react-native-reanimated` v3.
- **Page transitions:** Replace `fadeIn 0.55s cubic-bezier(0.22,1,0.36,1)` with a spring animation: `withSpring(0, { damping: 20, stiffness: 200 })` on `translateY`. Matches the "ease out bounce" character of the cubic bezier while feeling native.
- **Button press:** Use `Pressable` with `onPressIn`/`onPressOut` + `withTiming(0.96, { duration: 120 })` scale — matches the `0.12s` transform on web.
- **Floating bob animations:** Decorative only — omit on mobile for performance.
- **Spinner:** React Native `ActivityIndicator` styled with `--accent` color, or a custom `Animated.loop` rotation at `0.75s linear`.
- Always respect `AccessibilityInfo.isReduceMotionEnabled()` — disable non-essential animations when true.

---

## 6. Typography

> Sources: `frontend/src/index.css` lines 382–384, 138, 149, 164, 225, 375; `frontend/src/pages/landing/landing.module.css` lines 6, 16, 48, 99, 112, 129, 137, 201.

### 6.1 Font Families

| Family | Usage | Source |
|---|---|---|
| `system-ui, Avenir, Helvetica, Arial, sans-serif` | App body / UI (default) | `index.css:382` |
| `'Instrument Serif', Georgia, serif` | Display headings, brand name, landing sections | `landing.module.css:48,99,112,201,303,343,373` |
| `'Caveat', cursive` | Handwritten accents, annotations | `landing.module.css:129,240,258` |
| `'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace` | Code blocks, code viewer | `index.css:137`, `landing.module.css:137` |
| `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, 'Helvetica Neue', Arial, sans-serif` | Landing page nav / body | `landing.module.css:16` |

**Mobile note:** Use the platform system font (`System` on iOS = SF Pro, Roboto on Android) as the sans-serif body fallback. Load `Instrument Serif` and `Caveat` via `expo-font` or `@expo-google-fonts/instrument-serif` + `@expo-google-fonts/caveat`.

### 6.2 Font Scale

| Level | Size | Weight | Line Height | Usage | Source |
|---|---|---|---|---|---|
| `display-xl` | `108px` (max of clamp) | 400 | 1.0 | Final CTA hero | `landing.module.css:397` |
| `display-lg` | `96px` (max of clamp) | 400 | 1.0 | Page hero heading | `landing.module.css:101–102` |
| `display-md` | `64px` (max of clamp) | 400 | 1.05 | Section heading | `landing.module.css:114–115` |
| `h1` | `~51px` (3.2em at 16px base) | — | 1.1 | HTML h1 | `index.css:552–553` |
| `plan-price` | `60px` | — | 1.0 | Pricing number | `landing.module.css:373` |
| `feature-h` | `28px` | 400 | — | Feature card title | `landing.module.css:315` |
| `step-h` | `32px` | — | 1.1 | How-it-works step | `landing.module.css:345` |
| `plan-name` | `28px` | — | — | Plan name | `landing.module.css:371` |
| `lead` | `18px` | — | 1.6 | Hero lead paragraph | `landing.module.css:119` |
| `body` | `16px` | 400 | 1.5 | App body text | `index.css:383–384` |
| `body-sm` | `15px` | — | — | Feature description | `landing.module.css:318` |
| `body-xs` | `14px` | 500 | 1.4 | Button label, footer links | `index.css:560–561`, `landing.module.css:164` |
| `caption` | `13px` | — | 1.4 | Hero meta | `landing.module.css:155` |
| `label` | `12px` | 500 | 1.3 | Section eyebrow, footer headers, code lang badge | `landing.module.css:121–122,410–412`, `index.css:164–165` |
| `code` | `13px` (0.8125rem) | — | — | Code viewer body | `index.css:138` |
| `code-header` | `12px` (0.75rem) | — | — | Code viewer header | `index.css:149` |
| `code-lang` | `10px` (0.625rem) | 500 | — | Code language badge | `index.css:164–165` |
| `markdown` | `12px` (0.75rem) | — | 1.3 | Markdown note preview | `index.css:375–376` |

### 6.3 Letter Spacing

No explicit `letter-spacing` values are set in source CSS — all are browser defaults. Mark as **TBD** if platform differences are noticed during development.

---

## 7. Spacing Scale

The web app does not use a custom Tailwind spacing scale — it relies on Tailwind v4 defaults and explicit `px` values in module CSS. The values below are extracted from actual usage and define the mobile spacing rhythm.

> Source: `frontend/src/pages/landing/landing.module.css`, `frontend/src/index.css`

### 7.1 Common Spacing Values Observed

| Value | Usage | Source |
|---|---|---|
| `4px` | Tight gaps (chip icon, step number margin) | `landing.module.css:275,304` |
| `6px` | Feature bullet gap, eyebrow vertical padding | `landing.module.css:88,320` |
| `8px` | Nav CTA gap, notebook cell padding | `landing.module.css:51,217` |
| `10px` | Chip padding-v, feature title margin | `landing.module.css:269,317` |
| `12px` | Hero CTA gap, plan features gap | `landing.module.css:152,377` |
| `14px` | Chip padding-h, eyebrow padding-h | `landing.module.css:88,269` |
| `16px` | PDF illustration padding-v | `landing.module.css:186` |
| `18px` | Hero meta gap, notes padding | `landing.module.css:154,238` |
| `20px` | Button padding-h (base) | `landing.module.css:56` |
| `22px` | Feature layout gap, hero lead margin | `landing.module.css:151,311` |
| `24px` | Button lg padding-h, footer bottom padding-top | `landing.module.css:78,418` |
| `28px` | Hero lead margin | `landing.module.css:151` |
| `30px` | Button xl padding-h | `landing.module.css:79` |
| `32px` | Nav inner padding, feature padding-h, how-steps gap | `landing.module.css:31,294,332` |
| `36px` | Hero CTAs margin-top, feature padding-v, plan padding | `landing.module.css:152,294,354` |
| `40px` | Final CTA lead margin | `landing.module.css:399` |
| `44px` | Button base height (minimum touch target) | `landing.module.css:56` |
| `48px` | Footer inner gap | `landing.module.css:406` |
| `52px` | Button lg height | `landing.module.css:78` |
| `56px` | Hero inner grid gap | `landing.module.css:147` |
| `60px` | Button xl height | `landing.module.css:79` |
| `68px` | Nav height | `landing.module.css:33` |
| `80px` | Section padding-b | `landing.module.css:83` |
| `120px` | Section padding-v | `landing.module.css:83` |

### 7.2 Mobile-Specific Spacing

| Token | Value | Purpose |
|---|---|---|
| `safe-top` | Dynamic via `useSafeAreaInsets()` | Status bar clearance |
| `safe-bottom` | Dynamic via `useSafeAreaInsets()` | Home indicator clearance |
| `screen-h-padding` | `16px` | Horizontal screen margin |
| `tab-bar-height` | `56px` | Bottom tab bar height |
| `min-touch-target` | `44px` | Minimum tappable area (WCAG 2.5.5) |

---

## 8. Mobile-Specific Considerations

### 8.1 Inherit Unchanged from Web

- **Color palette** — all three themes (Light, Dark, Earth), all semantic tokens.
- **Border radius scale** — all values from `radius-xs` (2px) to `radius-full` (9999px).
- **Typography hierarchy** — same size scale and font families.
- **Brand identity** — brand mark gradient, Instrument Serif for display text, Caveat for handwriting.
- **Accent color logic** — `--accent` as the single interactive color adapting per theme.

### 8.2 Adapt for Mobile

| Concern | Web behavior | Mobile behavior |
|---|---|---|
| **Touch targets** | Buttons as small as `32px` in some UI | Minimum `44pt` (44px @ 1x). Increase padding on small elements. |
| **Shadows** | Multi-layer CSS `box-shadow` with `inset` and large spread | Single-layer `shadow*` props; no inset. Use `elevation` on Android. |
| **Backdrop blur** | `backdrop-filter: blur(14px) saturate(140%)` | Use `expo-blur` (`BlurView`) or `@react-native-community/blur`. |
| **Gradients** | CSS `linear-gradient` / `radial-gradient` | `expo-linear-gradient` or `react-native-linear-gradient`. |
| **Page transitions** | `translateY(18px) + fade, 0.55s cubic-bezier(0.22,1,0.36,1)` | Spring animation via Reanimated v3 for native feel. |
| **Button press** | `transform: scale(0.98)` on `:active` (`0.12s ease`) | `Pressable` + `withTiming(0.96, {duration:120})` scale. |
| **Hover states** | CSS `:hover` | Replace with `pressed` state via `Pressable`. No hover on mobile. |
| **Navigation** | Sidebar / top nav | Bottom tab bar (`react-navigation` `Tab.Navigator`). |
| **Modals** | Centered overlay modal | Bottom sheet (`@gorhom/bottom-sheet`) with `radius-2xl` (16px) top corners. |
| **Reduced motion** | `@media (prefers-reduced-motion)` | `AccessibilityInfo.isReduceMotionEnabled()`. |
| **Safe areas** | Not applicable | `<SafeAreaProvider>` from `react-native-safe-area-context`. |
| **Keyboard** | CSS focus ring | `KeyboardAvoidingView` + `ScrollView` with `keyboardShouldPersistTaps`. |
| **Fonts** | Google Fonts CDN | `expo-font` or `@expo-google-fonts/*`. |
| **Dark mode** | CSS class on `<html>` | `useColorScheme()` + React context providing active theme tokens. |

### 8.3 Mobile-Only Patterns

These screens/flows exist only on mobile but must use the web design tokens to maintain brand cohesion:

- **Onboarding / splash** — use `--accent` brand gradient, Instrument Serif display text, `radius-2xl` cards.
- **Bottom sheet document viewer** — 16px top radius, `--card-bg` background, `--shadow` from active theme.
- **Pull-to-refresh** — use `--accent` color for the refresh indicator.
- **Swipe-to-dismiss** — spring physics via Reanimated; decelerate matching web's `cubic-bezier(0.22,1,0.36,1)` feel.
- **Skeleton loaders** — animate `--card-border` ↔ `--card-bg` with 0.8 opacity.
- **Toast / snackbar** — `radius-lg` (10px), `--card-bg` surface, `--text-primary` text, positioned above tab bar.
- **Haptic feedback** — light impact on button press, medium on destructive actions. No web equivalent.

---

## 9. Component Mapping

### 9.1 Primary Button

**Web source:** `frontend/src/index.css:555–570`, `frontend/src/pages/landing/landing.module.css:56–68`

```css
/* Web */
border-radius: var(--btn-radius);    /* 10px */
background: var(--btn-primary-bg);   /* --accent */
color: var(--btn-primary-text);      /* #ffffff */
font-size: 0.875rem; font-weight: 500;
height: 44px; padding: 0 20px;
transition: all 0.2s ease;
box-shadow: 0 1px 0 rgba(255,255,255,0.25) inset, 0 6px 18px -8px rgba(139,94,52,0.55);
```

**Mobile (NativeWind):**
```tsx
<Pressable
  className="h-11 px-5 rounded-[10px] bg-accent items-center justify-center"
  style={({ pressed }) => ({
    opacity: pressed ? 0.85 : 1,
    transform: [{ scale: pressed ? 0.96 : 1 }],
    // iOS only shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3, // Android
  })}
>
  <Text className="text-sm font-medium text-white">Label</Text>
</Pressable>
```

**Mobile-only notes:** Remove inset shadow. Minimum height `44px` (`h-11`). Pressed state via Reanimated `withTiming(0.96, {duration:120})`.

---

### 9.2 Card

**Web source:** `frontend/src/index.css:22`, design tokens in `index.css:389–401`

```css
/* Web */
background: var(--card-bg);
border: 1px solid var(--card-border);
border-radius: 10px;
box-shadow: var(--shadow); /* 0 5px 50px -12px rgba(0,0,0,0.201) */
```

**Mobile (NativeWind):**
```tsx
<View
  className="bg-card-bg border border-card-border rounded-[10px] p-4"
  style={{
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  }}
>
  {children}
</View>
```

**Mobile-only notes:** Shadow simplified to single layer. Earth theme: use `shadowColor: '#58402A'`, `shadowOpacity: 0.10`.

---

### 9.3 Input Field

**Web source:** `frontend/src/index.css` — `--input-bg`, `--input-border`, `--text-primary` tokens.

```css
/* Web */
background: var(--input-bg);
border: 1px solid var(--input-border);
border-radius: 10px;
color: var(--text-primary);
font-size: 0.875rem;
```

**Mobile (NativeWind):**
```tsx
<TextInput
  className="bg-input-bg border border-input-border rounded-[10px] px-4 h-11 text-sm text-text-primary"
  placeholderTextColor={theme.textMuted}  // resolved from active theme context
/>
```

**Mobile-only notes:** Height `44px` minimum. On focus: border color → `--accent`. Use `KeyboardAvoidingView` on input-heavy screens.

---

### 9.4 Bottom Sheet (Modal replacement)

**Web:** Centered overlay modal. No dedicated source file identified for the modal container itself.

**Mobile:**
```tsx
// Uses @gorhom/bottom-sheet ^4.6.4
<BottomSheet
  snapPoints={['50%', '90%']}
  backgroundStyle={{
    backgroundColor: theme.cardBg,          // --card-bg
    borderTopLeftRadius: 16,                // radius-2xl
    borderTopRightRadius: 16,
  }}
  handleIndicatorStyle={{ backgroundColor: theme.cardBorder }}
>
  <BottomSheetView className="px-4 pb-safe">
    {content}
  </BottomSheetView>
</BottomSheet>
```

**Mobile-only notes:** Top two corners only at `radius-2xl` (16px). Dismiss via swipe-down. Background scrim: `rgba(0,0,0,0.4)` light / `rgba(0,0,0,0.6)` dark.

---

### 9.5 Tab Bar (Navigation)

**Web source:** `frontend/src/index.css:420–422,462–464,500–502` — tab inactive tokens.

```css
/* Web inactive tab */
background: var(--tab-inactive-bg);
color: var(--tab-inactive-text);
/* Web active tab */
background: var(--accent-soft);
color: var(--accent);
```

**Mobile (`react-navigation` Tab.Navigator):**
```tsx
tabBarStyle: {
  backgroundColor: theme.cardBg,          // --card-bg
  borderTopColor: theme.cardBorder,        // --card-border
  height: 56,
  paddingBottom: insets.bottom,
},
tabBarActiveTintColor: theme.accent,       // --accent
tabBarInactiveTintColor: theme.tabInactiveText,  // --tab-inactive-text
```

**Mobile-only notes:** Add safe area `paddingBottom`. Active icon gets `--accent` tint. Use `react-native-safe-area-context` for insets.

---

## 10. tailwind.config.js Snippet

Drop this into the mobile project root. Uses **NativeWind v4** (`nativewind/preset`). Light-theme values are the defaults; swap via a React context that resolves CSS-variable-equivalent values per active theme at runtime.

```js
// tailwind.config.js
// Compatible with: nativewind@^4.1.23, tailwindcss@^3.4.x
const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './screens/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // ─── Colors (Light theme defaults) ───────────────────────
      // index.css:388–422
      colors: {
        'page-bg':           '#f5f7fb',   // index.css:388 (stripped alpha)
        'card-bg':           '#ffffff',   // index.css:389
        'card-border':       '#e2e8f0',   // index.css:390
        'input-bg':          '#f8fafc',   // index.css:391
        'input-border':      '#cbd5e1',   // index.css:392

        'text-primary':      '#0f172a',   // index.css:393
        'text-secondary':    '#64748b',   // index.css:394
        'text-muted':        '#8fa1b9',   // index.css:395

        'accent':            '#4a6db4',   // index.css:397
        'accent-soft':       '#dbeafe',   // index.css:398 (rgba(43,108,238,0.12) ≈ on white)
        'accent-strong':     '#3c5873',   // index.css:399

        'link':              '#4f46e5',   // index.css:402
        'link-hover':        '#4338ca',   // index.css:403

        'btn-bg':            '#ffffff',   // index.css:405
        'btn-bg-pressed':    '#f1f5f9',   // index.css:406
        'btn-text':          '#0f172a',   // index.css:407
        'btn-border':        '#cbd5e1',   // index.css:408
        'btn-primary-bg':    '#4a6db4',   // index.css:413 (= accent)
        'btn-primary-text':  '#ffffff',   // index.css:415

        'tab-inactive-bg':   '#e5e7eb',   // index.css:420
        'tab-inactive-text': '#4b5563',   // index.css:422

        // Fixed utility colors (not themed)
        'search-blue':       '#60a5fa',   // index.css:296
        'search-green':      '#22c55e',   // index.css:300

        // Brand mark gradient colors (landing.module.css:42)
        'brand-grad-from':   '#8b5e34',
        'brand-grad-to':     '#c97b4a',
      },

      // ─── Border Radius ────────────────────────────────────────
      borderRadius: {
        'xs':   '2px',     // landing.module.css:260 — sticky note
        'sm':   '4px',     // index.css:167          — lang badge
        'md':   '6px',     // landing.module.css:237 — notes illustration
        'base': '8px',     // landing.module.css:41  — brand mark
        'lg':   '10px',    // index.css:418          — buttons, code viewer (default)
        'xl':   '12px',    // landing.module.css:78  — button lg, chip
        '2xl':  '16px',    // landing.module.css:355 — plan card, bottom sheet top
        'full': '9999px',  // index.css:615          — pill buttons, eyebrow
      },

      // ─── Font Families ────────────────────────────────────────
      fontFamily: {
        // index.css:382 — system-ui equivalent on mobile
        sans:  ['System'],
        // landing.module.css:48 — load via @expo-google-fonts/instrument-serif
        serif: ['InstrumentSerif_400Regular'],
        // landing.module.css:129 — load via @expo-google-fonts/caveat
        hand:  ['Caveat_500Medium'],
        // index.css:137
        mono:  ['JetBrainsMono_400Regular', 'Courier New', 'monospace'],
      },

      // ─── Font Sizes ───────────────────────────────────────────
      fontSize: {
        // Display scale (landing.module.css — clamped to max values on mobile)
        'display-xl': ['72px',  { lineHeight: '1.0' }],   // landing.module.css:397 (scaled for mobile)
        'display-lg': ['56px',  { lineHeight: '1.0' }],   // landing.module.css:101–102 (scaled)
        'display-md': ['40px',  { lineHeight: '1.05' }],  // landing.module.css:114–115 (scaled)
        'h1':         ['32px',  { lineHeight: '1.1' }],   // index.css:552 (scaled for mobile)
        'plan-price': ['48px',  { lineHeight: '1.0' }],   // landing.module.css:373 (scaled)
        'feature-h':  ['22px',  { lineHeight: '1.2' }],   // landing.module.css:315
        'step-h':     ['24px',  { lineHeight: '1.1' }],   // landing.module.css:345 (scaled)
        'lead':       ['18px',  { lineHeight: '1.6' }],   // landing.module.css:119
        'body':       ['16px',  { lineHeight: '1.5' }],   // index.css:383–384
        'body-sm':    ['15px',  { lineHeight: '1.5' }],   // landing.module.css:318
        'body-xs':    ['14px',  { lineHeight: '1.4', fontWeight: '500' }], // index.css:560–561
        'caption':    ['13px',  { lineHeight: '1.4' }],   // landing.module.css:155
        'label':      ['12px',  { lineHeight: '1.3', fontWeight: '500' }], // landing.module.css:121
        'code':       ['13px',  { lineHeight: '1.5' }],   // index.css:138 (0.8125rem)
        'code-hdr':   ['12px',  { lineHeight: '1.3' }],   // index.css:149
        'code-lang':  ['10px',  { lineHeight: '1.2', fontWeight: '500' }], // index.css:164
        'markdown':   ['12px',  { lineHeight: '1.3' }],   // index.css:375
      },

      // ─── Spacing extras ───────────────────────────────────────
      spacing: {
        // Additional values not in Tailwind v3 default scale
        '4.5': '18px',   // landing.module.css:154 — hero meta gap
        '11':  '44px',   // landing.module.css:56  — min touch target / button base height
        '13':  '52px',   // landing.module.css:78  — button lg height
        '15':  '60px',   // landing.module.css:79  — button xl height
        '17':  '68px',   // landing.module.css:33  — nav height
        '18':  '72px',   // approximate section gap
      },

      // ─── Min/Max heights ─────────────────────────────────────
      minHeight: {
        'touch': '44px',   // WCAG 2.5.5 minimum touch target
      },
      height: {
        'tab-bar': '56px', // bottom tab bar height
        'nav':     '68px', // landing.module.css:33
      },

      // ─── Border widths ────────────────────────────────────────
      borderWidth: {
        hairline: hairlineWidth(), // NativeWind utility for 1px on all densities
      },

      // ─── Animation durations ─────────────────────────────────
      transitionDuration: {
        '120': '120ms',  // landing.module.css:59 — button press micro-interaction
        '150': '150ms',  // index.css:195         — copy button
        '200': '200ms',  // index.css:568         — button default
        '350': '350ms',  // landing.module.css:164— element hover
        '550': '550ms',  // PageTransition.module.css:7 — page entry
      },

      // ─── Keyframes (for Reanimated-style reference) ───────────
      // Actual animations on mobile use react-native-reanimated, not CSS.
      // These are kept as documentation anchors.
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
          // index.css:12–14
        },
        'fade-in-page': {
          '0%':   { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
          // PageTransition.module.css:1–4 — use withSpring on mobile
        },
        'spin': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
          // index.css:345 — 0.75s linear infinite
        },
      },
      animation: {
        'fade-in':      'fade-in 200ms ease-out',
        'fade-in-page': 'fade-in-page 550ms cubic-bezier(0.22,1,0.36,1) 250ms both',
        'spin':         'spin 750ms linear infinite',
      },
    },
  },
  plugins: [],
};
```

> **Dependency versions (verified against web app):**
> - `nativewind`: `^4.1.23`
> - `tailwindcss`: `^3.4.17` (NativeWind v4 peer dep — NOT Tailwind v4; web uses Tailwind v4 but mobile NativeWind requires v3)
> - `react-native-reanimated`: `^3.16.x`
> - `expo-linear-gradient`: `^14.x`
> - `expo-blur`: `^14.x`
> - `expo-font`: `^13.x`
> - `@expo-google-fonts/instrument-serif`: `^0.x`
> - `@expo-google-fonts/caveat`: `^0.x`
> - `react-native-safe-area-context`: `^4.14.x`
> - `@gorhom/bottom-sheet`: `^4.6.x`
> - `@react-navigation/bottom-tabs`: `^7.x`
>
> **Important:** The web project uses Tailwind CSS **v4** (`@tailwindcss/vite@^4.1.18`). NativeWind v4 requires Tailwind **v3** as its peer dependency. These are separate installs in separate package.json files — the mobile project must use Tailwind v3, not v4.

---

*Files searched for this document:*
- `frontend/src/index.css`
- `frontend/src/components/PageTransition.module.css`
- `frontend/src/pages/landing/landing.module.css`
- `frontend/vite.config.js`
- `frontend/package.json`

*No `tailwind.config.js` / `tailwind.config.ts` found — confirmed Tailwind v4 config-less setup (tokens defined via CSS custom properties in `index.css`).*
