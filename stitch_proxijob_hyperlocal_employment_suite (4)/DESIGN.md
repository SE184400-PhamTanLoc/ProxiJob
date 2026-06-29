---
name: Kinetic Gen-Z
colors:
  surface: '#f7fafc'
  surface-dim: '#d7dadc'
  surface-bright: '#f7fafc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f6'
  surface-container: '#ebeef0'
  surface-container-high: '#e5e9eb'
  surface-container-highest: '#e0e3e5'
  on-surface: '#181c1e'
  on-surface-variant: '#5a4136'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eef1f3'
  outline: '#8e7164'
  outline-variant: '#e2bfb0'
  surface-tint: '#a04100'
  primary: '#a04100'
  on-primary: '#ffffff'
  primary-container: '#ff6b00'
  on-primary-container: '#572000'
  inverse-primary: '#ffb693'
  secondary: '#5b00df'
  on-secondary: '#ffffff'
  secondary-container: '#7531ff'
  on-secondary-container: '#eadfff'
  tertiary: '#624abf'
  on-tertiary: '#ffffff'
  tertiary-container: '#9e87ff'
  on-tertiary-container: '#340e90'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a3000'
  secondary-fixed: '#e8ddff'
  secondary-fixed-dim: '#cfbdff'
  on-secondary-fixed: '#22005d'
  on-secondary-fixed-variant: '#5300cd'
  tertiary-fixed: '#e7deff'
  tertiary-fixed-dim: '#cbbeff'
  on-tertiary-fixed: '#1d0061'
  on-tertiary-fixed-variant: '#4a2fa6'
  background: '#f7fafc'
  on-background: '#181c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Sora
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-bold:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 32px
  bento-gap: 24px
  section-margin: 64px
  edge-radius-xl: 32px
---

## Brand & Style
This design system captures a high-energy, Gen-Z aesthetic tailored for modern productivity. It transitions from a traditional corporate structure into a vibrant, tech-forward experience. The brand personality is bold, optimistic, and hyper-functional, utilizing heavy negative space to let oversized elements breathe.

The design style is a hybrid of **Minimalism** and **Sora-infused Futurism**. It utilizes "Bento-box" layout patterns to organize complex data into approachable, modular containers. The visual language emphasizes "the float"—using organic shadows and soft blurs to create a sense of depth that feels light and frictionless rather than industrial.

## Colors
The palette is anchored by a high-contrast relationship between pure #FFFFFF surfaces and a refreshing #F8FBFD secondary tint used for background depth and bento-tile grouping. 

**Neon Orange (#FF6B00)** serves as the primary energetic driver, reserved for critical actions, active states, and brand-defining moments. **Soft Electric Violet (#6200EE)** acts as the secondary accent for tags, categories, and progress indicators, providing a cool-toned balance to the warmth of the orange. **Midnight Indigo (#2E008B)** is used for deep contrast in text or specialized UI modules to ensure legibility and a premium tech feel. Active elements utilize a soft neon glow (box-shadow) matching the primary hue to simulate a light-emitting interface.

## Typography
Typography is a core architectural element of the design system. **Sora** is the display typeface, chosen for its geometric precision and unique "ink traps" that lend a futuristic, high-tech vibe to oversized headers. **Hanken Grotesk** handles body copy and data-heavy labels, providing a sharp, professional balance that ensures high legibility in dense layouts like payroll or scheduling.

Headline scales are intentionally exaggerated to create a clear hierarchy and visual impact. Section titles should be prominent, often paired with wide letter-spacing on labels to create a "crisp" and organized aesthetic.

## Layout & Spacing
The layout follows a **Bento-Box** philosophy. Content is grouped into distinct, super-rounded containers of varying sizes that snap to a fluid 12-column grid. 

- **Desktop:** Use a 12-column grid with 24px gutters. Bento containers should span 3, 4, 6, or 12 columns depending on data priority.
- **Tablet:** Shift to an 8-column grid with 20px gutters. Bento tiles should reflow vertically, maintaining their 32px corner radius.
- **Mobile:** Single column layout with 16px margins. Headlines scale down significantly to fit the viewport width while maintaining their bold weight.

Spacing is generous. Avoid crowding elements; let the #F8FBFD background act as a "buffer" between bento tiles to emphasize the floating effect.

## Elevation & Depth
Depth in the design system is achieved through **Organic Floating Layers**. Rather than traditional heavy shadows, use soft, diffused shadows with very low opacity (5-8%) and a large blur radius (30px+). 

- **Level 0 (Background):** Pure #FFFFFF.
- **Level 1 (Bento Tiles):** Soft #F8FBFD fill or white with a 1px #E5E9EB border.
- **Level 2 (Floating Cards/Modals):** Pure White with an "Organic" shadow-xl.
- **Active State (Glow):** Elements like active input fields or buttons receive a `0px 0px 15px rgba(255, 107, 0, 0.3)` outer glow to simulate a futuristic viewfinder effect.

## Shapes
The shape language is defined by extreme roundedness. All primary containers and cards must use a minimum of **32px (rounded-3xl)** corner radius. Buttons, tags, and input fields are strictly **pill-shaped** to maintain a friendly yet modern silhouette. 

Iconography should follow this logic, using rounded terminals and open paths to match the approachable nature of the typography and containers.

## Components
- **Buttons:** All buttons are pill-shaped. Primary buttons use a solid #FF6B00 fill with white text. Secondary buttons use a #F8FBFD fill with #2E008B text.
- **Inputs:** Use soft capsule blocks with a subtle 1px border. On focus, the border disappears or turns #FF6B00, replaced by a soft neon orange glow and "viewfinder" bracket accents in the corners of the input container.
- **Bento Tiles:** These are the primary organizational units. Each tile should have a 32px radius and a consistent 24px internal padding.
- **Chips & Tags:** Small pill-shaped elements using the Soft Electric Violet (#6200EE) for categorizing items or Midnight Indigo (#2E008B) for status indicators.
- **Viewfinder Brackets:** Use thin (1.5px) L-shaped accents in the corners of high-priority media or active data modules to reinforce the futuristic, technical aesthetic.
- **Progress Bars:** High-energy Neon Orange fills against a #F8FBFD track, with rounded caps on both ends.