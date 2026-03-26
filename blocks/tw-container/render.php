<?php
/**
 * Server-side render for tw-container.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 */

$tag     = in_array( $attributes['tag'] ?? 'div', [ 'div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav' ], true )
    ? $attributes['tag']
    : 'div';
$classes = TWGB_Renderer::sanitize_classes( $attributes['twClasses'] ?? '' );
$anchor  = ! empty( $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';

// Add WordPress alignment class if set.
$align = $attributes['align'] ?? '';
if ( $align ) {
    $classes = 'align' . esc_attr( $align ) . ( $classes ? ' ' . $classes : '' );
}

printf(
    '<%1$s class="%2$s"%3$s>%4$s</%1$s>',
    $tag,
    esc_attr( $classes ),
    $anchor,
    $content
);
