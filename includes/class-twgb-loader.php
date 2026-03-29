<?php
/**
 * Plugin loader – registers blocks, assets, editor JIT, and REST endpoints.
 */
class TWGB_Loader {

    private static $blocks = [
        'tw-container',
        'tw-text',
        'tw-image',
        'tw-button',
        'tw-grid',
        'tw-flex',
    ];

    private static $jit_markup_output = false;

    public static function init() {
        // Register shared class-parsing utility (loaded before block scripts).
        wp_register_script(
            'twgb-class-utils',
            TWGB_URL . 'assets/js/twgb-class-utils.js',
            [],
            TWGB_VERSION,
            true
        );

        $editor_deps = [
            'wp-blocks',
            'wp-element',
            'wp-block-editor',
            'wp-components',
            'wp-i18n',
            'wp-compose',
            'wp-data',
            'twgb-class-utils',
        ];

        foreach ( self::$blocks as $block ) {
            $block_dir = TWGB_PATH . 'blocks/' . $block;
            if ( ! file_exists( $block_dir . '/block.json' ) ) {
                continue;
            }

            // Manually register the editor script so block.json can find it.
            $handle = 'twgb-' . $block . '-editor-script';
            wp_register_script(
                $handle,
                TWGB_URL . 'blocks/' . $block . '/edit.js',
                $editor_deps,
                TWGB_VERSION,
                true
            );

            register_block_type( $block_dir, [
                'editor_script' => $handle,
            ] );
        }
    }

    /**
     * Register plugin settings under Settings > TW Blocks.
     */
    public static function register_settings() {
        register_setting(
            'twgb_settings',
            'twgb_editor_jit_enabled',
            [
                'type'              => 'boolean',
                'sanitize_callback' => [ __CLASS__, 'sanitize_jit_setting' ],
                'default'           => 1,
            ]
        );

        register_setting(
            'twgb_settings',
            'twgb_frontend_jit_enabled',
            [
                'type'              => 'boolean',
                'sanitize_callback' => [ __CLASS__, 'sanitize_jit_setting' ],
                'default'           => 0,
            ]
        );

        add_settings_section(
            'twgb_jit_settings',
            __( 'Tailwind Runtime (JIT)', 'tw-gutenberg-bridge' ),
            [ __CLASS__, 'render_settings_section_intro' ],
            'twgb-settings'
        );

        add_settings_field(
            'twgb_editor_jit_enabled',
            __( 'TWGB Editor Tailwind JIT', 'tw-gutenberg-bridge' ),
            [ __CLASS__, 'render_editor_jit_setting_field' ],
            'twgb-settings',
            'twgb_jit_settings'
        );

        add_settings_field(
            'twgb_frontend_jit_enabled',
            __( 'TWGB Frontend Tailwind JIT', 'tw-gutenberg-bridge' ),
            [ __CLASS__, 'render_frontend_jit_setting_field' ],
            'twgb-settings',
            'twgb_jit_settings'
        );
    }

    /**
     * Add dedicated settings page under Settings menu.
     */
    public static function register_settings_page() {
        add_options_page(
            __( 'TW Blocks Settings', 'tw-gutenberg-bridge' ),
            __( 'TW Blocks', 'tw-gutenberg-bridge' ),
            'manage_options',
            'twgb-settings',
            [ __CLASS__, 'render_settings_page' ]
        );
    }

    /**
     * Render section intro copy.
     */
    public static function render_settings_section_intro() {
        echo '<p>' . esc_html__( 'Configure Tailwind Browser JIT behavior for editor and frontend.', 'tw-gutenberg-bridge' ) . '</p>';
    }

    /**
     * Render plugin settings page.
     */
    public static function render_settings_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php esc_html_e( 'TW Blocks Settings', 'tw-gutenberg-bridge' ); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields( 'twgb_settings' );
                do_settings_sections( 'twgb-settings' );
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    /**
     * Sanitize on/off setting.
     */
    public static function sanitize_jit_setting( $value ) {
        return empty( $value ) ? 0 : 1;
    }

    /**
     * Render the checkbox field for editor JIT.
     */
    public static function render_editor_jit_setting_field() {
        $enabled = (int) get_option( 'twgb_editor_jit_enabled', 1 );
        ?>
        <label for="twgb_editor_jit_enabled">
            <input
                type="checkbox"
                id="twgb_editor_jit_enabled"
                name="twgb_editor_jit_enabled"
                value="1"
                <?php checked( 1, $enabled ); ?>
            />
            <?php esc_html_e( 'Enable Tailwind Browser JIT inside block editor/admin.', 'tw-gutenberg-bridge' ); ?>
        </label>
        <p class="description">
            <?php esc_html_e( 'Default is ON. This affects the editor only, not frontend rendering.', 'tw-gutenberg-bridge' ); ?>
        </p>
        <?php
    }

    /**
     * Render the checkbox field for frontend JIT.
     */
    public static function render_frontend_jit_setting_field() {
        $enabled = (int) get_option( 'twgb_frontend_jit_enabled', 0 );
        ?>
        <label for="twgb_frontend_jit_enabled">
            <input
                type="checkbox"
                id="twgb_frontend_jit_enabled"
                name="twgb_frontend_jit_enabled"
                value="1"
                <?php checked( 1, $enabled ); ?>
            />
            <?php esc_html_e( 'Enable Tailwind Browser JIT on frontend pages that use TWGB blocks.', 'tw-gutenberg-bridge' ); ?>
        </label>
        <p class="description">
            <?php esc_html_e( 'Default is OFF. Enable this only for live preview/development because runtime JIT is not optimized for production.', 'tw-gutenberg-bridge' ); ?>
        </p>
        <?php
    }

    /**
     * Whether editor JIT is enabled.
     */
    public static function is_editor_jit_enabled() {
        return (int) get_option( 'twgb_editor_jit_enabled', 1 ) === 1;
    }

    /**
     * Whether frontend JIT is enabled.
     */
    public static function is_frontend_jit_enabled() {
        return (int) get_option( 'twgb_frontend_jit_enabled', 0 ) === 1;
    }

    public static function editor_assets() {
        // Shared editor utilities.
        $asset_file = TWGB_PATH . 'assets/js/twgb-editor.asset.php';
        $asset      = file_exists( $asset_file )
            ? require $asset_file
            : [ 'dependencies' => [], 'version' => TWGB_VERSION ];

        wp_enqueue_script(
            'twgb-editor',
            TWGB_URL . 'assets/js/twgb-editor.js',
            array_merge(
                [ 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n', 'wp-compose', 'wp-data' ],
                $asset['dependencies']
            ),
            $asset['version'],
            true
        );

        wp_enqueue_style(
            'twgb-editor-style',
            TWGB_URL . 'assets/css/twgb-editor.css',
            [ 'wp-edit-blocks' ],
            TWGB_VERSION
        );
    }

    /**
     * Output editor JIT script/style in wp-admin.
     */
    public static function output_editor_jit() {
        if ( ! is_admin() || ! self::is_editor_jit_enabled() ) {
            return;
        }

        self::output_jit_markup_once( true );
    }

    /**
     * Output JIT script/style on frontend, when enabled.
     */
    public static function output_frontend_jit() {
        if ( is_admin() || ! self::is_frontend_jit_enabled() ) {
            return;
        }

        if ( ! self::current_request_has_twgb_blocks() ) {
            return;
        }

        self::output_jit_markup_once( false );
    }

    /**
     * Inject editor JIT into iframe/resolved editor assets.
     */
    public static function inject_editor_iframe_assets( $editor_settings, $block_editor_context ) {
        if ( ! is_admin() || ! self::is_editor_jit_enabled() ) {
            return $editor_settings;
        }

        if ( ! isset( $editor_settings['__unstableResolvedAssets'] ) || ! is_array( $editor_settings['__unstableResolvedAssets'] ) ) {
            $editor_settings['__unstableResolvedAssets'] = [
                'styles'  => '',
                'scripts' => '',
            ];
        }

        $assets       = $editor_settings['__unstableResolvedAssets'];
        $styles_html  = isset( $assets['styles'] ) ? (string) $assets['styles'] : '';
        $scripts_html = isset( $assets['scripts'] ) ? (string) $assets['scripts'] : '';

        if ( false === strpos( $scripts_html, 'id="twgb-tailwind-browser-jit"' ) ) {
            $scripts_html .= "\n" . self::get_tailwind_jit_script_tag();
        }
        if ( false === strpos( $scripts_html, 'id="twgb-tailwind-browser-refresh"' ) ) {
            $scripts_html .= "\n" . self::get_tailwind_refresh_script_tag();
        }

        $css = self::read_theme_css_for_browser_runtime();
        if ( '' !== $css && false === strpos( $styles_html, 'id="twgb-tailwind-editor-theme"' ) ) {
            $styles_html .= "\n" . self::get_tailwind_style_tag( $css );
        }

        $editor_settings['__unstableResolvedAssets']['styles']  = $styles_html;
        $editor_settings['__unstableResolvedAssets']['scripts'] = $scripts_html;

        return $editor_settings;
    }

    /**
     * Build and output JIT markup only once per request.
     */
    private static function output_jit_markup_once( $with_iframe_bridge = false ) {
        if ( self::$jit_markup_output ) {
            return;
        }
        self::$jit_markup_output = true;

        echo self::get_tailwind_jit_script_tag() . "\n";
        echo self::get_tailwind_refresh_script_tag() . "\n";

        $css = self::read_theme_css_for_browser_runtime();
        if ( '' !== $css ) {
            echo self::get_tailwind_style_tag( $css ) . "\n";
        }

        if ( $with_iframe_bridge ) {
            echo self::get_admin_iframe_bridge_script() . "\n";
        }
    }

    /**
     * Read theme CSS candidates.
     */
    private static function read_theme_css() {
        $stylesheet_dir = get_stylesheet_directory();
        $template_dir   = get_template_directory();

        $paths = [
            $stylesheet_dir . '/theme/tailwind.css',
            $stylesheet_dir . '/tailwind.css',
            $stylesheet_dir . '/assets/css/tailwind.css',
            $stylesheet_dir . '/assets/css/theme.css',
            $stylesheet_dir . '/style.css',
        ];

        if ( $template_dir !== $stylesheet_dir ) {
            $paths[] = $template_dir . '/theme/tailwind.css';
            $paths[] = $template_dir . '/tailwind.css';
            $paths[] = $template_dir . '/assets/css/tailwind.css';
            $paths[] = $template_dir . '/assets/css/theme.css';
            $paths[] = $template_dir . '/style.css';
        }

        $paths = apply_filters( 'twgb_editor_jit_theme_css_paths', $paths );

        foreach ( $paths as $path ) {
            if ( ! is_string( $path ) || '' === $path ) {
                continue;
            }
            if ( ! file_exists( $path ) || ! is_readable( $path ) ) {
                continue;
            }

            $css = file_get_contents( $path );
            if ( false !== $css && '' !== trim( $css ) ) {
                return $css;
            }
        }

        return '';
    }

    /**
     * Normalize theme CSS for @tailwindcss/browser runtime.
     */
    private static function read_theme_css_for_browser_runtime() {
        $css = self::read_theme_css();
        if ( '' === trim( $css ) ) {
            return '';
        }

        // Browser runtime should scan current DOM, not file directives.
        $css = preg_replace(
            '/@import\s+["\']tailwindcss["\']\s+source\(none\)\s*;?/i',
            '@import "tailwindcss";',
            $css
        ) ?? $css;
        $css = preg_replace( '/^\s*@source\s+[^;]+;\s*$/mi', '', $css ) ?? $css;

        return trim( $css );
    }

    private static function get_tailwind_jit_script_tag() {
        return '<script id="twgb-tailwind-browser-jit" src="https://unpkg.com/@tailwindcss/browser@4"></script>';
    }

    private static function get_tailwind_refresh_js() {
        return <<<'JS'
(function () {
    var refreshTimeout = null;
    function refreshTailwind() {
        if (window.tailwind && typeof window.tailwind.refresh === 'function') {
            window.tailwind.refresh();
        }
    }
    function scheduleRefresh() {
        if (refreshTimeout) {
            window.clearTimeout(refreshTimeout);
        }
        refreshTimeout = window.setTimeout(refreshTailwind, 25);
    }
    window.addEventListener('load', scheduleRefresh);
    document.addEventListener('DOMContentLoaded', scheduleRefresh);
    var observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    window.setTimeout(scheduleRefresh, 200);
    window.setTimeout(scheduleRefresh, 800);
})();
JS;
    }

    private static function get_tailwind_refresh_script_tag() {
        return '<script id="twgb-tailwind-browser-refresh">' . "\n" .
            self::get_tailwind_refresh_js() . "\n" .
            '</script>';
    }

    private static function get_tailwind_style_tag( $css ) {
        if ( '' === trim( (string) $css ) ) {
            return '';
        }

        $safe_css = str_replace( '</style', '<\/style', (string) $css );

        return '<style type="text/tailwindcss" id="twgb-tailwind-editor-theme">' . "\n" .
            $safe_css . "\n" .
            '</style>';
    }

    /**
     * Keep same-origin editor/admin iframes synced with JIT tags.
     */
    private static function get_admin_iframe_bridge_script() {
        $refresh_js = wp_json_encode( self::get_tailwind_refresh_js() );

        return '<script id="twgb-tailwind-admin-iframe-bridge">' . "\n" .
            '(function () {' . "\n" .
            'var JIT_ID = "twgb-tailwind-browser-jit";' . "\n" .
            'var STYLE_ID = "twgb-tailwind-editor-theme";' . "\n" .
            'var REFRESH_ID = "twgb-tailwind-browser-refresh";' . "\n" .
            'var refreshCode = ' . $refresh_js . ';' . "\n" .
            'function inject(doc) {' . "\n" .
            'if (!doc || !doc.head) return;' . "\n" .
            'if (!doc.getElementById(JIT_ID)) {' . "\n" .
            'var s = doc.createElement("script"); s.id = JIT_ID; s.src = "https://unpkg.com/@tailwindcss/browser@4"; doc.head.appendChild(s);' . "\n" .
            '}' . "\n" .
            'var parentStyle = document.getElementById(STYLE_ID);' . "\n" .
            'if (parentStyle && !doc.getElementById(STYLE_ID)) {' . "\n" .
            'var st = doc.createElement("style"); st.id = STYLE_ID; st.type = "text/tailwindcss"; st.textContent = parentStyle.textContent || ""; doc.head.appendChild(st);' . "\n" .
            '}' . "\n" .
            'if (!doc.getElementById(REFRESH_ID)) {' . "\n" .
            'var r = doc.createElement("script"); r.id = REFRESH_ID; r.text = refreshCode; doc.head.appendChild(r);' . "\n" .
            '}' . "\n" .
            '}' . "\n" .
            'function bindIframe(iframe) {' . "\n" .
            'if (!iframe || iframe.__twgbTailwindBound) return;' . "\n" .
            'iframe.__twgbTailwindBound = true;' . "\n" .
            'function apply(){ try { inject(iframe.contentDocument); } catch (e) {} }' . "\n" .
            'iframe.addEventListener("load", apply);' . "\n" .
            'apply();' . "\n" .
            '}' . "\n" .
            'function scan(root) {' . "\n" .
            'var base = root && root.querySelectorAll ? root : document;' . "\n" .
            'var frames = base.querySelectorAll("iframe");' . "\n" .
            'for (var i = 0; i < frames.length; i++) { bindIframe(frames[i]); }' . "\n" .
            '}' . "\n" .
            'scan(document);' . "\n" .
            'var observer = new MutationObserver(function () { scan(document); });' . "\n" .
            'observer.observe(document.documentElement, { childList: true, subtree: true });' . "\n" .
            '})();' . "\n" .
            '</script>';
    }

    public static function frontend_assets() {
        // Only load assets on pages that use our blocks.
        if ( ! self::current_request_has_twgb_blocks() ) {
            return;
        }

        // Frontend layout fixes (alignfull support, reset margins).
        wp_enqueue_style(
            'twgb-frontend-style',
            TWGB_URL . 'assets/css/twgb-frontend.css',
            [],
            TWGB_VERSION
        );
    }

    /**
     * Check whether current frontend request contains one of the TWGB blocks.
     */
    private static function current_request_has_twgb_blocks() {
        return has_block( 'twgb/tw-container' ) ||
            has_block( 'twgb/tw-text' ) ||
            has_block( 'twgb/tw-image' ) ||
            has_block( 'twgb/tw-button' ) ||
            has_block( 'twgb/tw-grid' ) ||
            has_block( 'twgb/tw-flex' );
    }

    public static function register_rest_routes() {
        register_rest_route( 'twgb/v1', '/parse', [
            'methods'             => 'POST',
            'callback'            => [ 'TWGB_Parser', 'rest_parse' ],
            'permission_callback' => function () {
                return current_user_can( 'edit_posts' );
            },
        ] );
    }
}
