<?php
/**
 * Server-side render for tw-text.
 */

$tag     = in_array( $attributes['tag'] ?? 'p', [ 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'blockquote' ], true )
    ? $attributes['tag']
    : 'p';
$classes = TWGB_Renderer::sanitize_classes( $attributes['twClasses'] ?? '' );
$content_text = wp_kses_post( $attributes['content'] ?? '' );
$anchor  = ! empty( $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';

if ( ! empty( $content_text ) ) {
    printf(
        '<%1$s class="%2$s"%3$s>%4$s</%1$s>',
        $tag,
        esc_attr( $classes ),
        $anchor,
        $content_text
    );
}
