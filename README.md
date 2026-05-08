# Tailwind Gutenberg Bridge (TWGB)

Tailwind Gutenberg Bridge adds a Tailwind-first workflow to Gutenberg with core-block extensions, a lightweight custom SVG block, and per-post compiled CSS output.

## Features

- Tailwind support for core Gutenberg blocks via `twgbTailwind.cx`
- Tailwind classes applied server-side on rendered block root elements
- Inspector UI for Tailwind editing on core blocks
  - Device toggles: `Desktop`, `Tablet`, `Mobile`
  - `Class String` input
  - Categorized token fields: `Spacing`, `Sizing`, `Typography`, `Layout`, `Colors`, `Effects`, `Other`
- List View Tailwind indicator icon on blocks with Tailwind classes
- `TW SVG` block (`twgb/tw-svg`) for inline SVG markup with Tailwind classes
- Editor More menu tool: **Import Tailwind HTML**
- Editor-only Tailwind JIT using `@tailwindcss/browser@4`
- Compiled Tailwind CSS saved per post in `_twgb_compiled_css`
- Frontend CSS injected inline with `wp_add_inline_style()`

## Requirements

- WordPress 6.0+
- PHP 7.4+

## Installation

1. Copy this plugin to `wp-content/plugins/tw-blocks`
2. Activate **Tailwind Gutenberg Bridge** in WordPress admin
3. (Optional) Go to `Settings > TW Blocks` and confirm editor JIT is enabled

## Usage

### Add Tailwind to core blocks

1. Insert a core block (for example `Group`, `Columns`, `Heading`, `Paragraph`)
2. Open the block sidebar
3. Use the **Tailwind (TWGB)** panel to add classes
4. Save the post

### Import Tailwind HTML

1. Open editor menu (`⋮`) and click **Import Tailwind HTML**
2. Paste HTML
3. Import to generate Gutenberg blocks

### Use TW SVG

1. Insert `TW SVG`
2. Paste `<svg>...</svg>` markup
3. Add Tailwind classes and optional ARIA label

## REST API

| Route                            | Method | Purpose                                        |
| -------------------------------- | ------ | ---------------------------------------------- |
| `/wp-json/twgb/v1/parse`         | `POST` | Parse Tailwind HTML into block descriptors     |
| `/wp-json/twgb/v1/save-post-css` | `POST` | Save compiled post CSS to `_twgb_compiled_css` |

## Data Model

```json
{
  "twgbTailwind": {
    "cx": "hidden md:block p-6"
  }
}
```

Post-level compiled CSS is stored in:

```text
post_meta key: _twgb_compiled_css
```

## Project Structure

```text
tw-blocks/
├── tailwind-gutenberg-bridge.php
├── includes/class-twgb-loader.php
├── blocks/tw-svg/
├── assets/js/twgb-editor.js
├── assets/js/twgb-class-utils.js
├── assets/css/twgb-editor.css
├── assets/css/twgb-frontend.css
├── parser/class-twgb-parser.php
├── renderer/class-twgb-renderer.php
├── tailwind-engine/class-twgb-class-intelligence.php
└── LICENSE
```

## License

Proprietary. See [LICENSE](./LICENSE).
