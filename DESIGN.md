# DESIGN.md

## Aesthetic Direction
**Archival Lexicography & Tactile Folio.** Inspired by Oxford reference plates, Bodleian index cards, and Swiss editorial typography. Warm vellum rag paper (`#f7f6f3`), deep printing ink (`#181715`), antique brass/umber accents (`#7a4e24`), and WCAG AA+ verified signal colors.

## Color System
- `bg` (Archival Vellum): `#f7f6f3` (dark `ink` theme: `#121312`)
- `surface` (Folio Plate): `#ffffff` (dark `ink` theme: `#1a1c1a`)
- `surface-2` (Index Well): `#efede7` (dark `ink` theme: `#222522`)
- `ink` (Primary Foreground): `#181715` (dark `ink` theme: `#f0ece4`)
- `muted` (Secondary Copy): `#595650` (dark `ink` theme: `#a5a29b`)
- `border` (Structural Rule): `#dfdbd2` (dark `ink` theme: `#2c2f2c`)
- `border-2` (Strong Rule): `#cbc5b9` (dark `ink` theme: `#3d413d`)
- `accent` (Archival Umber / Brass): `#7a4e24` (dark `ink` theme: `#d9b78e`)
- `tile-correct` (Signal Viridian): `#1f5c3f` (contrast ≥ 7.5:1 on white)
- `tile-present` (Signal Ochre): `#855d10` (contrast ≥ 5.4:1 on white)
- `tile-absent` (Signal Slate): `#525860` (contrast ≥ 7.0:1 on white)
- `movie-accent` (Cinema Oxblood): `#7c2d36` (contrast ≥ 8.5:1 on white)
- `marathon-accent` (Burnt Amber): `#8a420d` (contrast ≥ 6.8:1 on white)
- `anagram-accent` (Botanical Deep): `#165b3a` (contrast ≥ 7.9:1 on white)
- `battle-accent` (Terracotta Ink): `#6e3428` (contrast ≥ 8.2:1 on white)

## Typography
- **UI & Controls (`--font-sans`)**: `'Albert Sans', system-ui, -apple-system, sans-serif`
- **Display & Headwords (`--font-display`)**: `'Playfair Display', Georgia, serif`
- **Editorial Prose (`--font-serif`)**: `'Source Serif 4', Georgia, serif`
- **Tabular Clocks & Catalogue Codes (`--font-mono`)**: `'JetBrains Mono', ui-monospace, monospace`
- **Type Scale**:
  - `12px` (`0.75rem`): minimum functional UI text, badges, folio metadata, footnotes
  - `13px` (`0.8125rem`): secondary controls, compact pills, table metadata
  - `14px` (`0.875rem`): buttons, inputs, dialog controls
  - `15px` (`0.9375rem`): card descriptions, editorial summaries
  - `16px` (`1rem`): primary reading prose (`60–70ch` measure)
  - `18px` (`1.125rem`): card headings, section leads
  - `22px` (`1.375rem`): modal titles, stat numerals
  - `28px–32px` (`1.75rem–2rem`): section headings
  - `44px–72px` (`clamp(2.75rem, 6vw, 4.5rem)`): hero and reading-room display headlines
- **Rendering Rules**:
  - Root `html` sets `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`
  - Headings (`h1, h2, h3`) use `text-wrap: balance`
  - Prose (`p, li, blockquote`) uses `text-wrap: pretty`
  - All dynamic counters, timers, dates, and ranks use `font-variant-numeric: tabular-nums`

## Surfaces & Elevation
- **Concentric Radii**: `outerRadius = innerRadius + padding` (e.g., `20px` outer card with `8px` padding wraps a `12px` inner plate).
- **Shadows for Elevation, Borders for Structure**:
  - Elevated cards and surfaces use layered transparent `box-shadow` tokens (`--shadow-border`, `--shadow-border-hover`) rather than pairing a 1px border with a wide diffuse shadow.
  - Structural `1px solid var(--border)` rules are reserved for dividers, ledger lines, and form inputs.
- **Optical Alignment**:
  - Buttons with a trailing icon use `padding-left: 18px; padding-right: 15px` (`icon-side = text-side - 3px`).

## Motion & Transitions (`transitions.dev` + `GSAP` + `make-interfaces-feel-better`)
- **Motion Tokens**:
  - `--duration-stagger: 40ms`
  - `--duration-micro: 80ms`
  - `--duration-quick: 150ms`
  - `--duration-fast: 250ms`
  - `--duration-medium: 350ms`
  - `--duration-slow: 400ms`
  - `--duration-very-slow: 500ms`
  - `--ease-smooth-out: cubic-bezier(0.22, 1, 0.36, 1)`
  - `--ease-icon-swap: cubic-bezier(0.2, 0, 0, 1)`
- **Crafted Transition Recipes**:
  - **Tactile Press**: `:active:not(:disabled) { scale: 0.96 }` over `150ms ease-out`.
  - **Contextual Icon Swap (`p5`)**: dual DOM SVGs stacked in a 1×1 grid cross-fading with `scale(0.25) ↔ scale(1)`, `opacity: 0 ↔ 1`, and `filter: blur(4px) ↔ blur(0px)`.
  - **Text States Swap (`p6`)**: dynamic status text transitions via `translateY`, `blur(2px)`, and `opacity`.
  - **Modal Open / Close (`p7`)**: asymmetric `250ms` open / `150ms` close with `scale(0.96) ↔ scale(1)`.
  - **Error State Shake (`p12`)**: 4-segment cubic-bezier horizontal shake (`28.57%`, `57.14%`, `78.57%`, `100%`).
  - **Sliding Pill Tabs (`p16`)**: measured `translateX` and `width` pill indicator for tablists and filter bars.
  - **3D Tilt Specimen Plate (`p19`)**: pointer-tracked `rotateX`/`rotateY` and radial glare driven by `gsap.quickTo()`.
  - **Grid-Rows Accordion (`p21`)**: `grid-template-rows: 0fr ↔ 1fr` with inner blur/opacity for the Dynamic Island drawer.
  - **Asymmetric Toast (`p22`)**: rises from `translateY(12px) scale(0.96)` with `blur(2px)`.
  - **Opening Chevron Hover (`p24`)**: two-arm SVG chevron that shifts right and opens its angle on hover.
  - **GSAP Timelines & Flip**: `gsap.matchMedia()`-guarded hero entrance sequence, 3D tile reveal & victory cascade, and `Flip` layout transitions in the Education collection.
