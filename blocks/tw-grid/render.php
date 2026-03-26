<?php
/**
 * Server-side render for tw-grid.
 */

$classes = TWGB_Renderer::sanitize_classes( $attributes['twClasses'] ?? 'grid' );
$anchor  = ! empty( $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';

$align = $attributes['align'] ?? '';
if ( $align ) {
    $classes = 'align' . esc_attr( $align ) . ( $classes ? ' ' . $classes : '' );
}

printf(
    '<div class="%1$s"%2$s>%3$s</div>',
    esc_attr( $classes ),
    $anchor,
    $content
);
