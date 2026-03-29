<?php
/**
 * Plugin Name: Tailwind Gutenberg Bridge
 * Description: Lightweight system to convert Tailwind HTML into clean Gutenberg blocks with responsive controls.
 * Version: 1.0.0
 * Author: Developer
 * Text Domain: tw-gutenberg-bridge
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

defined( 'ABSPATH' ) || exit;

define( 'TWGB_VERSION', '1.0.0' );
define( 'TWGB_PATH', plugin_dir_path( __FILE__ ) );
define( 'TWGB_URL', plugin_dir_url( __FILE__ ) );

// Core includes.
require_once TWGB_PATH . 'includes/class-twgb-loader.php';
require_once TWGB_PATH . 'parser/class-twgb-parser.php';
require_once TWGB_PATH . 'renderer/class-twgb-renderer.php';
require_once TWGB_PATH . 'tailwind-engine/class-twgb-class-intelligence.php';
require_once TWGB_PATH . 'editor-controls/class-twgb-responsive.php';

// Patterns.
require_once TWGB_PATH . 'patterns/class-twgb-patterns.php';

// Boot the plugin.
add_action( 'init', [ 'TWGB_Loader', 'init' ] );
add_action( 'init', [ 'TWGB_Patterns', 'register' ], 20 );
add_action( 'enqueue_block_editor_assets', [ 'TWGB_Loader', 'editor_assets' ] );
add_action( 'admin_init', [ 'TWGB_Loader', 'register_settings' ] );
add_action( 'admin_menu', [ 'TWGB_Loader', 'register_settings_page' ] );
add_action( 'admin_head', [ 'TWGB_Loader', 'output_editor_jit' ], 1 );
add_filter( 'block_editor_settings_all', [ 'TWGB_Loader', 'inject_editor_iframe_assets' ], 20, 2 );
add_action( 'wp_head', [ 'TWGB_Loader', 'output_frontend_jit' ], 1 );
add_action( 'wp_enqueue_scripts', [ 'TWGB_Loader', 'frontend_assets' ] );
add_action( 'rest_api_init', [ 'TWGB_Loader', 'register_rest_routes' ] );

// Add body class when post uses our landing page blocks (hides theme chrome).
add_filter( 'body_class', function ( $classes ) {
    if ( is_singular() && has_block( 'twgb/tw-container' ) ) {
        $classes[] = 'twgb-landing-page';
    }
    return $classes;
} );
