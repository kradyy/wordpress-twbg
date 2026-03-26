<?php
/**
 * Server-side render for tw-button.
 */

$tag     = in_array( $attributes['tag'] ?? 'a', [ 'a', 'button' ], true ) ? $attributes['tag'] : 'a';
$classes = TWGB_Renderer::sanitize_classes( $attributes['twClasses'] ?? '' );
$text    = wp_kses_post( $attributes['content'] ?? 'Click me' );
$href    = esc_url( $attributes['href'] ?? '' );
$anchor  = ! empty( $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';

if ( $tag === 'a' && ! empty( $href ) ) {
    printf(
        '<a href="%1$s" class="%2$s"%3$s>%4$s</a>',
        $href,
        esc_attr( $classes ),
        $anchor,
        $text
    );
} else {
    printf(
        '<button class="%1$s"%2$s>%3$s</button>',
        esc_attr( $classes ),
        $anchor,
        $text
    );
}
