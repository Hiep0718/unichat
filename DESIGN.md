---
name: Academic Precision
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#444651'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#4b1c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e2c00'
  on-tertiary-container: '#f39461'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#773205'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1440px
  sidebar-width: 280px
  gutter: 24px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for a high-performance RAG (Retrieval-Augmented Generation) learning environment. It balances the rigor of academic research with the efficiency of modern SaaS. The aesthetic is **Corporate Modern** with a focus on high information density, clarity, and trust.

The UI evokes a sense of organized intelligence. It utilizes ample white space, a disciplined color application, and subtle functional transitions to ensure the user feels in control of complex data. The target audience includes students, researchers, and educators who require a distraction-free, reliable interface for deep learning.

## Colors
The palette is rooted in a "Deep Blue" primary to establish authority and institutional trust. 

- **Primary (#1E3A8A):** Used for navigation, primary actions, and branding elements.
- **Secondary (#06B6D4):** Used for highlighting AI-driven insights, citations, and interactive focus states.
- **Functional Colors:** 
    - **Green:** Validated sources and completed tasks.
    - **Amber:** Real-time RAG processing and document indexing.
    - **Red:** Error states or missing citations.
- **Neutral Grays:** Used for secondary text, borders, and high-density table lines to maintain a clean visual hierarchy.

## Typography
This design system utilizes **Inter** exclusively to ensure maximum legibility across dense data sets and chat interfaces. 

- **Headlines:** Use Bold and Semi-Bold weights with slight negative letter-spacing for a modern, compact feel.
- **Body Text:** Standard weight (400) is used for reading long-form AI responses and document summaries.
- **Labels:** Small, uppercase labels are used for table headers and metadata categories in Vietnamese.
- **Vietnamese Language Support:** Line heights are slightly increased (1.5x for body) to ensure diacritics do not clash with text on lines above or below.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model.
- **Desktop (1440px):** Features a fixed left sidebar (280px) for navigation and a fluid main content area for RAG analysis. Tables and chat interfaces utilize a 12-column grid.
- **Mobile (390px):** The sidebar collapses into a bottom navigation bar or a hamburger menu. Content transitions to a single-column stack with 16px side margins.
- **Rhythm:** An 8px base grid governs all padding and margins to maintain strict alignment in data-heavy views.

## Elevation & Depth
The design system uses **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows to maintain a professional, flat aesthetic.

- **Level 0 (Background):** Light Gray (#F9FAFB) for the main application canvas.
- **Level 1 (Cards/Sidebar):** Pure White (#FFFFFF) with a 1px border (#E5E7EB).
- **Level 2 (Modals/Dropdowns):** Pure White with a subtle ambient shadow (0px 4px 12px rgba(0, 0, 0, 0.05)) to separate temporary interactive layers from the content.
- **Chat Bubbles:** AI responses use a subtle Cyan tint (#ECFEFF) to differentiate from user queries which remain white with a border.

## Shapes
A **Soft** shape language (0.25rem / 4px) is applied to maintain a precise, academic look. 
- **Buttons & Inputs:** 4px radius.
- **Cards & Modals:** 8px (rounded-lg) to provide a containerized feel without appearing too casual.
- **Badges:** 2px or fully rounded (pill) depending on their role as status indicators vs. tags.

## Components
- **Buttons:** Primary buttons are Solid Deep Blue. Secondary buttons use a Cyan outline. Labels: "Tiếp tục", "Lưu", "Hủy".
- **Chat Bubbles:** User bubbles are right-aligned, white with gray borders. AI bubbles are left-aligned with a very light Cyan background. 
- **Citations:** Integrated within chat as small, clickable Secondary Blue badges (e.g., "[1]").
- **Data Tables:** High-density, border-bottom only for rows. Header text is Label-MD in Gray 500.
- **Progress Bars:** Thin 4px height. Use Primary Blue for general loading and Secondary Cyan for "AI Thinking/Retrieving" states.
- **Badges:** Status indicators use soft-tinted backgrounds with high-contrast text (e.g., Success is light green background with dark green text: "Hoàn thành").
- **Input Fields:** Labeled with clear focus states using a 2px Cyan glow. Labels: "Tìm kiếm tài liệu", "Nhập câu hỏi của bạn...".