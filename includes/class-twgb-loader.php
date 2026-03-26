<?php
/**
 * Plugin loader – registers blocks, assets, and REST endpoints.
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

    public static function editor_assets() {
        // Tailwind Play CDN for editor preview.
        // Only load if WindPress is NOT active (WindPress handles its own Tailwind).
        if ( ! class_exists( 'WindPress\\Plugin' ) && ! defined( 'JETSTYLUS_VER' ) ) {
            wp_enqueue_script(
                'twgb-tailwind-cdn',
                'https://cdn.tailwindcss.com/3.4.17',
                [],
                null,
                false
            );
        }

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

    public static function frontend_assets() {
        // Only load assets on pages that use our blocks.
        if ( has_block( 'twgb/tw-container' ) ||
             has_block( 'twgb/tw-text' ) ||
             has_block( 'twgb/tw-image' ) ||
             has_block( 'twgb/tw-button' ) ||
             has_block( 'twgb/tw-grid' ) ||
             has_block( 'twgb/tw-flex' ) ) {

            // Tailwind CDN (dev only – production should use WindPress or a purged build).
            // Only load if WindPress is NOT active.
            if ( ! class_exists( 'WindPress\\Plugin' ) && ! defined( 'JETSTYLUS_VER' ) ) {
                wp_enqueue_script(
                    'twgb-tailwind-cdn-front',
                    'https://cdn.tailwindcss.com/3.4.17',
                    [],
                    null,
                    false
                );
            }

            // Frontend layout fixes (alignfull support, reset margins).
            wp_enqueue_style(
                'twgb-frontend-style',
                TWGB_URL . 'assets/css/twgb-frontend.css',
                [],
                TWGB_VERSION
            );
        }
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
