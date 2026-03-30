<?php
/**
 * Server-side render for tw-svg.
 */

$svg       = TWGB_Renderer::sanitize_svg_markup( $attributes['svg'] ?? '' );
$classes   = TWGB_Renderer::sanitize_classes( $attributes['twClasses'] ?? '' );
$aria      = sanitize_text_field( $attributes['ariaLabel'] ?? '' );
$anchor_id = ! empty( $attributes['anchor'] ) ? sanitize_key( $attributes['anchor'] ) : '';

if ( '' === trim( $svg ) ) {
    return;
}

$svg = TWGB_Renderer::apply_classes_to_svg( $svg, $classes );

if ( '' !== $anchor_id ) {
    $svg = TWGB_Renderer::apply_svg_root_attr( $svg, 'id', $anchor_id );
}

if ( '' !== $aria ) {
    $svg = TWGB_Renderer::apply_svg_root_attr( $svg, 'role', 'img' );
    $svg = TWGB_Renderer::apply_svg_root_attr( $svg, 'aria-label', $aria );
} else {
    $svg = TWGB_Renderer::apply_svg_root_attr( $svg, 'aria-hidden', 'true' );
}

echo $svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
