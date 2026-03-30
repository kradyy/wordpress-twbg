# Tailwind Gutenberg Bridge

A WordPress plugin that brings Tailwind CSS utility classes into the Gutenberg block editor. Build responsive, production-quality landing pages directly in WordPress using familiar Tailwind patterns -- no build tools, no React compilation, no theme.json hacking.

## What It Does

Tailwind Gutenberg Bridge provides **7 lightweight Gutenberg blocks** (Container, Text, Image, SVG, Button, Grid, Flex) that accept arbitrary Tailwind CSS classes. Each block offers two editing modes:

- **Responsive UI Controls** -- breakpoint-aware dropdowns for spacing, typography, layout, and colors (base / sm / md / lg / xl)
- **Raw Tailwind Mode** -- a textarea where you paste any Tailwind class string directly

The plugin also ships with **11 pre-built block patterns** forming a complete dental clinic landing page, ready to insert and customize.

## Requirements

- WordPress 6.0+
- PHP 7.4+

## Installation

1. Download `tailwind-gutenberg-bridge.zip`
2. In WordPress admin: **Plugins > Add New > Upload Plugin**
3. Upload the zip, click **Install Now**, then **Activate**
4. Create a new Page or Post and open the block inserter

## Quick Start

### Insert the demo landing page

1. Create a new **Page**
2. Click the **+** inserter > **Patterns** tab
3. Select the **Tailwind Landing Pages** category
4. Click **TW Full Landing Page -- BrightSmile**
5. Publish and view the page

### Use individual blocks

Search for any block by name in the inserter:

| Block            | Purpose                                            | Supports InnerBlocks |
| ---------------- | -------------------------------------------------- | -------------------- |
| **TW Container** | Semantic wrapper (div, section, nav, footer, etc.) | Yes                  |
| **TW Text**      | Headings, paragraphs, spans, blockquotes           | No                   |
| **TW Image**     | Images with Tailwind sizing/rounding               | No                   |
| **TW SVG**       | Inline SVG icons/graphics with Tailwind classes    | No                   |
| **TW Button**    | Links or buttons with Tailwind styling             | No                   |
| **TW Grid**      | CSS Grid layout container                          | Yes                  |
| **TW Flex**      | Flexbox layout container                           | Yes                  |

### Use individual section patterns

Each section is available as a standalone pattern under the **Tailwind Sections** category:

- **TW Navbar** -- sticky nav with logo, links, CTA button
- **TW Hero Split** -- two-column hero with headline, CTAs, and image
- **TW Stats Bar** -- four-column statistics row on teal background
- **TW Services Cards** -- six service cards in a responsive grid
- **TW Features Grid** -- "why choose us" section with image and feature cards
- **TW Testimonials** -- three testimonial cards with avatars and star ratings
- **TW Pricing Cards** -- three-tier pricing with highlighted "most popular" card
- **TW CTA Banner** -- gradient call-to-action with dual buttons
- **TW Team Grid** -- four team member cards with photos
- **TW Footer** -- four-column dark footer with links and contact info

## How It Works

### Block Architecture

Each block consists of three files:

```
blocks/tw-container/
├── block.json    # Block registration, attributes, supports
├── edit.js       # Editor UI (vanilla JS, no build step)
└── render.php    # Server-side HTML output
```

All blocks use **apiVersion 2** and **server-side rendering** via `render.php`. The `edit.js` files are plain JavaScript IIFEs that call `registerBlockType()` directly -- no JSX, no webpack, no build process.

Container blocks (`tw-container`, `tw-grid`, `tw-flex`) use `InnerBlocks` and persist child blocks via `InnerBlocks.Content` in their save function. Leaf blocks (`tw-text`, `tw-image`, `tw-svg`, `tw-button`) return `null` from save and render entirely via `render.php`.

### Responsive Controls

Every block provides per-breakpoint controls following Tailwind's responsive prefix system:

```
base → no prefix     (e.g., p-4)
sm   → sm: prefix    (e.g., sm:p-6)
md   → md: prefix    (e.g., md:p-8)
lg   → lg: prefix    (e.g., lg:p-12)
xl   → xl: prefix    (e.g., xl:p-16)
```

The UI stores values in a `responsiveAttrs` object, which is compiled to a Tailwind class string on every change. Switching to Raw Mode lets you edit the class string directly; switching back parses the string into structured attributes.

### Class Intelligence Engine

The bidirectional class parser (`TWGB_Class_Intelligence` in PHP, `twgbUtils` in JS) understands these Tailwind categories:

| Category   | Example Classes                                                      |
| ---------- | -------------------------------------------------------------------- |
| Display    | `block`, `flex`, `grid`, `hidden`, `inline-block`                    |
| Flex       | `flex-row`, `flex-col`, `flex-wrap`, `justify-center`, `items-start` |
| Grid       | `grid-cols-1` through `grid-cols-12`                                 |
| Spacing    | `p-4`, `px-6`, `mt-8`, `mx-auto`, `gap-4`                            |
| Typography | `text-sm`, `text-4xl`, `font-bold`, `text-center`                    |
| Colors     | `text-gray-700`, `bg-teal-600`, `bg-white`                           |
| Borders    | `rounded`, `rounded-lg`, `rounded-full`                              |
| Sizing     | `w-full`, `h-screen`, `max-w-7xl`                                    |

Classes that don't match any known pattern (e.g., `hover:bg-teal-700`, `transition-colors`, `shadow-lg`) are preserved in a `_raw` array and round-trip without loss.

### Tailwind CSS Loading

The plugin can load **Tailwind Browser JIT (`@tailwindcss/browser@4`)** and your theme Tailwind CSS at runtime.

Under **Settings > TW Blocks**, you can toggle:

- **TWGB Editor Tailwind JIT** (default: ON)
- **TWGB Frontend Tailwind JIT** (default: OFF)

This runtime JIT is intended for preview/development and is not optimized for production traffic.

### HTML Import Tool

In the block editor, open the **Options menu (⋮)** and select **Import Tailwind HTML**. Paste any Tailwind HTML snippet and the parser will convert it to the appropriate TWGB blocks:

- `<div class="flex ...">` → TW Flex
- `<div class="grid grid-cols-3 ...">` → TW Grid
- `<img>` → TW Image
- `<svg>` → TW SVG
- `<a class="px-4 py-2 bg-blue-500 ...">` → TW Button
- `<h2 class="text-3xl ...">` → TW Text
- Other containers → TW Container

The parser calls the REST endpoint `POST /twgb/v1/parse` (requires `edit_posts` capability).

### Frontend Rendering

On the frontend, each block's `render.php` outputs clean semantic HTML with Tailwind classes:

```html
<!-- TW Container with tag="section" -->
<section class="alignfull bg-white py-20 lg:py-28">
  <div class="max-w-7xl mx-auto px-6">
    <h2 class="text-3xl font-extrabold text-gray-900">Title</h2>
    <p class="mt-4 text-gray-500 text-lg">Description</p>
  </div>
</section>
```

When a post contains any TWGB block, the plugin:

1. Adds `twgb-landing-page` to the `<body>` class list
2. Loads `twgb-frontend.css` which hides theme chrome (header, footer, post meta) for a clean landing page experience
3. Enables `alignfull` CSS breakout so sections span the full viewport width

This is designed for the **Twenty Twenty-Five** theme. Other themes may need CSS adjustments.

## File Structure

```
tailwind-gutenberg-bridge/
├── tailwind-gutenberg-bridge.php    # Plugin entry point, hooks
├── blueprint.json                   # WordPress Playground config
├── includes/
│   └── class-twgb-loader.php        # Block & asset registration
├── blocks/
│   ├── tw-container/                # Container block (div/section/nav/etc.)
│   ├── tw-text/                     # Text block (p/h1-h6/span/blockquote)
│   ├── tw-image/                    # Image block
│   ├── tw-svg/                      # Inline SVG block
│   ├── tw-button/                   # Button/link block
│   ├── tw-grid/                     # CSS Grid block
│   └── tw-flex/                     # Flexbox block
├── parser/
│   └── class-twgb-parser.php        # HTML → block converter
├── renderer/
│   └── class-twgb-renderer.php      # Shared rendering utilities
├── tailwind-engine/
│   └── class-twgb-class-intelligence.php  # Tailwind class parser
├── editor-controls/
│   └── class-twgb-responsive.php    # Breakpoint config
├── assets/
│   ├── js/
│   │   ├── twgb-class-utils.js      # Client-side class parsing
│   │   └── twgb-editor.js           # Editor utilities & import tool
│   └── css/
│       ├── twgb-editor.css          # Editor UI styles
│       └── twgb-frontend.css        # Frontend layout & theme fixes
└── patterns/
    ├── class-twgb-patterns.php      # Pattern registration
    ├── navbar.php                   # Navigation bar
    ├── hero-split.php               # Hero with image
    ├── stats-bar.php                # Statistics row
    ├── services-cards.php           # Service cards grid
    ├── features-grid.php            # Features with image
    ├── testimonials.php             # Testimonial cards
    ├── pricing-cards.php            # Pricing tiers
    ├── cta-banner.php               # Call-to-action banner
    ├── team-grid.php                # Team member cards
    ├── footer.php                   # Site footer
    └── full-landing-page.php        # All sections combined
```

## Block Attributes Reference

### TW Container

| Attribute         | Type    | Default | Description                                                            |
| ----------------- | ------- | ------- | ---------------------------------------------------------------------- |
| `twClasses`       | string  | `""`    | Tailwind utility classes                                               |
| `tag`             | string  | `"div"` | HTML element (div, section, article, main, aside, header, footer, nav) |
| `responsiveAttrs` | object  | `{}`    | Structured responsive values                                           |
| `rawMode`         | boolean | `false` | Toggle raw class editing                                               |

Supports: `align` (full, wide), `anchor`

### TW Text

| Attribute         | Type    | Default | Description                               |
| ----------------- | ------- | ------- | ----------------------------------------- |
| `content`         | string  | `""`    | Text content (supports inline formatting) |
| `twClasses`       | string  | `""`    | Tailwind utility classes                  |
| `tag`             | string  | `"p"`   | HTML element (p, h1-h6, span, blockquote) |
| `responsiveAttrs` | object  | `{}`    | Structured responsive values              |
| `rawMode`         | boolean | `false` | Toggle raw class editing                  |

### TW Image

| Attribute         | Type    | Default | Description                  |
| ----------------- | ------- | ------- | ---------------------------- |
| `src`             | string  | `""`    | Image URL                    |
| `alt`             | string  | `""`    | Alt text                     |
| `twClasses`       | string  | `""`    | Tailwind utility classes     |
| `responsiveAttrs` | object  | `{}`    | Structured responsive values |
| `rawMode`         | boolean | `false` | Toggle raw class editing     |

### TW SVG

| Attribute         | Type    | Default | Description                          |
| ----------------- | ------- | ------- | ------------------------------------ |
| `svg`             | string  | `""`    | Inline `<svg>...</svg>` markup       |
| `ariaLabel`       | string  | `""`    | Optional accessible label            |
| `twClasses`       | string  | `""`    | Tailwind utility classes on root svg |
| `rawMode`         | boolean | `false` | Toggle raw class editing             |

### TW Button

| Attribute         | Type    | Default                                                        | Description                  |
| ----------------- | ------- | -------------------------------------------------------------- | ---------------------------- |
| `content`         | string  | `"Click me"`                                                   | Button text                  |
| `href`            | string  | `""`                                                           | Link URL (when tag is "a")   |
| `twClasses`       | string  | `"px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"` | Tailwind classes             |
| `tag`             | string  | `"a"`                                                          | HTML element (a or button)   |
| `responsiveAttrs` | object  | `{}`                                                           | Structured responsive values |
| `rawMode`         | boolean | `false`                                                        | Toggle raw class editing     |

### TW Grid

| Attribute         | Type    | Default                                                  | Description                  |
| ----------------- | ------- | -------------------------------------------------------- | ---------------------------- |
| `twClasses`       | string  | `"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"` | Tailwind classes             |
| `responsiveAttrs` | object  | `{}`                                                     | Structured responsive values |
| `rawMode`         | boolean | `false`                                                  | Toggle raw class editing     |

Supports: `align` (full, wide), `anchor`

### TW Flex

| Attribute         | Type    | Default                             | Description                  |
| ----------------- | ------- | ----------------------------------- | ---------------------------- |
| `twClasses`       | string  | `"flex flex-col md:flex-row gap-4"` | Tailwind classes             |
| `responsiveAttrs` | object  | `{}`                                | Structured responsive values |
| `rawMode`         | boolean | `false`                             | Toggle raw class editing     |

Supports: `align` (full, wide), `anchor`

## Production Notes

- **Tailwind CDN is for development only.** For production, use [WindPress](https://wordpress.org/plugins/windpress/) or a custom PostCSS/Tailwind build to generate purged CSS. The plugin auto-detects WindPress and disables the CDN.
- **Theme compatibility:** The frontend CSS targets Twenty Twenty-Five's FSE template structure. On other themes, you may need to adjust `twgb-frontend.css` selectors for hiding theme chrome.
- **No build step required.** All JavaScript is vanilla ES5 using WordPress's bundled React and block editor packages. Just zip and install.

## REST API

### Parse Tailwind HTML

```
POST /twgb/v1/parse
Content-Type: application/json

{
  "html": "<div class=\"flex gap-4\"><h1 class=\"text-4xl\">Hello</h1></div>"
}
```

**Response:**

```json
{
  "blocks": [ ... ],
  "gutenberg": "<!-- wp:twgb/tw-flex {\"twClasses\":\"flex gap-4\"} -->\n<!-- wp:twgb/tw-text ... /-->\n<!-- /wp:twgb/tw-flex -->"
}
```

Requires `edit_posts` capability.

## License

GPL-2.0-or-later
