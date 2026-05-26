# Lembas Brand Design System

## 1. Visual Theme & Atmosphere

Lembas' design system is a **warm, natural retail market** built around the deep leaf green from the icon and the apricot-orange used in brand posts and packaging. The canvas alternates between a toasted cream (`#f6ead6`) and a yerba-paper beige (`#e7dbc0`) — colors that reference dietética shelves, grains, paper bags, and natural products — while the signature **Lembas Leaf Green** (`#2f8d72`) anchors brand moments on hero bands, CTAs, and product highlights. The app icon uses the leaf only, because the adjacent wordmark already says Lembas. The SVG viewBox is tightly cropped so the leaf remains legible at small header and favicon sizes. The palette intentionally keeps green variation tight: Leaf Green (`#2f8d72`) is the single visible brand/action green, while Forest Green (`#075f36`) is reserved only for dark surfaces that need white text. Orange (`#f29d52`) appears as the energetic brand accent.

Typography carries most of the brand voice. The rounded Lembas logotype inspires the typography; a clean geometric sans sits across nearly every surface with a tight `-0.16px` letter-spacing — it reads confident and friendly rather than fashion-magazine severe. What's unusual: the selected editorial blocks may switch to a warm serif (`"Lora", Georgia, serif`) for specific headline moments, subtly echoing the nostalgic feel of a neighborhood dietética sign. And the brand moments can use a handwritten script (`"Caveat", cursive`) for personal handwritten-label touches. Three typefaces, three contexts — the system is disciplined about when each appears.

The surfaces breathe through rounded geometry. Every button is a 50px full-pill. Cards take a 12px rounded-rectangle. The "Leaf CTA" floating CTA — a 56px circular order button in Lembas Leaf Green (`#2f8d72`) — is the product's signature depth move: it floats bottom-right with a layered shadow stack (`0 0 6px rgba(0,0,0,0.24)` base + `0 8px 12px rgba(0,0,0,0.14)` ambient) and compresses via `scale(0.95)` on press. Elevations are otherwise restrained — card shadows stay at a whispered `0.14/0.24` alpha, global nav gets a quiet three-layer shadow stack. The whole system feels like clean dietética signage: legible, warm, and never shouting.

**Key Characteristics:**
- Two-green brand system: Leaf Green for visible actions/links and Forest Green only for dark bands/footer surfaces
- Lembas Orange reserved for loyalty-status moments only; never a general-purpose accent
- Warm-neutral canvas (`#f6ead6` / `#e7dbc0`) instead of cold white — references natural-store materials
- Primary app typeface (Plus Jakarta Sans) with tight `-0.16px` letter-spacing as the universal voice
- Context-specific type switches: serif (Lora) for loyalty, script (Caveat) for brand moments handwritten-labels
- Full-pill buttons (`50px` radius) universal, `scale(0.95)` active press the signature micro-interaction
- Floating "Leaf CTA" circular CTA (`56px`, Lembas Leaf Green fill, layered shadow stack) — the product's signature elevation element
- Seasonal-tile surfaces designed as **photographed physical product** — every card is a distinct illustrated photograph rather than a generated graphic
- 12px card radius + whisper-soft shadows keep content cards flat-plus-hint-of-lift
- Rem-based spacing scale anchored at 1.6rem (~16px) = `--space-3`, stepping to 6.4rem (~64px)

**Color-block page rhythm:** Cream hero → White content sections → Dark-green (`#075f36`) feature band with white text → Cream utility zone → Dark-green (`#075f36`) footer with orange / white text — a leaf-dark bookend around the bright body.

## 2. Color Palette & Roles

**Source pages analyzed:** homepage, loyalty, seasonal tiles, product detail (Granola artesanal), product nutrition (Pan nube).

### Primary

- **Lembas Leaf Green** (`#2f8d72`): The single visible brand/action green from the SVG leaf. Used for headings, links, icons, primary CTAs, focus rings, and selected states.
- **Lembas Forest Green** (`#075f36`): A darker version of the same green family. Reserved for footer, sidebar, and dark feature bands where white text needs contrast.
- **Mint Leaf Wash** (`#d7eadf`): A pale tint used for form-valid-state backgrounds and light green utility surfaces.

### Secondary & Accent

- **Lembas Orange** (`#f29d52`): Reserved almost exclusively for loyalty-status ceremony — Lembas Orange-tier callouts, partnership badges (supplier benefits, community perks), and premium-feeling accents. Never a general-purpose brand color.
- **Orange Light** (`#f9c88e`): Softer orange for background washes on orange-tier sections.
- **Orange Lightest** (`#fff2df`): Cream-orange page-surface wash used under partnership sections on the loyalty page — ties the orange accent back into the warm neutral system.

### Surface & Background

- **White** (`#ffffff`): Primary card and modal surface. Also card fill on seasonal promo tiles.
- **Neutral Cool** (`#f9f9f9`): Subtle cool-gray surface used on dropdown menus ("Account" dropdown), form-card wraps, and quiet utility containers.
- **Neutral Warm** (`#f6ead6`): The warm cream **primary page canvas** for loyalty utility zones and hero bands.
- **Ceramic** (`#e7dbc0`): A slightly warmer/darker cream for zone separators, soft page-section washes, and loyalty partnership band.
- **Black** (`#000000`): Deep ink reserved for the dark top-of-page CTA strip ("Crear cuenta") and high-contrast top-nav sign-in buttons.

### Neutrals & Text

- **Text Black** (`rgba(0, 0, 0, 0.87)`): Primary heading and body text color on light surfaces. Not pure black — an 87%-opacity black that reads warmer.
- **Text Black Soft** (`rgba(0, 0, 0, 0.58)`): Secondary/metadata text on light surfaces.
- **Text White** (`rgba(255, 255, 255, 1)`): Primary heading/body text on dark green surfaces.
- **Text White Soft** (`rgba(255, 255, 255, 0.70)`): Secondary text on dark-green surfaces — footer link descriptions, caption text.
- **Muted Herb Green** (`#33433d`): A dedicated muted slate-green used only on loyalty-page text blocks — a slightly "dustier" reading color than Text Black that signals "loyalty surface" without using full Lembas Leaf Green.

### Semantic & Accent

- **Red** (`#c82014`): Error and destructive state (form invalid, destructive actions).
- **Yellow** (`#fbbc05`): Warning state, legacy brand touch.
- **Mint Leaf Wash** (`#d7eadf` at 33% opacity = `hsl(160 32% 87% / 33%)`): Form valid-field tint background.
- **Red Tint** (`hsl(4 82% 43% / 5%)`): Invalid-field tint on forms.

### Black / White Alpha Ladders

Two parallel translucent scales for overlay and secondary-text use:
- `rgba(0,0,0,0.06)` through `rgba(0,0,0,0.90)` in 10% steps — for dark overlays on light surfaces
- `rgba(255,255,255,0.10)` through `rgba(255,255,255,0.90)` in 10% steps — for light overlays on dark surfaces

### Gradient System

No structural gradient tokens observed. Surface hierarchy is solid-color-block throughout — the system relies on its five-tier cream/green surface palette rather than gradients.

## 3. Typography Rules

### Font Family

- **Primary:** `"Plus Jakarta Sans", system-ui, sans-serif` — Lembas app typeface, used across nearly every surface
- **Loading Fallback:** `system-ui, sans-serif` — what users see before Plus Jakarta Sans loads
- **Editorial Serif:** `"Lora", Georgia, serif` — used on specific loyalty-page headline moments for a warm editorial feel
- **Brand Moment Script:** `"Caveat", cursive` — used exclusively for brand-moment "handwritten label" decorative touches, referencing the hand-written names on Lembas packages

No OpenType stylistic sets explicitly activated at `:root`.

### Hierarchy

| Role | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|--------|-------------|----------------|-------|
| Display (text-10) | 5.0rem / 80px | 400–600 | 1.2 | -0.16px | Largest loyalty/hero display |
| Jumbo (text-9) | 3.6rem / 58px | 400–600 | 1.2 | -0.16px | Secondary hero headings |
| Hero Large (text-8) | 2.8rem / 45px | 400–600 | 1.2–1.5 | -0.16px | Landing section headlines |
| H1 | 24px | 600 | 36px | -0.16px | Lembas-Leaf-Green primary heading |
| H2 | 24px | 400 | 36px | -0.16px | Regular-weight section title in Text Black |
| Body Large | 19px | 400–600 | 33.25px (~1.75) | -0.16px | Hero intro copy, feature-band body |
| Body (text-3) | 1.6rem / 16px | 400 | 1.5 (24px) | -0.01em | Default body copy |
| Small (text-2) | 1.4rem / ~14px | 400–600 | 1.5 | -0.01em | Button label, metadata, form labels |
| Micro (text-1) | 1.3rem / ~13px | 400 | 1.5 | -0.01em | Active float-label state, caption micro-copy |
| Button Label | 14–16px | 400–600 | 1.2 | -0.01em | All pill-button labels |

**Letter-spacing tokens:**
- `letterSpacingNormal`: `-0.01em` (default — tight, characteristic)
- `letterSpacingLoose`: `0.1em` (emphasized caps)
- `letterSpacingLooser`: `0.15em` (uppercase-style labels, extreme emphasis)

**Line-height tokens:**
- `lineHeightNormal`: `1.5` (body)
- `lineHeightCompact`: `1.2` (display/buttons)

### Principles

- **Tight negative tracking (`-0.01em`)** is applied almost universally — the entire product reads slightly compressed, which gives Plus Jakarta Sans its confident presence without feeling squeezed.
- **Weight shifts carry hierarchy, not size shifts.** H1 and H2 share the same 24px/36px size; only weight (600 vs 400) and color (Lembas-Leaf-Green vs Text Black) separate them.
- **Size tokens use rem, anchored to `1rem = 10px`** on this site (via a `font-size: 62.5%` root trick). So `1.6rem` = 16px, `2.4rem` = 24px, etc. The scale is semantic (textSize-1 through textSize-10), not arbitrary pixel values.
- **Context-specific typeface swaps** — serif on loyalty, script on brand moments — are deliberate and localized. Never mix them with the primary sans within the same surface.
- **Body text never goes pure black** — it sits at `rgba(0,0,0,0.87)` to match the warm-neutral canvas temperature.

### Note on Font Substitutes

Plus Jakarta Sans is the selected Lembas app font. Reasonable open-source substitutes:
- **Inter** (Google Fonts) — similar humanist geometric proportions, wide weight range
- **Manrope** — slightly rounder, similar confident feel
- **Nunito Sans** — warmer, good for a warm natural-store brand substitute

If substituting, verify the tight `-0.01em` / `-0.16px` tracking still reads well; some open-source fonts need `-0.005em` instead.

Lora and Caveat are optional brand-moment fonts; keep the main shopping flow in Plus Jakarta Sans.

## 4. Component Stylings

### Buttons

**1. Primary Filled — "Ver productos saludables / Crear cuenta"**
- Background: `#2f8d72` (Lembas Leaf Green)
- Text: `#ffffff`
- Border: `1px solid #2f8d72`
- Radius: `50px` (full pill)
- Padding: `7px 16px`
- Font: Plus Jakarta Sans, 16px, weight 600, letter-spacing `-0.01em`
- Active state: `transform: scale(0.95)` via `--buttonActiveScale`
- Transition: `all 0.2s ease`

**2. Primary Outlined — "Probar ahora / Empezar compra"**
- Background: transparent
- Text: `#2f8d72` (Lembas Leaf Green)
- Border: `1px solid #2f8d72`
- Same radius/padding/active/transition as Primary Filled

**3. Black Filled — "Crear cuenta"**
- Background: `#000000`
- Text: `#ffffff`
- Border: `1px solid #000000`
- Radius: `50px`, Padding: `7px 16px`
- Font: 14px, weight 600
- Used on the top-of-page join strip and similar conversion moments

**4. Dark Outlined — "Ingresar"**
- Background: transparent
- Text: `rgba(0, 0, 0, 0.87)` (Text Black)
- Border: `1px solid rgba(0, 0, 0, 0.87)`
- Radius: `50px`, Padding: `7px 16px`
- Font: 14px, weight 600

**5. Green-on-Green Inverted — "Ver novedades"**
- Background: `#ffffff`
- Text: `#2f8d72`
- Border: `1px solid #ffffff`
- Used when the surface behind the button is the dark green Lembas Forest Green band — white button with green text instead of a filled green pill on green bg

**6. Outlined on Dark — "Conocer más / Comprar ahora"**
- Background: transparent
- Text: `#ffffff`
- Border: `1px solid #ffffff`
- Used on dark-green feature bands for secondary action paired with a white filled CTA

**7. Consent Agree (dark-green variant)**
- Background: `rgb(50, 142, 104)` (a specific variant green used in the cookie-consent module)
- Text: `#ffffff`
- No border, `50px` radius, `7px 16px` padding, 14px / weight 400
- Slightly brighter than Lembas Leaf Green — reserved for the consent-banner Agree action

**8. Leaf CTA — Floating Circular Order Button**
- Background: `#2f8d72` (Lembas Leaf Green)
- Icon: `#ffffff`
- Size: `5.6rem / 56px` (standard), `4rem / 40px` (mini variant)
- Radius: `50%` (full circle)
- Fixed bottom-right, `-0.8rem` touch offset for extra tap comfort
- Shadow stack: base `0 0 6px rgba(0,0,0,0.24)` + ambient `0 8px 12px rgba(0,0,0,0.14)`
- Active state: ambient shadow fades to `0 8px 12px rgba(0,0,0,0)`
- This is the product's signature elevation element — it floats over every scrolled surface

**9. Full-width Feedback Tab — "Enviar comentario"**
- Background: `#2f8d72`
- Text: `#ffffff`
- Radius: `12px 12px 0px 0px` (top-rounded only)
- Padding: `8px 16px`
- Font: 14px, weight 400
- Positioned fixed bottom-right-inside, attached to the viewport edge

### Cards & Containers

**Content Card (default)**
- Background: `#ffffff` (`--cardBackgroundColor`)
- Radius: `12px` (`--cardBorderRadius`)
- Shadow: `0px 0px .5px 0px rgba(0,0,0,0.14), 0px 1px 1px 0px rgba(0,0,0,0.24)` (`--cardBoxShadow`)
- Used for: feature cards, menu-item tiles, loyalty-status panels

**Seasonal Tile Tile**
- Background: illustrated photography fills the card (no solid bg)
- Radius: similar to cards (`~12px`, slightly tighter on corners)
- Shadow: lighter than default card — these are treated like printed cards laid on the canvas
- Labeled by category above the card grid (aperturas, feriados, promos, comunidad, temporada, alimentos saludables)

**loyalty Status Cards (loyalty page signature)**
- Three-column grid: Bronze / Lembas Orange / Silver-ish — each a dark-green (`#075f36`) panel with:
  - Colored gradient/color header ring
  - Numbered "Level" badge
  - Status title in large Plus Jakarta Sans weight 600
  - points / benefits list in white/translucent-white text
  - Bottom "As you earn more points…" progression caption

**Partnership Card (loyalty)**
- Background: `#fff2df` (Orange Lightest) warm-cream surface
- Content: partner logos ("supplier benefits", "community perks") centered, with descriptive text below
- Radius and shadow follow default card spec

**Dropdown Menu (Account dropdown, top-nav)**
- Background: `#f9f9f9` (Neutral Cool)
- Menu items at `24px / weight 400` in Text Black
- No border — just background surface shift against white nav

**Modal**
- Padding: `2.4rem` (`--modalPadding`)
- Top padding: `8.8rem` (`--modalTopPadding`) — leaves room for close button / header
- Combined vertical padding: `11.2rem`
- Radius inherits from card spec (`12px`)

### Inputs & Forms

**Floating Label Input**
- Label floats above the input border when focused/filled
- Desktop label font size: `1.9rem` default, animates to `1.4rem` when active
- Mobile label font size: `1.6rem` default, animates to `1.3rem` active
- Label horizontal offset: `12px` from left
- Active label translate: up to `-12px` with `-50%` Y translation
- Field padding: `12px`
- Form horizontal padding: `1.6rem`
- Validation: valid-field gets `rgba(green-light, 0.33)` tint; invalid-field gets `rgba(red, 0.05)` tint
- Transition: `0.3s option-label-marker-expansion cubic-bezier(0.32, 2.32, 0.61, 0.27)` on checked-input

**Option Icon (checkbox/radio)**
- Padding: `3px` inner
- Uses the checked-input cubic-bezier animation above (a slightly "springy" 2.32 overshoot curve)

### Navigation

**Global Nav (top bar)**
- Fixed position with progressive heights: `64px` xs → `72px` mobile → `83px` tablet → `99px` desktop
- Shadow stack: `0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07)` — three-layer soft lift
- Left: Lembas wordmark logo, offsetting by `99px` (md) / `131px` (lg) from left edge
- Primary links inline in Plus Jakarta Sans weight 400–600: Tienda · Beneficios · Productos
- Right: Cómo llegar link + Ingresar (outlined) + Crear cuenta (black filled)

**Sub-nav (second bar, e.g., loyalty internal)**
- Height: `53px` (global subnav) / `48px` (internal subnav)
- Typically horizontal tab group beneath the global nav

**Mobile Nav**
- Collapses to a hamburger drawer below tablet breakpoint
- Leaf CTA floating button persists at bottom-right regardless of nav state

### Image Treatment

- **Hero photography**: Product photos (natural products and packaging with colored backgrounds — leaf green, toasted orange, warm kraft) ocpackagey ~40vw of a split-hero layout; text ocpackageies the other 60vw (`--headerCrateProportion: 40vw` / `--contentCrateProportion: 60vw`)
- **Gift card illustrations**: Each card is a distinct illustrated photograph (painted-feel, hand-drawn-looking, warm color palette). Never generic generated graphics.
- **loyalty ceremony imagery**: Photographs of Lembas loyalty benefit screens held in-hand, angled compositions — product-in-context photography.
- **Menu thumbnails**: Square or 4:3 product photography with clean white/cream backdrops, slight soft drop-shadow around the package.
- **Image fade-in**: `opacity 0.3s ease-in` transition on image load (`--imageFadeTransition`).

### Feature Band (dark-green hero strip)

Full-width `#075f36` (Lembas Forest Green) band with:
- Left: white headline + subhead + CTA row
- Right: product photography or illustration
- Split ratio ~40/60 or 50/50 depending on section
- White text throughout with `rgba(255,255,255,0.70)` for secondary copy
- CTAs follow Green-on-Green Inverted (white filled) + Outlined on Dark (white outline) pairing

### Expander / Accordion

- Duration: `300ms` (`--expanderDuration`)
- Timing curve: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` — a measured ease-out
- Used for FAQ sections on loyalty and gift page

### Cookie Consent Module

Dark-green modal card at top of page with "Agree" (green-filled) and "Manage preferences" (outlined) buttons. Appears on first visit; dismissible.

### Product Detail Components (PDP signature cluster)

A repeating component cluster used on menu product pages (e.g., `/menu/product/40498/iced` for a drink detail, `/menu/product/.../nutrition` for nutrition facts). These extend the component inventory without changing tokens.

**Size Options Selector**
- Horizontal row of 4 package-size buttons (Chico / Mediano / Grande / Familiar)
- Each item: package silhouette icon on top, size name below (16/700 in Lembas-Leaf-Green), size/detail caption (13/400 in Text Black Soft)
- Active state: a green circular ring outline (`2px solid #2f8d72`) around the selected package icon
- Inactive: no ring, same typography
- Full-width row, equal spacing
- Radius of container: `12px` or flat; individual icons are `50%` circular
- Padding: `16px 24px` internal

**Add-in / Milk Select (outlined rectangle)**
- Background: `#ffffff`
- Border: `1px solid #d6dbde` (Input Border)
- Radius: `4px`
- Full-width in its column
- Floating label above top border: "Add-ins" / "Milk" / "Add-ins" — 13/700 in Text Black, uppercase, `0.325px` letter-spacing
- Value displayed centered (e.g., "Ice", "Coconut", "Strawberry Fruit Inclusions scoop"): 16/400 Text Black
- Chevron-down icon right side in Text Black Soft
- Focus: border shifts to Lembas Leaf Green (`#2f8d72`)

**Numeric Stepper**
- Embedded inside an Add-in row when a quantity is required (e.g., Strawberry Fruit Inclusions scoop)
- `−` minus button + count number + `+` plus button, all inline right of the label
- Buttons: circular `32×32px` with `1px solid #d6dbde` border, neutral gray icon
- Count number: 16/700 Text Black centered

**Customize Button**
- Background: `#ffffff`
- Text: `#2f8d72` (Lembas Leaf Green)
- Border: `1.5px solid #2f8d72`
- Radius: `50px` (full pill)
- Padding: `14px 40px` (generously larger than default pills — this is a secondary primary action)
- Label: "Customize" with a orange sparkle icon inset left
- Used for: entering the product-customization flow after size/milk selection

**Add to Order Button (PDP)**
- Background: `#2f8d72` (Lembas Leaf Green)
- Text: `#ffffff`
- Radius: `50px`
- Padding: `14px 32px`
- Pinned top-right of product card and/or aligned right within the store-availability band
- Same scale(0.95) active behavior as other primary CTAs

**Loyalty Cost Pill — "200 pts item"**
- Background: transparent
- Border: `1px solid #f29d52` (Lembas Orange)
- Text: `#f29d52` (Lembas Orange)
- Radius: `50px` (full pill)
- Padding: `4px 12px`
- Content: "200 pts item" to indicate redeemable loyalty points — indicates the loyalty points required to redeem this item
- Font: Plus Jakarta Sans 13/700 with `0.5px` letter-spacing
- Used only on products that are loyalty-redeemable

**Product Description Band**
- Full-width dark-green band (`#075f36` Lembas Forest Green)
- Contains top-to-bottom:
  1. Loyalty Cost Pill (orange) if applicable
  2. Product description body copy in white (16/400/1.5)
  3. Nutritional summary inline ("140 calories, 25g sugar, 2.5g fat") with info-icon tooltip — 14/700 white
  4. "Full nutrition & ingredients list" outlined-white-on-green pill button
- Padding: `32px` vertical
- Appears beneath the primary product header band

**Ingredients / Nutrition Table**
- Two-column layout on the Nutrition page
- Left column: "Ingredients" header + list or "Not available for this item" placeholder text block with an explanatory paragraph in Text Black Soft 14/400
- Right column: "Nutrition" header + label/value rows
- Each row: nutrient label (Plus Jakarta Sans 14/400) on the left, value (e.g., "140 calories", "25g", "205 mg**") on the right, separated by a `1px solid #e7e7e7` hairline below
- Footnote for caffeine/asterisk markers in 13/400 Text Black Soft at the bottom
- Reusable pattern for nutrition facts regulation-compliant tables

**Store Availability Selector**
- Appears on dark-green feature band above the size-options row
- Full-width rounded rectangle with transparent-white interior
- Text: "For item availability, choose a store" in white, 14/400
- Right side: chevron-down affordance + shopping-bag SVG icon in white outline
- Radius: `4px`
- Height: ~48px

**PDP Breadcrumb**
- "Menu / Granolas / Granola artesanal" trail above the product title
- Separator: `/` slash character in Text Black Soft
- Current page is unlinked, prior pages are underlined green-accent links
- Font: 14/400 Plus Jakarta Sans
- Appears on all PDP pages

**Back Chevron Link (PDP nutrition / detail sub-pages)**
- "← Back" text link above section headings on the nutrition page
- Text in Lembas Leaf Green (`#2f8d72`) 14/700 Plus Jakarta Sans
- Left chevron `<` in the same green
- Alternative to full breadcrumb on deep sub-pages

## 5. Layout Principles

### Spacing System

Rem-based semantic scale (anchored `1rem = 10px`):

| Token | Rem | Pixels | Typical Use |
|-------|-----|--------|-------------|
| `--space-1` | `0.4rem` | 4px | Tightest inline padding |
| `--space-2` | `0.8rem` | 8px | Small gap, button vertical padding |
| `--space-3` | `1.6rem` | 16px | Default — card padding, outer gutter xs |
| `--space-4` | `2.4rem` | 24px | Section inner spacing, outer gutter md |
| `--space-5` | `3.2rem` | 32px | Major between-section spacing |
| `--space-6` | `4rem` | 40px | Large gaps, outer gutter lg, header crate |
| `--space-7` | `4.8rem` | 48px | Section-to-section spacing |
| `--space-8` | `5.6rem` | 56px | Very large breathing — Leaf CTA height |
| `--space-9` | `6.4rem` | 64px | Widest section padding |

**Gutter tokens:**
- `--outerGutter: 1.6rem` (16px, default / mobile)
- `--outerGutterMedium: 2.4rem` (24px, tablet)
- `--outerGutterLarge: 4.0rem` (40px, desktop)

**Universal rhythm constant:** `1.6rem` (16px) appears across every page as the default outer gutter, card padding baseline, and text size 3 body — the system's most frequent spacing unit.

### Grid & Container

- Column width scale: `--columnWidthSmall: 343px` / `Medium: 500px` / `Large: 720px` / `XLarge: 1440px`
- Seasonal-tile grid uses a 3-5-up responsive grid of `~343px` tiles
- loyalty status section: 3-up dark-green panels at `lg+` breakpoints
- Hero: asymmetric split 40% (image) / 60% (content) via `--headerCrateProportion` / `--contentCrateProportion`

### Whitespace Philosophy

Whitespace carries the feeling of "plenty of space in the local store." Section padding leans generous (40–64px). Content blocks are separated by whitespace rather than dividers. The cream canvas (`#f6ead6`) is itself a visual breath between white cards and green feature bands.

### Border Radius Scale

| Value | Use |
|-------|-----|
| `12px` | Cards, modals, menu-item tiles (`--cardBorderRadius`) |
| `12px 12px 0 0` | Full-width feedback tab (top-rounded only) |
| `50px` | All buttons — full-pill radius (`--buttonBorderRadius`) |
| `50%` | Circular icons, Leaf CTA floating button, avatar thumbnails |
| Specialty | `3.3333%/5.298%` elliptical for printed promo-card mockups |

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Card | `0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)` | Default content cards — a whisper-soft dual-shadow |
| Global Nav | `0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07)` | Triple-layer soft lift on the fixed top bar |
| Leaf CTA Base | `0 0 6px rgba(0,0,0,0.24)` | Base halo around the floating circular CTA |
| Leaf CTA Ambient | `0 8px 12px rgba(0,0,0,0.14)` | Stacked directional ambient — floats the Leaf CTA forward |
| Seasonal Tile | Light drop shadow around illustrated photograph | Physical-card feel for seasonal tiles |
| Printed Promo Card | `drop-shadow(0 4px 1px rgba(0,0,0,0.11)) drop-shadow(0 0 2px rgba(0,0,0,0.24))` | Stacked SVG drop shadows for printed card visuals |

**Shadow philosophy:** Whisper-soft, layered over solid — the system never reaches for a single heavy drop shadow. Instead, it stacks 2–3 low-alpha shadows with different offsets to simulate real-world ambient + direct lighting. The Leaf CTA button is the most elevated element on any page.

### Decorative Depth

- **No gradient system** — surfaces are solid color-block
- **Color-block banding** carries perceived depth (dark-green bands read as "recessed feature zones" between cream/white body sections)
- **SVG filter shadows** on Lembas-Card visuals add a slight 3D physicality without a box-shadow

## 7. Do's and Don'ts

### Do
- Use Neutral Warm (`#f6ead6`) or Ceramic (`#e7dbc0`) as page canvas instead of pure white — the warm cream is the signature
- Map greens consistently — Lembas Leaf Green for headings, links, icons, CTAs, and selections; Lembas Forest Green only for deep bands, sidebars, and footer surfaces
- Keep tracking tight at `-0.01em` / `-0.16px` on Plus Jakarta Sans across the whole system
- Use 50px full-pill radius on every button without exception
- Apply `transform: scale(0.95)` as the universal button active state
- Reserve Lembas Orange for loyalty-status ceremony moments only
- Use Plus Jakarta Sans for nearly everything; switch to Lora serif only for loyalty editorial headlines; reserve Caveat script for brand moments "handwritten label" moments
- Layer 2–3 low-alpha shadows instead of one heavier drop shadow for elevation
- Use the Leaf CTA circular CTA as the persistent floating order entry on every shopping surface
- Let the cream canvas breathe between content cards — use whitespace, not dividers

### Don't
- Don't use pure white as the page canvas — the warm cream temperature is load-bearing
- Don't introduce extra unrelated greens — keep visible actions on `#2f8d72` and reserve `#075f36` for dark surfaces only
- Don't use Lembas Orange as a general-purpose accent — it's a loyalty signal only
- Don't square the corners on buttons — the 50px pill is universal
- Don't introduce gradient fills — the system is color-block throughout
- Don't weight-contrast h1 and h2 by size — the hierarchy comes from weight + color (600 Lembas-Leaf-Green vs 400 Text Black)
- Don't use pure black for body text — `rgba(0,0,0,0.87)` matches the warm canvas
- Don't skip the `scale(0.95)` active feedback on buttons — it's a signature micro-interaction
- Don't stack single heavy shadows; always layer 2–3 low-alpha ones
- Don't introduce serifs or scripts into the main shopping flow — they belong to loyalty and brand moments contexts respectively

## 8. Responsive Behavior

### Breakpoints

Inferred from component width tokens and progressive nav heights:

| Name | Width | Key Changes |
|------|-------|-------------|
| xs | < 480px | Global nav 64px; hamburger menu; single-column layouts; pill buttons full-width |
| Mobile | 480–767px | Global nav 72px; seasonal-tile grid 2-up; card padding tightens |
| Tablet | 768–1023px | Global nav 83px; seasonal-tile grid 3-up; hero split begins to appear |
| Desktop | 1024–1439px | Global nav 99px; seasonal-tile grid 4-up; full asymmetric hero 40/60 |
| XLarge | 1440px+ | Content caps at `--columnWidthXLarge`; seasonal-tile grid 5-up; extra cream margin |

### Touch Targets

- Pill buttons at `7px 16px` padding measure ~32px tall — below 44px WCAG AAA minimum for touch-only surfaces. On mobile, button padding may be visually expanded to meet the minimum.
- Leaf CTA floating circular button at `56px` is well above minimum.
- Leaf CTA uses `--frapTouchOffset: calc(-1 * .8rem)` to extend tap area 8px beyond visual edge.
- Form float-label inputs grow their label font size on mobile (1.6rem base vs 1.9rem desktop) — easier to tap and read at arm's-length.

### Collapsing Strategy

- **Global nav height scales progressively**: 64 → 72 → 83 → 99px across breakpoints, not a single value
- **Hero split collapses**: 40/60 asymmetric split → stacked (image top, content below) at mobile
- **Seasonal-tile grid**: 5-up → 4-up → 3-up → 2-up → 1-up across breakpoints with adjusted card widths
- **Feature bands**: Stay full-width but text + imagery stack vertically on mobile
- **Outer gutter scales**: 16px → 24px → 40px as viewport grows
- **loyalty 3-column status panels**: Stack to single column on mobile

### Image Behavior

- Hero product photography crops tighter vertically on mobile; content becomes the visual anchor
- Seasonal-tile illustrations preserve aspect ratio; card grid reflows
- `opacity 0.3s ease-in` fade-in transition on image load (prevents jarring pop-in)
- loyalty phone-in-hand photography scales proportionally; never stretches

## 9. Agent Prompt Guide

### Quick Color Reference

- Primary CTA: "Lembas Leaf Green (`#2f8d72`)"
- Primary CTA text: "White (`#ffffff`)"
- Brand heading: "Lembas Leaf Green (`#2f8d72`)"
- Feature band / footer: "Lembas Forest Green (`#075f36`)"
- Page canvas: "Neutral Warm (`#f6ead6`)"
- Card canvas: "White (`#ffffff`)"
- Heading text on light: "Text Black (`rgba(0,0,0,0.87)`)"
- Body text on light: "Text Black Soft (`rgba(0,0,0,0.58)`)"
- Body text on dark-green: "Text White Soft (`rgba(255,255,255,0.70)`)"
- loyalty accent: "Lembas Orange (`#f29d52`)"
- loyalty text: "Muted Herb Green (`#33433d`)"
- Destructive: "Red (`#c82014`)"

### Example Component Prompts

1. "Create a primary Lembas CTA pill button with Lembas Leaf Green (`#2f8d72`) background, white text 'Ver productos saludables', Plus Jakarta Sans font at 16px weight 600 with `-0.01em` letter-spacing, `50px` border-radius (full pill), `7px 16px` padding. Apply `transform: scale(0.95)` as the active state with a `0.2s ease` transition."

2. "Design a content card with White (`#ffffff`) background at `12px` border-radius, layered shadow `0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)`. Pad contents `16–24px` (`--space-3` to `--space-4`). Place on a Neutral Warm (`#f6ead6`) page canvas with `16px` gap to siblings."

3. "Build the Leaf CTA floating circular order button — `56px` diameter, Lembas Leaf Green (`#2f8d72`) fill, white shopping-bag icon centered. Layered shadow: `0 0 6px rgba(0,0,0,0.24)` + `0 8px 12px rgba(0,0,0,0.14)`. Fixed position bottom-right with `-0.8rem` touch offset. Active state collapses the ambient shadow to `0 8px 12px rgba(0,0,0,0)` with `scale(0.95)`."

4. "Build a dark-green feature band — full-width section with Lembas Forest Green (`#075f36`) background. Left column: white Plus Jakarta Sans h2 at 24px weight 600, followed by a Text White Soft (`rgba(255,255,255,0.70)`) body paragraph and a CTA row with two buttons (White-filled with Lembas Leaf Green text for primary, Outlined-on-Dark white border for secondary). Right column: product photography. Split ratio 40/60, stacked vertically below `768px`."

5. "Create a loyalty status card — Lembas Forest Green (`#075f36`) panel with `12px` border-radius, colored gradient top stripe (Bronze/Silver/Lembas Orange tier). Title in Plus Jakarta Sans 24px weight 600 in white. Benefits list as white bullets with `rgba(255,255,255,0.70)` secondary captions. Bottom progression text in Text White Soft. Stack 3 panels in a grid at `lg+`, single column on mobile."

6. "Design a seasonal-tile tile — card radius matches `12px`, fills with an illustrated photograph (hand-drawn watercolor-painted feel) as the entire surface. Subtle drop shadow makes it feel like a physical card on the cream canvas. Group under a category label ('Spring', 'Thank You', 'Birthday') in Plus Jakarta Sans 24px weight 400 above the grid."

7. "Create a Lembas product-detail header — Lembas Forest Green (`#075f36`) band with breadcrumb 'Menu / Granolas / Granola artesanal' in 14/400 white above the product title in Plus Jakarta Sans 32/700 uppercase white. Product photograph centered below title. Below photo: a 4-up size selector row — each package-size button shows a vertical package silhouette, size name ('Chico' / 'Mediano' / 'Grande' / 'Familiar') in 16/700 white, and fluid-ounce in 13/400 Text White Soft. Selected size wraps the package icon in a `2px solid #2f8d72` circular ring."

8. "Build a Lembas customize flow — under the size selector, 3 stacked outlined-rectangle input rows (white bg, `1px solid #d6dbde` border, `4px` radius). Each has a floating label ('Add-ins', 'Milk', 'Add-ins') above the top border in 13/700 Text Black uppercase. Value centered (e.g., 'Ice', 'Coconut'). Right side: chevron-down in Text Black Soft. For the scoop row, embed a numeric stepper (`−` `1` `+` with circular `32px` outlined buttons). Below all three fields: outlined green 'Customize' pill with orange sparkle icon, `50px` radius, `14px 40px` padding. Pair with a Lembas Leaf Green filled 'Add to Order' pill in the same row."

9. "Design a Lembas product description band — full-width Lembas Forest Green (`#075f36`) below product header. Top: an orange-outlined '200 pts item' Loyalty Cost Pill (`50px` radius, `4px 12px` padding, orange `#f29d52` border and text). Below: product description in white 16/400/1.5. Nutritional inline summary in white 14/700 ('140 calories, 25g sugar, 2.5g fat') with info-icon tooltip. Outlined-white-on-green pill button 'Full nutrition &amp; ingredients list'. 32px vertical padding."

10. "Create a Lembas nutrition facts table — two-column layout inside a White card. Left column: 'Ingredients' header (24/400 Text Black), followed by ingredient list or 'Not available for this item' placeholder paragraph in 14/400 Text Black Soft. Right column: 'Nutrition' header, then label/value rows (nutrient name left, value right) separated by `1px solid #e7e7e7` hairlines. Typography: labels in 14/400 Text Black, values in 14/700 Text Black right-aligned. Footnote asterisk markers in 13/400 Text Black Soft at the bottom."

### Iteration Guide

When refining existing screens generated with this design system:
1. Focus on ONE component at a time
2. Reference specific color names and hex codes from this document
3. Use natural language descriptions ("warm cream canvas," "tight Lembas green system") alongside exact values
4. Preserve the 50px pill + `scale(0.95)` active state universally
5. Check that greens are mapped to their correct role (`#2f8d72` for CTA/heading/icon, `#075f36` for dark bands/footer only)
6. Don't introduce gradients — the system is color-block
7. Keep Plus Jakarta Sans tracking at `-0.01em` / `-0.16px` across the board

### Known Gaps

- Plus Jakarta Sans is a proprietary typeface not available on Google Fonts — when implementing publicly, use Plus Jakarta Sans, Manrope, or Nunito Sans as a substitute and document the swap
- Lora (loyalty serif) is also custom — substitute with Georgia, Lora, or Source Serif Pro
- Specific per-component animation timings beyond the few documented (`--duration: 0.4s`, `--iconTransition: all ease-out 0.2s`, `--expanderDuration: 300ms`) are not captured for every interactive surface
- Form error-state full styling (red border weight, icon placement) visible on the tint token but not exhaustively extracted
- brand-moment specific components (handwritten-label card, search radio grid) are referenced in token names but not covered by this extraction
- Printed promo-card mockup specs can be added later if physical loyalty or seasonal cards become part of the product
