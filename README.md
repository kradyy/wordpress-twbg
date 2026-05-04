# Tailwind Gutenberg Bridge (TWGB)

Tailwind Gutenberg Bridge adds Tailwind workflows to Gutenberg with a SKA-style approach:

- only one custom block is kept: `twgb/tw-svg`
- Tailwind support is injected into core blocks via a custom attribute (`twgbTailwind.cx`)
- Tailwind JIT runs in the editor only
- compiled CSS is saved per post in post meta and output inline on frontend

## Current State

This README reflects the current plugin behavior as of May 2026.

### What is active

1. Custom block:
   - `twgb/tw-svg`
2. Core block Tailwind extension:
   - adds a `twgbTailwind` attribute to supported core blocks
   - renders those classes server-side on the block root element
3. Editor Tailwind panel for core blocks:
   - `Tailwind (TWGB)` inspector panel
   - device toggle buttons: `Desktop`, `Tablet`, `Mobile`
   - `Class String` textarea
   - categorized token fields: `Spacing`, `Sizing`, `Typography`, `Layout`, `Colors`, `Effects`, `Other`
4. List View indicator:
   - Tailwind icon badge appears on blocks that have Tailwind classes
5. Editor-only runtime JIT:
   - `@tailwindcss/browser@4` injected in wp-admin/editor
6. Frontend CSS delivery:
   - no frontend JIT
   - compiled CSS saved to post meta key `_twgb_compiled_css`
   - CSS injected through `wp_add_inline_style()`
7. HTML import tool:
   - `Import Tailwind HTML` from editor More menu
   - REST parse route: `POST /wp-json/twgb/v1/parse`

### What is intentionally not active

- old custom layout/text/image/button/grid/flex TW blocks
- frontend Tailwind browser JIT
- legacy file-based post CSS output (`/uploads/twgb-page-css/...`)
- pattern registration (currently disabled in `TWGB_Patterns::register()`)

## Requirements

- WordPress 6.0+
- PHP 7.4+

## Installation

1. Place this plugin in `wp-content/plugins/tw-blocks`
2. Activate **Tailwind Gutenberg Bridge** in WordPress admin
3. (Optional) go to `Settings > TW Blocks` and verify editor JIT is enabled

## Quick Usage

### Add Tailwind to core blocks

1. Insert a core block (for example `Group`, `Columns`, `Heading`, `Paragraph`, etc.)
2. Open block settings sidebar
3. Use `Tailwind (TWGB)` panel:
   - paste classes in `Class String`
   - or use category token fields with autocomplete
4. Save/update post

On save, editor-compiled Tailwind CSS is sent to `POST /wp-json/twgb/v1/save-post-css` and stored in `_twgb_compiled_css`.

### Use the TW SVG block

1. Insert `TW SVG`
2. Paste full `<svg>...</svg>` markup
3. Add Tailwind classes in token field
4. Optional: set ARIA label

## Architecture Summary

- Plugin bootstrap: `tailwind-gutenberg-bridge.php`
- Loader/hooks: `includes/class-twgb-loader.php`
- Editor extensions/UI: `assets/js/twgb-editor.js`
- Shared class utils/suggestions: `assets/js/twgb-class-utils.js`
- SVG block: `blocks/tw-svg/*`
- HTML parser endpoint: `parser/class-twgb-parser.php`
- Frontend/editor CSS: `assets/css/twgb-frontend.css`, `assets/css/twgb-editor.css`

### Data model

- Block-level Tailwind payload on core blocks:

```json
{
  "twgbTailwind": {
    "cx": "hidden md:block p-6"
  }
}
```

- Post-level compiled CSS:

```text
post_meta key: _twgb_compiled_css
value: compiled Tailwind CSS string
```

## Notes on class conflicts and responsive variants

- Responsive variants must be escaped in CSS selectors (for example `.md\\:block`).
- This plugin preserves those escapes when saving compiled CSS to meta.
- If multiple conflicting utilities are used in the same scope (`w-full w-1/2 w-1/3`), final applied style follows Tailwind's generated utility order, not class string order.

## REST Endpoints

- `POST /wp-json/twgb/v1/parse`
  - input: `{ "html": "..." }`
  - output: block descriptors + Gutenberg markup
- `POST /wp-json/twgb/v1/save-post-css`
  - input: `{ "postId": 123, "css": "..." }`
  - stores compiled CSS in post meta

## Security and sanitization

- Tailwind class strings are sanitized before rendering
- SVG markup goes through sanitizer utilities before output
- Compiled CSS is sanitized and bounded before storage
- Save endpoints require post edit permissions

## License

This project is proprietary.
See [LICENSE](./LICENSE).
