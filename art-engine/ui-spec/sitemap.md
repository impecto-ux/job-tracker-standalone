# Sitemap Strategy

## 1. Structure (Single Page Application)
The portfolio will operate as a single-page infinite canvas or a strict section-based scroller.

- **/** (Index): Main entry.
    - **Header:** Logo (Top Left), Time/Status (Top Right).
    - **Hero Section:** "Name/Role" marquee. Huge scale.
    - **About:** Raw text block.
    - **Work:** Grid of projects. Hover reveals images.
    - **Contact:** Footer with massive email link.

## 2. Navigation
- Sticky corners? Or floating "Toolbox" menu.
- Decision: **Sticky Corners**.
    - TL: Brand
    - TR: Menu (Overlay)
    - BL: Socials
    - BR: Scroll %

## 3. Routes
- **/**: Home
- **/work/[slug]**: Project detail (Modal or separate page? -> Separate page for SEO/Persistence).
