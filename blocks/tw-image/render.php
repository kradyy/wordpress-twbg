<?php
/**
 * Server-side render for tw-image.
 */

$src     = esc_url( $attributes['src'] ?? '' );
$alt     = esc_attr( $attributes['alt'] ?? '' );
$classes = TWGB_Renderer::sanitize_classes( $attributes['twClasses'] ?? '' );
$anchor  = ! empty( $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';

if ( ! empty( $src ) ) {
    printf(
        '<img src="%1$s" alt="%2$s" class="%3$s"%4$s />',
        $src,
        $alt,
        esc_attr( $classes ),
        $anchor
    );
}
