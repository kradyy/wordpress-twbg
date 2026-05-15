<?php
/**
 * Plugin loader – registers blocks, assets, editor JIT, and REST endpoints.
 */
class TWGB_Loader {

    private static $blocks = [
        'tw-svg',
    ];

    private static $jit_markup_output = false;
    private const TAILWIND_ATTRIBUTE = 'twgbTailwind';
    private const POST_CSS_META_KEY = '_twgb_compiled_css';

    public static function init() {
        $class_utils_path = TWGB_PATH . 'assets/js/twgb-class-utils.js';
        $class_utils_ver  = file_exists( $class_utils_path ) ? filemtime( $class_utils_path ) : TWGB_VERSION;

        // Register shared class-parsing utility (loaded before block scripts).
        wp_register_script(
            'twgb-class-utils',
            TWGB_URL . 'assets/js/twgb-class-utils.js',
            [],
            $class_utils_ver,
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
            $edit_js_path = $block_dir . '/edit.js';
            $edit_js_ver  = file_exists( $edit_js_path ) ? filemtime( $edit_js_path ) : TWGB_VERSION;
            wp_register_script(
                $handle,
                TWGB_URL . 'blocks/' . $block . '/edit.js',
                $editor_deps,
                $edit_js_ver,
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
        echo '<p>' . esc_html__( 'Configure Tailwind Browser JIT behavior for the block editor. Frontend JIT is disabled and frontend CSS is served as inline styles from compiled per-post data stored in post meta.', 'tw-gutenberg-bridge' ) . '</p>';
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
     * Whether editor JIT is enabled.
     */
    public static function is_editor_jit_enabled() {
        return (int) get_option( 'twgb_editor_jit_enabled', 1 ) === 1;
    }

    public static function editor_assets() {
        // Shared editor utilities.
        $asset_file = TWGB_PATH . 'assets/js/twgb-editor.asset.php';
        $asset      = file_exists( $asset_file )
            ? require $asset_file
            : [ 'dependencies' => [], 'version' => TWGB_VERSION ];
        $editor_js_path  = TWGB_PATH . 'assets/js/twgb-editor.js';
        $editor_js_ver   = file_exists( $editor_js_path ) ? filemtime( $editor_js_path ) : $asset['version'];
        $editor_css_rel  = 'assets/css/twgb-editor.css';
        $editor_css_path = TWGB_PATH . $editor_css_rel;
        $editor_css_ver  = file_exists( $editor_css_path ) ? filemtime( $editor_css_path ) : TWGB_VERSION;

        wp_enqueue_script(
            'twgb-editor',
            TWGB_URL . 'assets/js/twgb-editor.js',
            array_merge(
                [ 'wp-blocks', 'wp-element', 'wp-hooks', 'wp-block-editor', 'wp-components', 'wp-i18n', 'wp-compose', 'wp-data', 'wp-api-fetch', 'wp-plugins', 'wp-edit-post', 'twgb-class-utils' ],
                $asset['dependencies']
            ),
            $editor_js_ver,
            true
        );

        wp_enqueue_style(
            'twgb-editor-style',
            TWGB_URL . $editor_css_rel,
            [ 'wp-edit-blocks' ],
            $editor_css_ver
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
            return '@import "tailwindcss" important;';
        }

        // Browser runtime should scan current DOM, not file directives.
        $css = preg_replace(
            '/@import\s+["\']tailwindcss["\'](?:\s+source\(none\))?(?:\s+important)?\s*;?/i',
            '@import "tailwindcss" important;',
            $css
        ) ?? $css;
        $css = preg_replace( '/^\s*@source\s+[^;]+;\s*$/mi', '', $css ) ?? $css;

        if ( ! preg_match( '/@import\s+["\']tailwindcss["\']/i', $css ) ) {
            $css = '@import "tailwindcss" important;' . "\n\n" . $css;
        }

        return trim( $css );
    }

    private static function get_tailwind_jit_script_tag() {
        return '<script id="twgb-tailwind-browser-jit" src="https://unpkg.com/@tailwindcss/browser@4"></script>';
    }

    private static function get_tailwind_refresh_js() {
        return <<<'JS'
(function () {
    var refreshTimeout = null;
    var refreshRaf = null;
    var pointerActive = false;
    var pendingRefresh = false;

    function refreshTailwind() {
        if (window.tailwind && typeof window.tailwind.refresh === 'function') {
            window.tailwind.refresh();
        }
    }

    function elementLooksRelevant(node) {
        var className;
        if (!node || node.nodeType !== 1) {
            return false;
        }
        className = node.className;
        if (typeof className !== 'string') {
            className = String(className || '');
        }
        if (className.indexOf('wp-block') !== -1 || className.indexOf('twgb-') !== -1) {
            return true;
        }
        if (typeof node.querySelector === 'function') {
            return !!node.querySelector('[class*="wp-block"], [class*="twgb-"]');
        }
        return false;
    }

    function scheduleRefresh(delay) {
        pendingRefresh = true;
        if (pointerActive) {
            return;
        }
        if (refreshTimeout) {
            window.clearTimeout(refreshTimeout);
        }
        refreshTimeout = window.setTimeout(function () {
            if (pointerActive) {
                return;
            }
            if (refreshRaf) {
                window.cancelAnimationFrame(refreshRaf);
            }
            refreshRaf = window.requestAnimationFrame(function () {
                refreshRaf = null;
                pendingRefresh = false;
                refreshTailwind();
            });
        }, typeof delay === 'number' ? delay : 180);
    }
    function startPointerInteraction() {
        pointerActive = true;
        if (refreshTimeout) {
            window.clearTimeout(refreshTimeout);
            refreshTimeout = null;
        }
    }
    function endPointerInteraction() {
        if (!pointerActive) {
            return;
        }
        pointerActive = false;
        if (pendingRefresh) {
            scheduleRefresh(90);
        }
    }
    function shouldRefresh(records) {
        var i;
        var j;
        var list;
        for (i = 0; i < records.length; i++) {
            if (records[i].type === 'childList') {
                if (elementLooksRelevant(records[i].target)) {
                    return true;
                }
                list = records[i].addedNodes || [];
                for (j = 0; j < list.length; j++) {
                    if (elementLooksRelevant(list[j])) {
                        return true;
                    }
                }
                list = records[i].removedNodes || [];
                for (j = 0; j < list.length; j++) {
                    if (elementLooksRelevant(list[j])) {
                        return true;
                    }
                }
                continue;
            }
            if (records[i].type === 'attributes' && records[i].attributeName === 'class') {
                if (elementLooksRelevant(records[i].target)) {
                    return true;
                }
            }
        }
        return false;
    }
    document.addEventListener('pointerdown', startPointerInteraction, true);
    window.addEventListener('pointerup', endPointerInteraction, true);
    window.addEventListener('pointercancel', endPointerInteraction, true);
    window.addEventListener('blur', endPointerInteraction);
    document.addEventListener('dragstart', startPointerInteraction, true);
    document.addEventListener('dragend', endPointerInteraction, true);
    document.addEventListener('drop', endPointerInteraction, true);
    window.addEventListener('load', function () { scheduleRefresh(60); });
    document.addEventListener('DOMContentLoaded', function () { scheduleRefresh(60); });
    var observer = new MutationObserver(function (records) {
        if (shouldRefresh(records)) {
            scheduleRefresh(180);
        }
    });
    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
    window.setTimeout(function () { scheduleRefresh(80); }, 200);
    window.setTimeout(function () { scheduleRefresh(120); }, 800);
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

        $frontend_css_rel  = 'assets/css/twgb-frontend.css';
        $frontend_css_path = TWGB_PATH . $frontend_css_rel;
        $frontend_css_ver  = file_exists( $frontend_css_path ) ? filemtime( $frontend_css_path ) : TWGB_VERSION;

        // Frontend layout fixes (alignfull support, reset margins).
        wp_enqueue_style(
            'twgb-frontend-style',
            TWGB_URL . $frontend_css_rel,
            [],
            $frontend_css_ver
        );

        // Ensure Space Grotesk weights used by exported typography are available.
        wp_enqueue_style(
            'twgb-space-grotesk-font',
            'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&display=swap',
            [],
            null
        );

        self::enqueue_current_post_compiled_css();
    }

    /**
     * Inject saved compiled Tailwind CSS for the current singular post as inline CSS.
     */
    private static function enqueue_current_post_compiled_css() {
        if ( ! is_singular() ) {
            return;
        }

        $post = get_queried_object();
        if ( ! $post instanceof WP_Post ) {
            return;
        }

        $css = self::get_post_compiled_css( (int) $post->ID );
        if ( '' === $css ) {
            return;
        }

        wp_add_inline_style( 'twgb-frontend-style', $css );
    }

    /**
     * Read compiled CSS from post meta.
     *
     * @param int $post_id Post ID.
     * @return string
     */
    private static function get_post_compiled_css( $post_id ) {
        $post_id = (int) $post_id;
        if ( $post_id < 1 ) {
            return '';
        }

        $css = get_post_meta( $post_id, self::POST_CSS_META_KEY, true );
        $css = is_string( $css ) ? self::sanitize_compiled_css( $css ) : '';
        return $css;
    }

    /**
     * Save compiled CSS for a specific post in post meta.
     *
     * @param int    $post_id Post ID.
     * @param string $css     CSS contents.
     * @return bool
     */
    private static function save_post_compiled_css( $post_id, $css ) {
        $post_id = (int) $post_id;
        if ( $post_id < 1 ) {
            return false;
        }

        $css = self::sanitize_compiled_css( $css );
        if ( '' === $css ) {
            return false;
        }

        $current = get_post_meta( $post_id, self::POST_CSS_META_KEY, true );
        $current = is_string( $current ) ? self::sanitize_compiled_css( $current ) : '';
        if ( $current === $css ) {
            return true;
        }

        // Keep escaped selectors like `.md\:block` intact (WordPress strips slashes on meta save).
        $saved = update_post_meta( $post_id, self::POST_CSS_META_KEY, wp_slash( $css ) );
        if ( false === $saved ) {
            $reloaded = get_post_meta( $post_id, self::POST_CSS_META_KEY, true );
            $reloaded = is_string( $reloaded ) ? self::sanitize_compiled_css( $reloaded ) : '';
            if ( $reloaded !== $css ) {
                return false;
            }
        }

        return true;
    }

    /**
     * Delete compiled CSS for a specific post from meta.
     *
     * @param int $post_id Post ID.
     * @return bool
     */
    public static function delete_post_compiled_css( $post_id ) {
        $post_id = (int) $post_id;
        if ( $post_id < 1 ) {
            return false;
        }

        delete_post_meta( $post_id, self::POST_CSS_META_KEY );

        return true;
    }

    /**
     * Remove stale compiled CSS when a post no longer contains TWGB Tailwind data.
     *
     * @param int     $post_id Post ID.
     * @param WP_Post $post    Post object.
     */
    public static function maybe_cleanup_post_compiled_css( $post_id, $post ) {
        $post_id = (int) $post_id;
        if ( $post_id < 1 || wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
            return;
        }

        if ( ! $post instanceof WP_Post ) {
            $post = get_post( $post_id );
        }

        if ( ! $post instanceof WP_Post ) {
            return;
        }

        if ( ! self::post_has_twgb_tailwind_payload( $post ) ) {
            self::delete_post_compiled_css( $post_id );
        }
    }

    /**
     * REST callback: save compiled CSS produced in the editor.
     *
     * @param WP_REST_Request $request Request.
     * @return WP_REST_Response|WP_Error
     */
    public static function rest_save_post_css( $request ) {
        $post_id = absint( $request->get_param( 'postId' ) );
        if ( $post_id < 1 ) {
            return new WP_Error( 'twgb_invalid_post_id', __( 'Invalid post ID.', 'tw-gutenberg-bridge' ), [ 'status' => 400 ] );
        }

        $post = get_post( $post_id );
        if ( ! $post instanceof WP_Post ) {
            return new WP_Error( 'twgb_post_not_found', __( 'Post not found.', 'tw-gutenberg-bridge' ), [ 'status' => 404 ] );
        }

        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return new WP_Error( 'twgb_forbidden', __( 'You are not allowed to edit this post.', 'tw-gutenberg-bridge' ), [ 'status' => 403 ] );
        }

        $css = self::sanitize_compiled_css( (string) $request->get_param( 'css' ) );

        if ( '' === $css ) {
            self::delete_post_compiled_css( $post_id );
            return rest_ensure_response(
                [
                    'saved'   => false,
                    'deleted' => true,
                ]
            );
        }

        if ( ! self::save_post_compiled_css( $post_id, $css ) ) {
            return new WP_Error( 'twgb_css_store_failed', __( 'Failed to store compiled CSS.', 'tw-gutenberg-bridge' ), [ 'status' => 500 ] );
        }

        $stored_css = self::get_post_compiled_css( $post_id );
        $version = '' !== $stored_css ? md5( $stored_css ) : (string) time();

        return rest_ensure_response(
            [
                'saved'   => true,
                'deleted' => false,
                'size'    => strlen( $stored_css ),
                'version' => $version,
            ]
        );
    }

    /**
     * Basic CSS sanitizer for compiled output.
     *
     * @param string $css Input CSS.
     * @return string
     */
    private static function sanitize_compiled_css( $css ) {
        $css = str_replace( "\0", '', (string) $css );
        $css = trim( $css );

        if ( '' === $css ) {
            return '';
        }

        // Prevent accidental style-tag breakouts.
        $css = str_ireplace( '</style', '', $css );

        // Keep payload bounded to avoid oversized REST writes.
        if ( strlen( $css ) > 2 * MB_IN_BYTES ) {
            $css = substr( $css, 0, 2 * MB_IN_BYTES );
        }

        return trim( $css );
    }

    /**
     * Check if a post still contains any TWGB Tailwind payload.
     *
     * @param WP_Post $post Post object.
     * @return bool
     */
    private static function post_has_twgb_tailwind_payload( $post ) {
        if ( ! $post instanceof WP_Post || ! is_string( $post->post_content ) ) {
            return false;
        }

        if ( has_block( 'twgb/tw-svg', $post ) ) {
            return true;
        }

        return false !== strpos( $post->post_content, '"' . self::TAILWIND_ATTRIBUTE . '"' );
    }

    /**
     * Check whether current frontend request contains one of the TWGB blocks.
     */
    private static function current_request_has_twgb_blocks() {
        if ( has_block( 'twgb/tw-svg' ) ) {
            return true;
        }

        if ( ! is_singular() ) {
            return false;
        }

        $post = get_queried_object();
        if ( ! $post instanceof WP_Post ) {
            return false;
        }

        if ( ! is_string( $post->post_content ) || '' === $post->post_content ) {
            return false;
        }

        return false !== strpos( $post->post_content, '"' . self::TAILWIND_ATTRIBUTE . '"' );
    }

    /**
     * Add TWGB Tailwind attribute to blocks that support custom class names.
     */
    public static function register_block_type_args( $args, $name ) {
        if ( ! is_string( $name ) || '' === $name ) {
            return $args;
        }

        if ( ! isset( $args['attributes'] ) || ! is_array( $args['attributes'] ) ) {
            $args['attributes'] = [];
        }

        if ( ! isset( $args['attributes'][ self::TAILWIND_ATTRIBUTE ] ) ) {
            $args['attributes'][ self::TAILWIND_ATTRIBUTE ] = [
                'type' => 'object',
            ];
        }

        return $args;
    }

    /**
     * Apply TWGB Tailwind classes to rendered blocks server-side.
     */
    public static function render_block( $block_content, $block ) {
        if ( ! is_array( $block ) || ! isset( $block['attrs'] ) || ! is_array( $block['attrs'] ) ) {
            return $block_content;
        }

        $block_name = isset( $block['blockName'] ) ? (string) $block['blockName'] : '';
        if ( '' === trim( (string) $block_content ) ) {
            return $block_content;
        }

        // Always normalize core/button wrapper classes, even when twgbTailwind
        // is missing, so wrapper-only className output is still corrected.
        if ( 'core/button' === $block_name ) {
            $block_content = self::normalize_core_button_wrapper_classes( $block_content );
        }

        $tailwind = self::get_tailwind_attribute( $block['attrs'] );
        $class_names = trim( (string) ( $tailwind['cx'] ?? '' ) );
        if ( '' === $class_names ) {
            return $block_content;
        }

        $blocked_class_names = self::get_blocked_tailwind_classes( $class_names, $block['attrs'], $block_name );
        $class_names = self::filter_tailwind_classes_for_gutenberg_attrs( $class_names, $block['attrs'], $block_name );

        if ( ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
            return $block_content;
        }

        // core/button: apply Tailwind classes on the interactive element (<a>/<button>),
        // not on the outer wrapper. This avoids wrapper background artifacts.
        if ( 'core/button' === $block_name ) {
            return self::apply_tailwind_classes_to_matching_tags(
                $block_content,
                $class_names,
                $blocked_class_names,
                static function ( $tag, $processor ) {
                    if ( 'A' !== $tag && 'BUTTON' !== $tag ) {
                        return false;
                    }

                    if ( 'A' === $tag ) {
                        $class_attr = (string) $processor->get_attribute( 'class' );
                        if ( false !== strpos( $class_attr, 'wp-block-button__link' ) ) {
                            return true;
                        }
                    }

                    return true;
                },
                1
            );
        }

        // core/image: keep classes on wrapper and also apply to first <img>.
        if ( 'core/image' === $block_name ) {
            $updated = self::apply_tailwind_classes_to_matching_tags(
                $block_content,
                $class_names,
                $blocked_class_names,
                static function () {
                    return true;
                },
                1
            );

            return self::apply_tailwind_classes_to_matching_tags(
                $updated,
                $class_names,
                $blocked_class_names,
                static function ( $tag ) {
                    return 'IMG' === $tag;
                },
                1
            );
        }

        // Default behavior: apply classes to the first rendered tag.
        return self::apply_tailwind_classes_to_matching_tags(
            $block_content,
            $class_names,
            $blocked_class_names,
            static function () {
                return true;
            },
            1
        );
    }

    /**
     * Apply classes to tags that match the given selector callback.
     *
     * @param string   $html             Rendered block HTML.
     * @param string   $class_names      TWGB classes to merge.
     * @param string[] $blocked_classes  Classes to remove before merge.
     * @param callable $selector         Receives ($tag, $processor), returns bool.
     * @param int      $max_matches      Max tags to mutate (0 = unlimited).
     * @return string
     */
    private static function apply_tailwind_classes_to_matching_tags( $html, $class_names, $blocked_classes, $selector, $max_matches = 1 ) {
        $processor = new WP_HTML_Tag_Processor( $html );
        $matched   = 0;

        while ( $processor->next_tag() ) {
            $tag = $processor->get_tag();
            if ( ! call_user_func( $selector, $tag, $processor ) ) {
                continue;
            }

            $existing = self::remove_class_names(
                (string) $processor->get_attribute( 'class' ),
                $blocked_classes
            );
            $merged = self::merge_class_names( $existing, $class_names );
            $processor->set_attribute( 'class', $merged );

            $matched++;
            if ( $max_matches > 0 && $matched >= $max_matches ) {
                break;
            }
        }

        if ( 0 === $matched ) {
            return $html;
        }

        return $processor->get_updated_html();
    }

    /**
     * Move accidental visual utility classes from core/button wrapper to inner link/button.
     *
     * Some generated content incorrectly stores Tailwind utilities on
     * <div class="wp-block-button ..."> instead of <a.wp-block-button__link>,
     * which creates outer wrapper backgrounds. Keep structural wrapper classes
     * and transfer non-structural utilities to the interactive element.
     */
    private static function normalize_core_button_wrapper_classes( $html ) {
        if ( ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
            return $html;
        }

        $processor = new WP_HTML_Tag_Processor( $html );
        $wrapper_found = false;
        $transfer_tokens = [];

        while ( $processor->next_tag() ) {
            if ( 'DIV' !== $processor->get_tag() ) {
                continue;
            }

            $class_attr = (string) $processor->get_attribute( 'class' );
            if ( false === strpos( $class_attr, 'wp-block-button' ) ) {
                continue;
            }

            $wrapper_found = true;
            $tokens = preg_split( '/\s+/', trim( $class_attr ) );
            $kept_tokens = [];

            foreach ( $tokens as $token ) {
                $token = trim( (string) $token );
                if ( '' === $token ) {
                    continue;
                }

                if ( self::is_core_button_wrapper_structural_class( $token ) ) {
                    $kept_tokens[] = $token;
                    continue;
                }

                $transfer_tokens[] = $token;
            }

            $processor->set_attribute( 'class', implode( ' ', array_values( array_unique( $kept_tokens ) ) ) );
            break;
        }

        if ( ! $wrapper_found ) {
            return $html;
        }

        $normalized_html = $processor->get_updated_html();
        $transfer_classes = implode( ' ', array_values( array_unique( $transfer_tokens ) ) );
        if ( '' === trim( $transfer_classes ) ) {
            return $normalized_html;
        }

        return self::apply_tailwind_classes_to_matching_tags(
            $normalized_html,
            $transfer_classes,
            [],
            static function ( $tag, $inner_processor ) {
                if ( 'A' !== $tag && 'BUTTON' !== $tag ) {
                    return false;
                }

                if ( 'A' === $tag ) {
                    $class_attr = (string) $inner_processor->get_attribute( 'class' );
                    if ( false !== strpos( $class_attr, 'wp-block-button__link' ) ) {
                        return true;
                    }
                }

                return true;
            },
            1
        );
    }

    /**
     * Wrapper classes that should remain on core/button outer container.
     */
    private static function is_core_button_wrapper_structural_class( $class_name ) {
        $class_name = trim( (string) $class_name );
        if ( '' === $class_name ) {
            return true;
        }

        if ( 0 === strpos( $class_name, 'wp-block-button' ) ) {
            return true;
        }

        if ( 0 === strpos( $class_name, 'is-layout-' ) ) {
            return true;
        }

        if ( 0 === strpos( $class_name, 'align' ) ) {
            return true;
        }

        if ( 0 === strpos( $class_name, 'has-custom-' ) ) {
            return true;
        }

        return false;
    }

    /**
     * Keep Gutenberg user-set controls ahead of normal Tailwind utilities.
     */
    private static function filter_tailwind_classes_for_gutenberg_attrs( $class_names, $attrs, $block_name = '' ) {
        $blocked = self::get_blocked_tailwind_classes( $class_names, $attrs, $block_name );
        if ( empty( $blocked ) ) {
            return TWGB_Renderer::sanitize_classes( (string) $class_names );
        }

        $blocked_lookup = array_flip( $blocked );
        $tokens = preg_split( '/\s+/', trim( TWGB_Renderer::sanitize_classes( (string) $class_names ) ) );
        $allowed = [];

        foreach ( $tokens as $token ) {
            if ( '' === $token || isset( $blocked_lookup[ $token ] ) ) {
                continue;
            }
            $allowed[] = $token;
        }

        return implode( ' ', array_values( array_unique( $allowed ) ) );
    }

    /**
     * Return non-important TWGB tokens that conflict with user-set Gutenberg controls.
     */
    private static function get_blocked_tailwind_classes( $class_names, $attrs, $block_name = '' ) {
        $groups = self::get_gutenberg_user_conflict_groups( $attrs, $block_name );
        if ( empty( $groups ) ) {
            return [];
        }

        $tokens = preg_split( '/\s+/', trim( TWGB_Renderer::sanitize_classes( (string) $class_names ) ) );
        $blocked = [];

        foreach ( $tokens as $token ) {
            if ( '' === $token || self::is_important_tailwind_token( $token ) ) {
                continue;
            }

            $group = self::classify_tailwind_conflict_group( $token );
            if ( '' !== $group && ! empty( $groups[ $group ] ) ) {
                $blocked[] = $token;
            }
        }

        return array_values( array_unique( $blocked ) );
    }

    /**
     * Identify Gutenberg controls that were saved as actual block attributes.
     */
    private static function get_gutenberg_user_conflict_groups( $attrs, $block_name = '' ) {
        $attrs = is_array( $attrs ) ? $attrs : [];
        $groups = [];

        if (
            self::is_non_empty_user_value( $attrs['textColor'] ?? null ) ||
            self::is_non_empty_user_value( self::array_path( $attrs, [ 'style', 'color', 'text' ] ) )
        ) {
            $groups['textColor'] = true;
        }

        if (
            self::is_non_empty_user_value( $attrs['backgroundColor'] ?? null ) ||
            self::is_non_empty_user_value( $attrs['gradient'] ?? null ) ||
            self::is_non_empty_user_value( self::array_path( $attrs, [ 'style', 'color', 'background' ] ) ) ||
            self::is_non_empty_user_value( self::array_path( $attrs, [ 'style', 'color', 'gradient' ] ) )
        ) {
            $groups['backgroundColor'] = true;
        }

        if (
            self::is_non_empty_user_value( $attrs['fontSize'] ?? null ) ||
            self::is_non_empty_user_value( self::array_path( $attrs, [ 'style', 'typography', 'fontSize' ] ) )
        ) {
            $groups['fontSize'] = true;
        }

        $align = isset( $attrs['align'] ) ? (string) $attrs['align'] : '';
        if (
            self::is_non_empty_user_value( $attrs['textAlign'] ?? null ) ||
            ( self::block_uses_align_as_text_align( $block_name ) && preg_match( '/^(left|center|right|justify|start|end)$/', $align ) )
        ) {
            $groups['textAlign'] = true;
        }

        if ( self::is_non_empty_user_value( self::array_path( $attrs, [ 'style', 'spacing', 'padding' ] ) ) ) {
            $groups['padding'] = true;
        }

        if ( self::is_non_empty_user_value( self::array_path( $attrs, [ 'style', 'spacing', 'margin' ] ) ) ) {
            $groups['margin'] = true;
        }

        if ( self::is_non_empty_user_value( self::array_path( $attrs, [ 'style', 'spacing', 'blockGap' ] ) ) ) {
            $groups['gap'] = true;
        }

        if ( self::is_non_empty_user_value( self::array_path( $attrs, [ 'style', 'border', 'radius' ] ) ) ) {
            $groups['borderRadius'] = true;
        }

        return $groups;
    }

    private static function array_path( $source, $path ) {
        $current = $source;
        foreach ( $path as $key ) {
            if ( ! is_array( $current ) || ! array_key_exists( $key, $current ) ) {
                return null;
            }
            $current = $current[ $key ];
        }
        return $current;
    }

    private static function is_non_empty_user_value( $value ) {
        if ( null === $value ) {
            return false;
        }
        if ( is_string( $value ) ) {
            return '' !== trim( $value );
        }
        if ( is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
            return true;
        }
        if ( is_array( $value ) ) {
            foreach ( $value as $item ) {
                if ( self::is_non_empty_user_value( $item ) ) {
                    return true;
                }
            }
            return false;
        }
        return false;
    }

    private static function block_uses_align_as_text_align( $block_name ) {
        return in_array(
            (string) $block_name,
            [
                'core/paragraph',
                'core/heading',
                'core/list',
                'core/list-item',
                'core/quote',
                'core/pullquote',
                'core/verse',
                'core/preformatted',
            ],
            true
        );
    }

    private static function get_tailwind_utility_part( $token ) {
        $token = trim( (string) $token );
        if ( '' === $token ) {
            return '';
        }

        $depth = 0;
        $last_separator = -1;
        $length = strlen( $token );

        for ( $i = 0; $i < $length; $i++ ) {
            $char = $token[ $i ];
            if ( '[' === $char ) {
                $depth++;
            } elseif ( ']' === $char && $depth > 0 ) {
                $depth--;
            } elseif ( ':' === $char && 0 === $depth ) {
                $last_separator = $i;
            }
        }

        return $last_separator >= 0 ? substr( $token, $last_separator + 1 ) : $token;
    }

    private static function is_important_tailwind_token( $token ) {
        $token = trim( (string) $token );
        $utility = self::get_tailwind_utility_part( $token );
        return (
            '' !== $token && '!' === $token[0]
        ) || (
            '' !== $utility && ( '!' === $utility[0] || '!' === substr( $utility, -1 ) )
        );
    }

    private static function normalize_tailwind_utility_part( $token ) {
        $utility = self::get_tailwind_utility_part( $token );
        if ( '' !== $utility && '!' === $utility[0] ) {
            $utility = substr( $utility, 1 );
        }
        if ( '' !== $utility && '!' === substr( $utility, -1 ) ) {
            $utility = substr( $utility, 0, -1 );
        }
        return $utility;
    }

    private static function classify_tailwind_conflict_group( $token ) {
        $utility = self::normalize_tailwind_utility_part( $token );

        if ( preg_match( '/^-?(?:p|px|py|pt|pr|pb|pl|ps|pe)-/', $utility ) ) {
            return 'padding';
        }
        if ( preg_match( '/^-?(?:m|mx|my|mt|mr|mb|ml|ms|me)-/', $utility ) ) {
            return 'margin';
        }
        if ( preg_match( '/^gap(?:-[xy])?-/', $utility ) ) {
            return 'gap';
        }
        if ( preg_match( '/^rounded(?:-|$)/', $utility ) ) {
            return 'borderRadius';
        }
        if ( preg_match( '/^text-(left|center|right|justify|start|end)$/', $utility ) ) {
            return 'textAlign';
        }
        if ( preg_match( '/^text-(.+)$/', $utility, $m ) ) {
            $font_sizes = [ 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl' ];
            if ( in_array( $m[1], $font_sizes, true ) || self::is_tailwind_length_value( $m[1] ) ) {
                return 'fontSize';
            }
            return 'textColor';
        }
        if ( self::is_background_color_utility( $utility ) ) {
            return 'backgroundColor';
        }

        return '';
    }

    private static function is_tailwind_length_value( $value ) {
        $value = (string) $value;
        if ( preg_match( '/^\[(.+)\]$/', $value, $m ) ) {
            $value = $m[1];
        }
        return (bool) (
            preg_match( '/^-?\d*\.?\d+(px|rem|em|%|vw|vh|svw|svh|lvw|lvh|dvw|dvh|ch|ex|lh|rlh)$/', $value ) ||
            preg_match( '/^(calc|clamp|min|max)\(/', $value )
        );
    }

    private static function is_background_color_utility( $utility ) {
        if ( 0 !== strpos( $utility, 'bg-' ) ) {
            return false;
        }

        $value = substr( $utility, 3 );
        if ( preg_match( '/^\[(url|image|position|size|length):/i', $value ) || preg_match( '/^\[url\(/i', $value ) ) {
            return false;
        }

        return ! (bool) preg_match(
            '/^(auto|cover|contain|fixed|local|scroll|center|top|bottom|left|right|no-repeat|repeat|repeat-x|repeat-y|repeat-round|repeat-space|clip-|origin-|blend-)/',
            $value
        );
    }

    private static function remove_class_names( $existing, $remove ) {
        if ( empty( $remove ) ) {
            return trim( (string) $existing );
        }

        $remove_lookup = array_flip( $remove );
        $tokens = preg_split( '/\s+/', trim( (string) $existing ) );
        $kept = [];

        foreach ( $tokens as $token ) {
            if ( '' === $token || isset( $remove_lookup[ $token ] ) ) {
                continue;
            }
            $kept[] = $token;
        }

        return implode( ' ', $kept );
    }

    /**
     * Read and sanitize the Tailwind attribute payload.
     */
    private static function get_tailwind_attribute( $attrs ) {
        if ( ! is_array( $attrs ) ) {
            return [];
        }

        if ( ! isset( $attrs[ self::TAILWIND_ATTRIBUTE ] ) || ! is_array( $attrs[ self::TAILWIND_ATTRIBUTE ] ) ) {
            return [];
        }

        $tailwind = $attrs[ self::TAILWIND_ATTRIBUTE ];
        if ( isset( $tailwind['cx'] ) ) {
            $tailwind['cx'] = TWGB_Renderer::sanitize_classes( (string) $tailwind['cx'] );
        }

        return $tailwind;
    }

    /**
     * Deduplicate classes while preserving order.
     */
    private static function merge_class_names( $existing, $extra ) {
        $classes = array_filter( preg_split( '/\s+/', trim( (string) $existing . ' ' . (string) $extra ) ) );
        if ( empty( $classes ) ) {
            return '';
        }

        return implode( ' ', array_values( array_unique( $classes ) ) );
    }

    public static function register_rest_routes() {
        register_rest_route( 'twgb/v1', '/parse', [
            'methods'             => 'POST',
            'callback'            => [ 'TWGB_Parser', 'rest_parse' ],
            'permission_callback' => function () {
                return current_user_can( 'edit_posts' );
            },
        ] );

        register_rest_route( 'twgb/v1', '/save-post-css', [
            'methods'             => 'POST',
            'callback'            => [ __CLASS__, 'rest_save_post_css' ],
            'permission_callback' => function ( $request ) {
                $post_id = absint( $request->get_param( 'postId' ) );
                return $post_id > 0 && current_user_can( 'edit_post', $post_id );
            },
        ] );
    }
}
