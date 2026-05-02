# StudyAI Mobile Design System (Web-Derived)

This document captures the web app's existing design tokens and UI patterns so the StudyAI mobile companion app can mirror the same visual language using NativeWind.

## Scope and Mobile Stack
- Mobile UI stack: NativeWind (Tailwind utilities for React Native). Tokens below must be expressible as Tailwind config values.
- Web app themes: light, dark, system, earth (theme selection and application). Source: [frontend/src/context/ThemeContext.jsx](frontend/src/context/ThemeContext.jsx#L6-L23)

## Design Tokens

### Colors

#### Core palette (theme-aware)

| Token | Web value (Light / Dark / Earth) | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `page-bg` (background) | #f5f7fbe3 / #121212 / #f3efe6 | `colors.surface.page.{light,dark,earth}` | App background | [frontend/src/index.css](frontend/src/index.css#L388), [frontend/src/index.css](frontend/src/index.css#L430), [frontend/src/index.css](frontend/src/index.css#L468) |
| `card-bg` (surface) | #ffffff / #1E1E1E / #fbf8f1 | `colors.surface.card.{light,dark,earth}` | Card surface | [frontend/src/index.css](frontend/src/index.css#L389), [frontend/src/index.css](frontend/src/index.css#L431), [frontend/src/index.css](frontend/src/index.css#L469) |
| `card-border` (border) | #e2e8f0 / transparent / #d8cdbb | `colors.border.card.{light,dark,earth}` | Card outline | [frontend/src/index.css](frontend/src/index.css#L390), [frontend/src/index.css](frontend/src/index.css#L432), [frontend/src/index.css](frontend/src/index.css#L470) |
| `input-bg` (surface) | #f8fafc / #121212 / #f6f1e7 | `colors.surface.input.{light,dark,earth}` | Input background | [frontend/src/index.css](frontend/src/index.css#L391), [frontend/src/index.css](frontend/src/index.css#L433), [frontend/src/index.css](frontend/src/index.css#L471) |
| `input-border` (border) | #cbd5e1 / #424242 / #c7b8a2 | `colors.border.input.{light,dark,earth}` | Input outline | [frontend/src/index.css](frontend/src/index.css#L392), [frontend/src/index.css](frontend/src/index.css#L434), [frontend/src/index.css](frontend/src/index.css#L472) |
| `text-primary` | #0f172a / #E0E0E0 / #3f2f1f | `colors.text.primary.{light,dark,earth}` | Main text | [frontend/src/index.css](frontend/src/index.css#L393), [frontend/src/index.css](frontend/src/index.css#L435), [frontend/src/index.css](frontend/src/index.css#L473) |
| `text-secondary` | #64748b / #A0A0A0 / #6f5b45 | `colors.text.secondary.{light,dark,earth}` | Secondary text | [frontend/src/index.css](frontend/src/index.css#L394), [frontend/src/index.css](frontend/src/index.css#L436), [frontend/src/index.css](frontend/src/index.css#L474) |
| `text-muted` | #8fa1b9 / #757575 / #8b775f | `colors.text.muted.{light,dark,earth}` | Subtle text | [frontend/src/index.css](frontend/src/index.css#L395), [frontend/src/index.css](frontend/src/index.css#L437), [frontend/src/index.css](frontend/src/index.css#L475) |
| `accent` (primary) | #4a6db4 / #7BC9FE / #8b5e34 | `colors.brand.primary.{light,dark,earth}` | Brand primary | [frontend/src/index.css](frontend/src/index.css#L397), [frontend/src/index.css](frontend/src/index.css#L439), [frontend/src/index.css](frontend/src/index.css#L477) |
| `accent-strong` | #3c5873 / #3b82f6 / #6f4a28 | `colors.brand.primaryStrong.{light,dark,earth}` | Hover/strong primary | [frontend/src/index.css](frontend/src/index.css#L399), [frontend/src/index.css](frontend/src/index.css#L441), [frontend/src/index.css](frontend/src/index.css#L479) |
| `accent-soft` | rgba(43, 108, 238, 0.12) / rgba(123, 201, 254, 0.15) / rgba(139, 94, 52, 0.18) | `colors.brand.primarySoft.{light,dark,earth}` | Soft highlight fill | [frontend/src/index.css](frontend/src/index.css#L398), [frontend/src/index.css](frontend/src/index.css#L440), [frontend/src/index.css](frontend/src/index.css#L478) |
| `link-color` | #4f46e5 / #7BC9FE / #8b5e34 | `colors.link.base.{light,dark,earth}` | Links | [frontend/src/index.css](frontend/src/index.css#L402), [frontend/src/index.css](frontend/src/index.css#L444), [frontend/src/index.css](frontend/src/index.css#L482) |
| `link-hover-color` | #4338ca / #BAE6FD / #6f4a28 | `colors.link.hover.{light,dark,earth}` | Link hover | [frontend/src/index.css](frontend/src/index.css#L403), [frontend/src/index.css](frontend/src/index.css#L445), [frontend/src/index.css](frontend/src/index.css#L483) |
| `separator-via` | rgba(15, 23, 42, 0.10) / rgba(255, 255, 255, 0.20) / rgba(120, 90, 40, 0.18) | `colors.separator.via.{light,dark,earth}` | Separator gradient mid-stop | [frontend/src/index.css](frontend/src/index.css#L396), [frontend/src/index.css](frontend/src/index.css#L438), [frontend/src/index.css](frontend/src/index.css#L476) |
| `tab-inactive-bg` | #e5e7eb / #2C2C2C / #e8ddc6 | `colors.tabs.inactiveBg.{light,dark,earth}` | Document tabs | [frontend/src/index.css](frontend/src/index.css#L420), [frontend/src/index.css](frontend/src/index.css#L462), [frontend/src/index.css](frontend/src/index.css#L500) |
| `tab-inactive-bg-hover` | #d1d5db / #383838 / #ddcfb0 | `colors.tabs.inactiveBgHover.{light,dark,earth}` | Document tabs hover | [frontend/src/index.css](frontend/src/index.css#L421), [frontend/src/index.css](frontend/src/index.css#L463), [frontend/src/index.css](frontend/src/index.css#L501) |
| `tab-inactive-text` | #4b5563 / #B0B0B0 / #6f5b45 | `colors.tabs.inactiveText.{light,dark,earth}` | Document tabs text | [frontend/src/index.css](frontend/src/index.css#L422), [frontend/src/index.css](frontend/src/index.css#L464), [frontend/src/index.css](frontend/src/index.css#L502) |

#### Button palette (theme-aware)

| Token | Web value (Light / Dark / Earth) | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `btn-bg` | #ffffff / #2C2C2C / #fbf8f1 | `colors.button.bg.{light,dark,earth}` | Default button fill | [frontend/src/index.css](frontend/src/index.css#L405), [frontend/src/index.css](frontend/src/index.css#L447), [frontend/src/index.css](frontend/src/index.css#L485) |
| `btn-bg-hover` | #f1f5f9 / #383838 / #f0e8d8 | `colors.button.bgHover.{light,dark,earth}` | Button hover | [frontend/src/index.css](frontend/src/index.css#L406), [frontend/src/index.css](frontend/src/index.css#L448), [frontend/src/index.css](frontend/src/index.css#L486) |
| `btn-text` | var(--text-primary) / #E0E0E0 / #3f2f1f | `colors.button.text.{light,dark,earth}` | Default button text | [frontend/src/index.css](frontend/src/index.css#L407), [frontend/src/index.css](frontend/src/index.css#L449), [frontend/src/index.css](frontend/src/index.css#L487) |
| `btn-border` | var(--input-border) / #444444 / #c7b8a2 | `colors.button.border.{light,dark,earth}` | Default button border | [frontend/src/index.css](frontend/src/index.css#L408), [frontend/src/index.css](frontend/src/index.css#L450), [frontend/src/index.css](frontend/src/index.css#L488) |
| `btn-border-hover` | var(--accent) / #555555 / var(--accent) | `colors.button.borderHover.{light,dark,earth}` | Hover border | [frontend/src/index.css](frontend/src/index.css#L409), [frontend/src/index.css](frontend/src/index.css#L451), [frontend/src/index.css](frontend/src/index.css#L489) |
| `btn-focus-ring` | rgba(43, 108, 238, 0.35) / rgba(123, 201, 254, 0.45) / rgba(139, 94, 52, 0.35) | `colors.button.focusRing.{light,dark,earth}` | Focus halo | [frontend/src/index.css](frontend/src/index.css#L412), [frontend/src/index.css](frontend/src/index.css#L454), [frontend/src/index.css](frontend/src/index.css#L492) |
| `btn-shadow` | none / none / none | `boxShadow.buttonDefault` | Default buttons are flat | [frontend/src/index.css](frontend/src/index.css#L410), [frontend/src/index.css](frontend/src/index.css#L452), [frontend/src/index.css](frontend/src/index.css#L490) |
| `btn-shadow-hover` | 0 1px 3px rgba(0, 0, 0, 0.08) / 0 1px 3px rgba(0, 0, 0, 0.3) / 0 1px 3px rgba(88, 64, 42, 0.1) | `boxShadow.buttonHover.{light,dark,earth}` | Hover depth | [frontend/src/index.css](frontend/src/index.css#L411), [frontend/src/index.css](frontend/src/index.css#L453), [frontend/src/index.css](frontend/src/index.css#L491) |
| `btn-primary-bg` | var(--accent) / var(--accent) / var(--accent) | `colors.button.primaryBg.{light,dark,earth}` | Primary button fill | [frontend/src/index.css](frontend/src/index.css#L413), [frontend/src/index.css](frontend/src/index.css#L455), [frontend/src/index.css](frontend/src/index.css#L493) |
| `btn-primary-bg-hover` | var(--accent-strong) / var(--accent-strong) / var(--accent-strong) | `colors.button.primaryBgHover.{light,dark,earth}` | Primary hover | [frontend/src/index.css](frontend/src/index.css#L414), [frontend/src/index.css](frontend/src/index.css#L456), [frontend/src/index.css](frontend/src/index.css#L494) |
| `btn-primary-text` | #ffffff / #121212 / #ffffff | `colors.button.primaryText.{light,dark,earth}` | Primary text | [frontend/src/index.css](frontend/src/index.css#L415), [frontend/src/index.css](frontend/src/index.css#L457), [frontend/src/index.css](frontend/src/index.css#L495) |
| `btn-primary-shadow` | none / none / none | `boxShadow.buttonPrimary` | Primary buttons are flat | [frontend/src/index.css](frontend/src/index.css#L416), [frontend/src/index.css](frontend/src/index.css#L458), [frontend/src/index.css](frontend/src/index.css#L496) |
| `btn-primary-shadow-hover` | 0 1px 4px rgba(43, 108, 238, 0.2) / 0 1px 4px rgba(123, 201, 254, 0.3) / 0 1px 4px rgba(139, 94, 52, 0.2) | `boxShadow.buttonPrimaryHover.{light,dark,earth}` | Primary hover depth | [frontend/src/index.css](frontend/src/index.css#L417), [frontend/src/index.css](frontend/src/index.css#L459), [frontend/src/index.css](frontend/src/index.css#L497) |

#### Status colors (theme-agnostic tokens used in auth flows)

| Token | Web value | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `status.success.bg` | rgba(34, 197, 94, 0.10) | `colors.status.successBg` | Success banner fill | [frontend/src/pages/ForgotPasswordPage.jsx](frontend/src/pages/ForgotPasswordPage.jsx#L104) |
| `status.success.border` | rgba(34, 197, 94, 0.4) | `colors.status.successBorder` | Success banner border | [frontend/src/pages/ForgotPasswordPage.jsx](frontend/src/pages/ForgotPasswordPage.jsx#L105) |
| `status.error.bg` | rgba(239, 68, 68, 0.12) | `colors.status.errorBg` | Error banner fill | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L122) |
| `status.error.border` | rgba(239, 68, 68, 0.4) | `colors.status.errorBorder` | Error banner border | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L123) |
| `status.warning` | TBD | TBD | No explicit value found in scanned files | See TBD section |
| `status.info` | TBD | TBD | No explicit value found in scanned files | See TBD section |

#### Code viewer palette (component-specific)

| Token | Web value (Light / Dark / Earth) | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `cv-bg` | #ffffff / #0d1117 / #faf6ee | `colors.code.viewer.bg.{light,dark,earth}` | Code viewer background | [frontend/src/index.css](frontend/src/index.css#L40), [frontend/src/index.css](frontend/src/index.css#L71), [frontend/src/index.css](frontend/src/index.css#L102) |
| `cv-header-bg` | #f6f8fa / #161b22 / #f0e8d8 | `colors.code.viewer.headerBg.{light,dark,earth}` | Header background | [frontend/src/index.css](frontend/src/index.css#L41), [frontend/src/index.css](frontend/src/index.css#L72), [frontend/src/index.css](frontend/src/index.css#L103) |
| `cv-header-border` | #d1d9e0 / #30363d / #d4c4a8 | `colors.code.viewer.headerBorder.{light,dark,earth}` | Header border | [frontend/src/index.css](frontend/src/index.css#L42), [frontend/src/index.css](frontend/src/index.css#L73), [frontend/src/index.css](frontend/src/index.css#L104) |
| `cv-gutter-bg` | #f6f8fa / #161b22 / #f0e8d8 | `colors.code.viewer.gutterBg.{light,dark,earth}` | Gutter background | [frontend/src/index.css](frontend/src/index.css#L43), [frontend/src/index.css](frontend/src/index.css#L74), [frontend/src/index.css](frontend/src/index.css#L105) |
| `cv-gutter-border` | #d1d9e0 / #30363d / #d4c4a8 | `colors.code.viewer.gutterBorder.{light,dark,earth}` | Gutter border | [frontend/src/index.css](frontend/src/index.css#L44), [frontend/src/index.css](frontend/src/index.css#L75), [frontend/src/index.css](frontend/src/index.css#L106) |
| `cv-gutter-text` | #8b949e / #636e7b / #9b8b6e | `colors.code.viewer.gutterText.{light,dark,earth}` | Gutter text | [frontend/src/index.css](frontend/src/index.css#L45), [frontend/src/index.css](frontend/src/index.css#L76), [frontend/src/index.css](frontend/src/index.css#L107) |
| `cv-text` | #1f2328 / #e6edf3 / #3f2f1f | `colors.code.viewer.text.{light,dark,earth}` | Code text | [frontend/src/index.css](frontend/src/index.css#L46), [frontend/src/index.css](frontend/src/index.css#L77), [frontend/src/index.css](frontend/src/index.css#L108) |
| `cv-border` | #d1d9e0 / #30363d / #d4c4a8 | `colors.code.viewer.border.{light,dark,earth}` | Container border | [frontend/src/index.css](frontend/src/index.css#L47), [frontend/src/index.css](frontend/src/index.css#L78), [frontend/src/index.css](frontend/src/index.css#L109) |
| `cv-filename` | #1f2328 / #e6edf3 / #3f2f1f | `colors.code.viewer.filename.{light,dark,earth}` | Filename text | [frontend/src/index.css](frontend/src/index.css#L48), [frontend/src/index.css](frontend/src/index.css#L79), [frontend/src/index.css](frontend/src/index.css#L110) |
| `cv-lang-bg` | #ddf4ff / rgba(56, 139, 253, 0.15) / rgba(139, 94, 52, 0.12) | `colors.code.viewer.langBg.{light,dark,earth}` | Language pill bg | [frontend/src/index.css](frontend/src/index.css#L49), [frontend/src/index.css](frontend/src/index.css#L80), [frontend/src/index.css](frontend/src/index.css#L111) |
| `cv-lang-text` | #0969da / #79c0ff / #8b5e34 | `colors.code.viewer.langText.{light,dark,earth}` | Language pill text | [frontend/src/index.css](frontend/src/index.css#L50), [frontend/src/index.css](frontend/src/index.css#L81), [frontend/src/index.css](frontend/src/index.css#L112) |
| `hljs-keyword` | #cf222e / #ff7b72 / #a0522d | `colors.code.syntax.keyword.{light,dark,earth}` | Syntax keyword | [frontend/src/index.css](frontend/src/index.css#L52), [frontend/src/index.css](frontend/src/index.css#L83), [frontend/src/index.css](frontend/src/index.css#L114) |
| `hljs-string` | #0a3069 / #a5d6ff / #2e6b4f | `colors.code.syntax.string.{light,dark,earth}` | Syntax string | [frontend/src/index.css](frontend/src/index.css#L53), [frontend/src/index.css](frontend/src/index.css#L84), [frontend/src/index.css](frontend/src/index.css#L115) |
| `hljs-number` | #0550ae / #79c0ff / #4a6da7 | `colors.code.syntax.number.{light,dark,earth}` | Syntax number | [frontend/src/index.css](frontend/src/index.css#L54), [frontend/src/index.css](frontend/src/index.css#L85), [frontend/src/index.css](frontend/src/index.css#L116) |
| `hljs-comment` | #6e7781 / #8b949e / #8b7b5e | `colors.code.syntax.comment.{light,dark,earth}` | Syntax comment | [frontend/src/index.css](frontend/src/index.css#L55), [frontend/src/index.css](frontend/src/index.css#L86), [frontend/src/index.css](frontend/src/index.css#L117) |
| `hljs-function` | #8250df / #d2a8ff / #7b4a9e | `colors.code.syntax.function.{light,dark,earth}` | Syntax function | [frontend/src/index.css](frontend/src/index.css#L56), [frontend/src/index.css](frontend/src/index.css#L87), [frontend/src/index.css](frontend/src/index.css#L118) |
| `hljs-class` | #953800 / #ffa657 / #8b5e34 | `colors.code.syntax.class.{light,dark,earth}` | Syntax class | [frontend/src/index.css](frontend/src/index.css#L57), [frontend/src/index.css](frontend/src/index.css#L88), [frontend/src/index.css](frontend/src/index.css#L119) |
| `hljs-variable` | #953800 / #ffa657 / #8b5e34 | `colors.code.syntax.variable.{light,dark,earth}` | Syntax variable | [frontend/src/index.css](frontend/src/index.css#L58), [frontend/src/index.css](frontend/src/index.css#L89), [frontend/src/index.css](frontend/src/index.css#L120) |
| `hljs-type` | #953800 / #ffa657 / #8b5e34 | `colors.code.syntax.type.{light,dark,earth}` | Syntax type | [frontend/src/index.css](frontend/src/index.css#L59), [frontend/src/index.css](frontend/src/index.css#L90), [frontend/src/index.css](frontend/src/index.css#L121) |
| `hljs-builtin` | #0550ae / #79c0ff / #4a6da7 | `colors.code.syntax.builtin.{light,dark,earth}` | Syntax builtin | [frontend/src/index.css](frontend/src/index.css#L60), [frontend/src/index.css](frontend/src/index.css#L91), [frontend/src/index.css](frontend/src/index.css#L122) |
| `hljs-attr` | #0550ae / #79c0ff / #4a6da7 | `colors.code.syntax.attr.{light,dark,earth}` | Syntax attribute | [frontend/src/index.css](frontend/src/index.css#L61), [frontend/src/index.css](frontend/src/index.css#L92), [frontend/src/index.css](frontend/src/index.css#L123) |
| `hljs-tag` | #116329 / #7ee787 / #2e6b4f | `colors.code.syntax.tag.{light,dark,earth}` | Syntax tag | [frontend/src/index.css](frontend/src/index.css#L62), [frontend/src/index.css](frontend/src/index.css#L93), [frontend/src/index.css](frontend/src/index.css#L124) |
| `hljs-selector` | #6639ba / #d2a8ff / #7b4a9e | `colors.code.syntax.selector.{light,dark,earth}` | Syntax selector | [frontend/src/index.css](frontend/src/index.css#L63), [frontend/src/index.css](frontend/src/index.css#L94), [frontend/src/index.css](frontend/src/index.css#L125) |
| `hljs-meta` | #8b949e / #8b949e / #8b7b5e | `colors.code.syntax.meta.{light,dark,earth}` | Syntax meta | [frontend/src/index.css](frontend/src/index.css#L64), [frontend/src/index.css](frontend/src/index.css#L95), [frontend/src/index.css](frontend/src/index.css#L126) |
| `hljs-literal` | #0550ae / #79c0ff / #4a6da7 | `colors.code.syntax.literal.{light,dark,earth}` | Syntax literal | [frontend/src/index.css](frontend/src/index.css#L65), [frontend/src/index.css](frontend/src/index.css#L96), [frontend/src/index.css](frontend/src/index.css#L127) |
| `hljs-operator` | #cf222e / #ff7b72 / #a0522d | `colors.code.syntax.operator.{light,dark,earth}` | Syntax operator | [frontend/src/index.css](frontend/src/index.css#L66), [frontend/src/index.css](frontend/src/index.css#L97), [frontend/src/index.css](frontend/src/index.css#L128) |
| `hljs-punctuation` | #1f2328 / #e6edf3 / #3f2f1f | `colors.code.syntax.punctuation.{light,dark,earth}` | Syntax punctuation | [frontend/src/index.css](frontend/src/index.css#L67), [frontend/src/index.css](frontend/src/index.css#L98), [frontend/src/index.css](frontend/src/index.css#L129) |

### Radius

| Token | Web value | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `radius-card` | 16px | `borderRadius.card` | Auth card containers | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L80) |
| `radius-button` | 10px | `borderRadius.button` | Base button radius | [frontend/src/index.css](frontend/src/index.css#L418) |
| `radius-input` | 8px | `borderRadius.input` | Auth inputs and CTA buttons | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L145), [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L209) |
| `radius-code-container` | 10px | `borderRadius.code` | Code viewer container | [frontend/src/index.css](frontend/src/index.css#L133) |
| `radius-code-lang` | 4px | `borderRadius.codeXs` | Code viewer language tag | [frontend/src/index.css](frontend/src/index.css#L167) |
| `radius-code-copy` | 5px | `borderRadius.codeSm` | Code viewer copy button | [frontend/src/index.css](frontend/src/index.css#L193) |
| `radius-pill` | 9999px | `borderRadius.pill` | Pills and spinners | [frontend/src/index.css](frontend/src/index.css#L344), [frontend/src/index.css](frontend/src/index.css#L615) |
| `radius-scrollbar` | 3px | `borderRadius.scrollbar` | Scrollbar thumb | [frontend/src/index.css](frontend/src/index.css#L359) |
| `rounded-*` utilities | TBD (Tailwind default values not defined in repo) | TBD | Used across UI (rounded-lg/xl/2xl/full) | [frontend/src/pages/AccountPage.jsx](frontend/src/pages/AccountPage.jsx#L127), [frontend/src/components/DocumentTabs.jsx](frontend/src/components/DocumentTabs.jsx#L231), [frontend/src/components/FlashcardStudyMode.jsx](frontend/src/components/FlashcardStudyMode.jsx#L475), [frontend/src/components/ClassroomLayout.jsx](frontend/src/components/ClassroomLayout.jsx#L60) |

### Shadows

| Token | Web value | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `shadow-card` | 0 5px 50px -12px rgba(0, 0, 0, 0.201) / 0 5px 50px -12px rgba(0, 0, 0, 0.5) / 0 5px 40px -16px rgba(88, 64, 42, 0.2) | `boxShadow.card.{light,dark,earth}` | Default card depth | [frontend/src/index.css](frontend/src/index.css#L401), [frontend/src/index.css](frontend/src/index.css#L443), [frontend/src/index.css](frontend/src/index.css#L481) |
| `shadow-button-hover` | 0 1px 3px rgba(0, 0, 0, 0.08) / 0 1px 3px rgba(0, 0, 0, 0.3) / 0 1px 3px rgba(88, 64, 42, 0.1) | `boxShadow.buttonHover.{light,dark,earth}` | Button hover | [frontend/src/index.css](frontend/src/index.css#L411), [frontend/src/index.css](frontend/src/index.css#L453), [frontend/src/index.css](frontend/src/index.css#L491) |
| `shadow-button-primary-hover` | 0 1px 4px rgba(43, 108, 238, 0.2) / 0 1px 4px rgba(123, 201, 254, 0.3) / 0 1px 4px rgba(139, 94, 52, 0.2) | `boxShadow.buttonPrimaryHover.{light,dark,earth}` | Primary hover | [frontend/src/index.css](frontend/src/index.css#L417), [frontend/src/index.css](frontend/src/index.css#L459), [frontend/src/index.css](frontend/src/index.css#L497) |
| `shadow-doc-tab-active` | 0 -1px 3px rgba(0,0,0,0.06) | `boxShadow.tabActive` | Active tab lift | [frontend/src/components/DocumentTabs.jsx](frontend/src/components/DocumentTabs.jsx#L168) |
| `shadow-popover` | 0 8px 24px rgba(0,0,0,0.18) | `boxShadow.popover` | Dropdown/popover | [frontend/src/components/DocumentTabs.jsx](frontend/src/components/DocumentTabs.jsx#L237) |
| `shadow-pdf-focus-halo` | 0 0 0 1px rgba(231, 231, 231, 0.108), 0 0 28px rgba(113, 113, 113, 0.182), 0 10px 30px rgba(86, 86, 86, 0.665) | `boxShadow.pdfHalo` | Dark mode PDF focus | [frontend/src/index.css](frontend/src/index.css#L30-L34) |
| `shadow-search-border-cycle` | 0 0 0 0 rgba(59, 130, 246, 0) to 0 0 0 2px rgba(96, 165, 250, 0.2) to 0 0 0 2px rgba(34, 197, 94, 0.16) | `boxShadow.searchPulse` | Animated search input | [frontend/src/index.css](frontend/src/index.css#L293), [frontend/src/index.css](frontend/src/index.css#L297), [frontend/src/index.css](frontend/src/index.css#L301) |

### Effects

| Token | Web value | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `hero-glow` | radial-gradient(circle at center, rgba(148, 163, 184, 0.25) 0%, rgba(16, 22, 34, 0) 70%) / radial-gradient(circle at center, rgba(123, 201, 254, 0.15) 0%, rgba(18, 18, 18, 0) 70%) / radial-gradient(circle at center, rgba(181, 139, 96, 0.35) 0%, rgba(16, 22, 34, 0) 70%) | `backgroundImage.heroGlow.{light,dark,earth}` | Background glow behind auth views | [frontend/src/index.css](frontend/src/index.css#L400), [frontend/src/index.css](frontend/src/index.css#L442), [frontend/src/index.css](frontend/src/index.css#L480) |
| `separator-gradient` | linear-gradient(to right, transparent, var(--separator-via), transparent) | `backgroundImage.separator` | Menu separators | [frontend/src/components/HeaderMenu.jsx](frontend/src/components/HeaderMenu.jsx#L201) |
| `perspective-1000` | perspective: 1000px | `perspective.1000` | 3D flashcard flip | [frontend/src/index.css](frontend/src/index.css#L4-L5) |
| `preserve-3d` | transform-style: preserve-3d | `transformStyle.preserve3d` | 3D flashcard flip | [frontend/src/index.css](frontend/src/index.css#L8-L9) |
| `blur-3xl` | TBD | TBD | Blur on hero glow uses Tailwind class, no explicit value in repo | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L63) |

### Transitions and Animations

| Token | Web value | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `fade-in` | animation: fade-in 0.2s ease-out | `animation.fadeIn` | Used for subtle entrance | [frontend/src/index.css](frontend/src/index.css#L12), [frontend/src/index.css](frontend/src/index.css#L18) |
| `search-border-cycle` | animation: search-border-cycle 1.2s ease-in-out infinite | `animation.searchBorderCycle` | Search loading | [frontend/src/index.css](frontend/src/index.css#L290), [frontend/src/index.css](frontend/src/index.css#L328) |
| `search-spin` | animation: search-spin 0.75s linear infinite | `animation.searchSpin` | Spinner | [frontend/src/index.css](frontend/src/index.css#L309), [frontend/src/index.css](frontend/src/index.css#L345) |
| `search-core-pulse` | keyframes only (no duration specified in CSS) | `keyframes.searchCorePulse` | Paired with `search-border-cycle` in UI | [frontend/src/index.css](frontend/src/index.css#L315) |
| `link-transition` | transition: color 0.2s ease | `transitionDuration.200` + `transitionTimingFunction.ease` | Links | [frontend/src/index.css](frontend/src/index.css#L537) |
| `button-transition` | transition: all 0.2s ease | `transitionDuration.200` + `transitionTimingFunction.ease` | Buttons | [frontend/src/index.css](frontend/src/index.css#L568) |
| `link-btn-transition` | transition: all 0.2s ease | `transitionDuration.200` + `transitionTimingFunction.ease` | Pill links | [frontend/src/index.css](frontend/src/index.css#L618) |
| `button-active-scale` | transform: scale(0.97) | `scale.97` | Active press feedback | [frontend/src/index.css](frontend/src/index.css#L581) |
| `link-btn-active-scale` | transform: scale(0.97) | `scale.97` | Active press feedback | [frontend/src/index.css](frontend/src/index.css#L631) |

### Typography

#### Font families

| Token | Web value | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `font-sans` | system-ui, Avenir, Helvetica, Arial, sans-serif | `fontFamily.sans` | Base UI text | [frontend/src/index.css](frontend/src/index.css#L382) |
| `font-mono` | JetBrains Mono, Fira Code, Cascadia Code, Consolas, Monaco, monospace | `fontFamily.mono` | Code viewer | [frontend/src/index.css](frontend/src/index.css#L137) |

#### Font weights

| Token | Web value | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `weight-regular` | 400 | `fontWeight.400` | Base weight | [frontend/src/index.css](frontend/src/index.css#L384) |
| `weight-medium` | 500 | `fontWeight.500` | Labels and buttons | [frontend/src/index.css](frontend/src/index.css#L561) |
| `weight-semibold` | 600 | `fontWeight.600` | Code viewer title | [frontend/src/index.css](frontend/src/index.css#L155) |
| `weight-bold` | 700 | `fontWeight.700` | Auth headings | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L94) |

#### Font sizes

| Token | Web value | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `text-36` | 36px | `fontSize.36` | Auth brand title | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L93) |
| `text-32` | 32px | `fontSize.32` | Auth title | [frontend/src/pages/ForgotPasswordPage.jsx](frontend/src/pages/ForgotPasswordPage.jsx#L76) |
| `text-28` | 28px | `fontSize.28` | Auth subtitle | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L104) |
| `text-24` | 24px | `fontSize.24` | Auth header | [frontend/src/pages/ForgotPasswordPage.jsx](frontend/src/pages/ForgotPasswordPage.jsx#L87) |
| `text-14` | 14px | `fontSize.14` | Body text | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L111) |
| `text-13` | 13px | `fontSize.13` | Inline error text | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L127) |
| `text-12` | 12px | `fontSize.12` | Uppercase helper | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L227) |
| `code-13` | 0.8125rem | `fontSize.code13` | Code viewer base | [frontend/src/index.css](frontend/src/index.css#L138) |
| `code-12` | 0.75rem | `fontSize.code12` | Code viewer header | [frontend/src/index.css](frontend/src/index.css#L149) |
| `code-11` | 0.6875rem | `fontSize.code11` | Code viewer line info | [frontend/src/index.css](frontend/src/index.css#L175) |
| `code-10` | 0.625rem | `fontSize.code10` | Code language pill | [frontend/src/index.css](frontend/src/index.css#L164) |

#### Line heights

| Token | Web value | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `lh-base` | 1.5 | `lineHeight.base` | Base body | [frontend/src/index.css](frontend/src/index.css#L383) |
| `lh-tight` | 1.1 | `lineHeight.tight` | h1 default | [frontend/src/index.css](frontend/src/index.css#L553) |
| `lh-code` | 1.3rem | `lineHeight.code` | Code lines | [frontend/src/index.css](frontend/src/index.css#L225) |
| `lh-note-preview` | 1.3 | `lineHeight.notePreview` | Note preview markdown | [frontend/src/index.css](frontend/src/index.css#L376) |
| `lh-success` | 1.5 | `lineHeight.success` | Success banner | [frontend/src/pages/ForgotPasswordPage.jsx](frontend/src/pages/ForgotPasswordPage.jsx#L110) |

#### Letter spacing

| Token | Web value | Mobile Tailwind entry | Notes | Source |
| --- | --- | --- | --- | --- |
| `tracking-tight` | -0.015em | `letterSpacing.tight` | Auth headings | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L95) |
| `tracking-default` | 0.01em | `letterSpacing.default` | Buttons and link pills | [frontend/src/index.css](frontend/src/index.css#L563), [frontend/src/index.css](frontend/src/index.css#L611) |
| `tracking-wide` | 0.03em | `letterSpacing.wide` | Code language pill | [frontend/src/index.css](frontend/src/index.css#L171) |
| `tracking-widest` | 0.05em | `letterSpacing.widest` | Uppercase helper text | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L227) |

### Spacing

| Spacing value | Example usage | Mobile Tailwind entry | Source |
| --- | --- | --- | --- |
| 6px | `gap: '6px'` | `spacing.s6` | [frontend/src/pages/RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx#L139) |
| 8px | `gap: '8px'` | `spacing.s8` | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L134) |
| 10px | `padding: '10px 12px'` | `spacing.s10` | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L126) |
| 12px | `padding: '0 12px'` | `spacing.s12` | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L142) |
| 14px | `padding: '14px 16px'` | `spacing.s14` | [frontend/src/pages/ForgotPasswordPage.jsx](frontend/src/pages/ForgotPasswordPage.jsx#L108) |
| 16px | `gap: '16px'` | `spacing.s16` | [frontend/src/pages/RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx#L122) |
| 20px | `gap: '20px'` | `spacing.s20` | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L117) |
| 22px | `padding: '22px 24px 8px 24px'` | `spacing.s22` | [frontend/src/pages/RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx#L94) |
| 24px | `padding: '24px'` | `spacing.s24` | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L73) |
| 32px | `padding: '32px 32px 16px 32px'` | `spacing.s32` | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L85) |
| 44px | `padding: '0 44px 0 12px'` | `spacing.s44` | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L175) |
| 48px | `height: '48px'` | `spacing.s48` | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L141) |

## Inherit vs Adapt

### Inherit unchanged
- Color palette and theme variants (light/dark/earth) from the web tokens.
- Border radius values and typography hierarchy.
- Brand identity (accent colors and hero glow).

### Adapt for mobile
- Touch targets must be at least 44pt high even when web uses smaller heights.
- Use safe area insets for top nav and bottom tab bars.
- Prefer native spring/momentum animations over CSS easing where possible.
- Simplify heavy shadows on low-end devices for performance.
- Respect reduced-motion settings and disable non-essential animations.

## Component Mapping (Web to Mobile)

| Component | Web reference | Web notes | Mobile Tailwind classes (NativeWind) | Mobile adaptation notes |
| --- | --- | --- | --- | --- |
| Primary button (auth submit) | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L203-L214), [frontend/src/index.css](frontend/src/index.css#L555-L579) | 48px tall, accent fill, 8px radius, bold 14px text | `h-[48px] bg-brand-primary-light dark:bg-brand-primary-dark text-button-primaryText-light dark:text-button-primaryText-dark rounded-input text-[14px] font-bold` | Add `active:scale-[0.97]` and focus ring using `button.focusRing` tokens |
| Auth card | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L80-L82) | 16px radius, card border, shadow | `bg-surface-card-light dark:bg-surface-card-dark border border-border-card-light dark:border-border-card-dark rounded-card shadow-card-light dark:shadow-card-dark p-s24` | Keep max width on tablet; full width on phone |
| Text input | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L141-L145) | 48px height, 12px padding, input bg + border | `h-[48px] px-s12 bg-surface-input-light dark:bg-surface-input-dark border border-border-input-light dark:border-border-input-dark rounded-input text-text-primary-light dark:text-text-primary-dark` | Ensure 44pt min height when smaller screens scale down |
| Document tab picker popover | [frontend/src/components/DocumentTabs.jsx](frontend/src/components/DocumentTabs.jsx#L231-L237) | Card bg, card border, 0 8px 24px shadow, rounded-xl | `bg-surface-card-light dark:bg-surface-card-dark border border-border-card-light dark:border-border-card-dark rounded-xl shadow-popover` | On mobile, use bottom sheet instead of floating popover |
| Classroom top nav | [frontend/src/components/ClassroomLayout.jsx](frontend/src/components/ClassroomLayout.jsx#L87-L99) | White nav with shadow, 16 height, title + actions | `bg-surface-card-light dark:bg-surface-card-dark shadow-card-light dark:shadow-card-dark h-16 px-s16 flex-row items-center` | Convert to top app bar + bottom tab bar on mobile |

## Mobile-Only Patterns

Mobile-only flows (bottom sheets, swipeable flashcards, pull-to-refresh, gesture navigation) should still use the same color tokens, radii, shadows, and typography values listed above to preserve brand cohesion.

## Tailwind Config Snippet (Mobile)

```js
// tailwind.config.js (NativeWind)
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: { light: '#4a6db4', dark: '#7BC9FE', earth: '#8b5e34' },
          primaryStrong: { light: '#3c5873', dark: '#3b82f6', earth: '#6f4a28' },
          primarySoft: {
            light: 'rgba(43, 108, 238, 0.12)',
            dark: 'rgba(123, 201, 254, 0.15)',
            earth: 'rgba(139, 94, 52, 0.18)',
          },
        },
        surface: {
          page: { light: '#f5f7fbe3', dark: '#121212', earth: '#f3efe6' },
          card: { light: '#ffffff', dark: '#1E1E1E', earth: '#fbf8f1' },
          input: { light: '#f8fafc', dark: '#121212', earth: '#f6f1e7' },
        },
        border: {
          card: { light: '#e2e8f0', dark: 'transparent', earth: '#d8cdbb' },
          input: { light: '#cbd5e1', dark: '#424242', earth: '#c7b8a2' },
        },
        text: {
          primary: { light: '#0f172a', dark: '#E0E0E0', earth: '#3f2f1f' },
          secondary: { light: '#64748b', dark: '#A0A0A0', earth: '#6f5b45' },
          muted: { light: '#8fa1b9', dark: '#757575', earth: '#8b775f' },
        },
        link: {
          base: { light: '#4f46e5', dark: '#7BC9FE', earth: '#8b5e34' },
          hover: { light: '#4338ca', dark: '#BAE6FD', earth: '#6f4a28' },
        },
        separator: {
          via: {
            light: 'rgba(15, 23, 42, 0.10)',
            dark: 'rgba(255, 255, 255, 0.20)',
            earth: 'rgba(120, 90, 40, 0.18)',
          },
        },
        tabs: {
          inactiveBg: { light: '#e5e7eb', dark: '#2C2C2C', earth: '#e8ddc6' },
          inactiveBgHover: { light: '#d1d5db', dark: '#383838', earth: '#ddcfb0' },
          inactiveText: { light: '#4b5563', dark: '#B0B0B0', earth: '#6f5b45' },
        },
        button: {
          bg: { light: '#ffffff', dark: '#2C2C2C', earth: '#fbf8f1' },
          bgHover: { light: '#f1f5f9', dark: '#383838', earth: '#f0e8d8' },
          text: { light: '#0f172a', dark: '#E0E0E0', earth: '#3f2f1f' },
          border: { light: '#cbd5e1', dark: '#444444', earth: '#c7b8a2' },
          borderHover: { light: '#4a6db4', dark: '#555555', earth: '#8b5e34' },
          focusRing: {
            light: 'rgba(43, 108, 238, 0.35)',
            dark: 'rgba(123, 201, 254, 0.45)',
            earth: 'rgba(139, 94, 52, 0.35)',
          },
          primaryBg: { light: '#4a6db4', dark: '#7BC9FE', earth: '#8b5e34' },
          primaryBgHover: { light: '#3c5873', dark: '#3b82f6', earth: '#6f4a28' },
          primaryText: { light: '#ffffff', dark: '#121212', earth: '#ffffff' },
        },
        status: {
          successBg: 'rgba(34, 197, 94, 0.10)',
          successBorder: 'rgba(34, 197, 94, 0.4)',
          errorBg: 'rgba(239, 68, 68, 0.12)',
          errorBorder: 'rgba(239, 68, 68, 0.4)',
        },
        code: {
          viewer: {
            bg: { light: '#ffffff', dark: '#0d1117', earth: '#faf6ee' },
            headerBg: { light: '#f6f8fa', dark: '#161b22', earth: '#f0e8d8' },
            headerBorder: { light: '#d1d9e0', dark: '#30363d', earth: '#d4c4a8' },
            gutterBg: { light: '#f6f8fa', dark: '#161b22', earth: '#f0e8d8' },
            gutterBorder: { light: '#d1d9e0', dark: '#30363d', earth: '#d4c4a8' },
            gutterText: { light: '#8b949e', dark: '#636e7b', earth: '#9b8b6e' },
            text: { light: '#1f2328', dark: '#e6edf3', earth: '#3f2f1f' },
            border: { light: '#d1d9e0', dark: '#30363d', earth: '#d4c4a8' },
            filename: { light: '#1f2328', dark: '#e6edf3', earth: '#3f2f1f' },
            langBg: {
              light: '#ddf4ff',
              dark: 'rgba(56, 139, 253, 0.15)',
              earth: 'rgba(139, 94, 52, 0.12)',
            },
            langText: { light: '#0969da', dark: '#79c0ff', earth: '#8b5e34' },
          },
          syntax: {
            keyword: { light: '#cf222e', dark: '#ff7b72', earth: '#a0522d' },
            string: { light: '#0a3069', dark: '#a5d6ff', earth: '#2e6b4f' },
            number: { light: '#0550ae', dark: '#79c0ff', earth: '#4a6da7' },
            comment: { light: '#6e7781', dark: '#8b949e', earth: '#8b7b5e' },
            function: { light: '#8250df', dark: '#d2a8ff', earth: '#7b4a9e' },
            class: { light: '#953800', dark: '#ffa657', earth: '#8b5e34' },
            variable: { light: '#953800', dark: '#ffa657', earth: '#8b5e34' },
            type: { light: '#953800', dark: '#ffa657', earth: '#8b5e34' },
            builtin: { light: '#0550ae', dark: '#79c0ff', earth: '#4a6da7' },
            attr: { light: '#0550ae', dark: '#79c0ff', earth: '#4a6da7' },
            tag: { light: '#116329', dark: '#7ee787', earth: '#2e6b4f' },
            selector: { light: '#6639ba', dark: '#d2a8ff', earth: '#7b4a9e' },
            meta: { light: '#8b949e', dark: '#8b949e', earth: '#8b7b5e' },
            literal: { light: '#0550ae', dark: '#79c0ff', earth: '#4a6da7' },
            operator: { light: '#cf222e', dark: '#ff7b72', earth: '#a0522d' },
            punctuation: { light: '#1f2328', dark: '#e6edf3', earth: '#3f2f1f' },
          },
        },
      },
      borderRadius: {
        card: '16px',
        button: '10px',
        input: '8px',
        code: '10px',
        codeSm: '5px',
        codeXs: '4px',
        pill: '9999px',
        scrollbar: '3px',
      },
      boxShadow: {
        card: {
          light: '0 5px 50px -12px rgba(0, 0, 0, 0.201)',
          dark: '0 5px 50px -12px rgba(0, 0, 0, 0.5)',
          earth: '0 5px 40px -16px rgba(88, 64, 42, 0.2)',
        },
        buttonHover: {
          light: '0 1px 3px rgba(0, 0, 0, 0.08)',
          dark: '0 1px 3px rgba(0, 0, 0, 0.3)',
          earth: '0 1px 3px rgba(88, 64, 42, 0.1)',
        },
        buttonPrimaryHover: {
          light: '0 1px 4px rgba(43, 108, 238, 0.2)',
          dark: '0 1px 4px rgba(123, 201, 254, 0.3)',
          earth: '0 1px 4px rgba(139, 94, 52, 0.2)',
        },
        tabActive: '0 -1px 3px rgba(0,0,0,0.06)',
        popover: '0 8px 24px rgba(0,0,0,0.18)',
        pdfHalo: '0 0 0 1px rgba(231, 231, 231, 0.108), 0 0 28px rgba(113, 113, 113, 0.182), 0 10px 30px rgba(86, 86, 86, 0.665)',
      },
      fontFamily: {
        sans: ['system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', 'monospace'],
      },
      fontSize: {
        36: '36px',
        32: '32px',
        28: '28px',
        24: '24px',
        14: '14px',
        13: '13px',
        12: '12px',
        code13: '0.8125rem',
        code12: '0.75rem',
        code11: '0.6875rem',
        code10: '0.625rem',
      },
      lineHeight: {
        base: '1.5',
        tight: '1.1',
        code: '1.3rem',
        notePreview: '1.3',
      },
      letterSpacing: {
        tight: '-0.015em',
        default: '0.01em',
        wide: '0.03em',
        widest: '0.05em',
      },
      spacing: {
        s6: '6px',
        s8: '8px',
        s10: '10px',
        s12: '12px',
        s14: '14px',
        s16: '16px',
        s20: '20px',
        s22: '22px',
        s24: '24px',
        s32: '32px',
        s44: '44px',
        s48: '48px',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        searchBorderCycle: {
          '0%': { borderColor: 'var(--input-border)', boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
          '35%': { borderColor: '#60a5fa', boxShadow: '0 0 0 2px rgba(96, 165, 250, 0.2)' },
          '70%': { borderColor: '#22c55e', boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.16)' },
          '100%': { borderColor: 'var(--input-border)', boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
        },
        searchSpin: { to: { transform: 'rotate(360deg)' } },
        searchCorePulse: { '0%,100%': { opacity: '0.55', transform: 'scale(0.8)' }, '50%': { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        searchBorderCycle: 'searchBorderCycle 1.2s ease-in-out infinite',
        searchSpin: 'searchSpin 0.75s linear infinite',
      },
      transitionDuration: {
        150: '150ms',
        200: '200ms',
      },
    },
  },
};
```

## Mobile-Specific Considerations

- Use `dark:` and a custom `earth:` theme switcher to map theme-specific tokens at runtime.
- Replace CSS `box-shadow` with React Native shadow props or `elevation` where needed.
- Use native gradients for `hero-glow` (e.g., radial gradient via Skia or SVG) instead of CSS backgrounds.
- Always honor reduced-motion preferences by disabling non-essential animations.

## TBD / Missing Tokens

| Token | Status | Files searched |
| --- | --- | --- |
| `status.warning` and `status.info` | No explicit token values found | [frontend/src/index.css](frontend/src/index.css#L388-L759), [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L56-L268), [frontend/src/pages/RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx#L65-L256), [frontend/src/pages/ForgotPasswordPage.jsx](frontend/src/pages/ForgotPasswordPage.jsx#L43-L182), [frontend/src/pages/ResetPasswordPage.jsx](frontend/src/pages/ResetPasswordPage.jsx#L65-L206), [frontend/src/components/DocumentTabs.jsx](frontend/src/components/DocumentTabs.jsx#L231-L237), [frontend/src/components/HeaderMenu.jsx](frontend/src/components/HeaderMenu.jsx#L89-L211), [frontend/src/components/ClassroomLayout.jsx](frontend/src/components/ClassroomLayout.jsx#L87-L140), [frontend/src/components/ManualFlashcardModal.jsx](frontend/src/components/ManualFlashcardModal.jsx#L96-L201), [frontend/src/pages/AccountPage.jsx](frontend/src/pages/AccountPage.jsx#L127-L204) |
| `font-display` | Class is used but not defined in CSS | [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L56), [frontend/src/pages/RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx#L65), [frontend/src/pages/ForgotPasswordPage.jsx](frontend/src/pages/ForgotPasswordPage.jsx#L43), [frontend/src/pages/ResetPasswordPage.jsx](frontend/src/pages/ResetPasswordPage.jsx#L65) |
| `rounded-*` and `shadow-*` Tailwind utility values | Tailwind config not present in repo to confirm numeric values | [frontend/src/pages/AccountPage.jsx](frontend/src/pages/AccountPage.jsx#L127), [frontend/src/components/DocumentTabs.jsx](frontend/src/components/DocumentTabs.jsx#L231), [frontend/src/components/FlashcardStudyMode.jsx](frontend/src/components/FlashcardStudyMode.jsx#L475) |
