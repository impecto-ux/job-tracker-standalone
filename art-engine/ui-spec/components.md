# Component Specifications

## Atoms
- **TypeHeading**: `h1` - `h6`. Archivo Black. Start at 10rem.
- **TypeBody**: `p`. JetBrains Mono. 1rem.
- **Button**: Raw HTML button. 1px border. No background. Uppercase.
- **MarqueeStrip**: Infinite scrolling text container.

## Molecules
- **ProjectCard**:
    - Layout: Grid-row.
    - Props: `title`, `year`, `category`, `image`.
    - Interaction: Hover inverts row colors. Image appears fixed at cursor or center.
- **NavCorner**: Fixed positioned container for navigation items.

## Organisms
- **HeroSection**: Full viewport height. Massive text "CREATIVE DIRECTOR" / "DEVELOPER".
- **WorkGrid**: List of ProjectCards.
- **Footer**: Massive contact link.

## Templates
- **MainLayout**: Applies global cursor, grid lines (optional), and noise overlay.
