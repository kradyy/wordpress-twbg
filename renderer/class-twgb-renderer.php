<?php
/**
 * Renderer utilities shared by all block render.php files.
 */
class TWGB_Renderer {

    /**
     * Build an HTML attributes string from an associative array.
     */
    public static function attrs( array $attrs ) {
        $parts = [];
        foreach ( $attrs as $key => $value ) {
            if ( $value === null || $value === false ) {
                continue;
            }
            if ( $value === true ) {
                $parts[] = esc_attr( $key );
            } else {
                $parts[] = esc_attr( $key ) . '="' . esc_attr( $value ) . '"';
            }
        }
        return implode( ' ', $parts );
    }

    /**
     * Merge user classes with any dynamically computed responsive classes.
     */
    public static function merge_classes( $base_classes, $responsive_attrs = [] ) {
        $extra = '';
        if ( ! empty( $responsive_attrs ) && is_array( $responsive_attrs ) ) {
            $extra = TWGB_Class_Intelligence::attributes_to_classes( $responsive_attrs );
        }
        return trim( $base_classes . ' ' . $extra );
    }

    /**
     * Sanitize Tailwind class string – allow only safe characters.
     */
    public static function sanitize_classes( $classes ) {
        // Tailwind classes are alphanumeric, hyphens, colons (breakpoints), slashes (fractions), dots, brackets.
        return preg_replace( '/[^a-zA-Z0-9\s\-_:\/\.\[\]#%,]/', '', $classes );
    }

    /**
     * Sanitize inline SVG markup while preserving common SVG elements/attributes.
     */
    public static function sanitize_svg_markup( $svg ) {
        if ( ! is_string( $svg ) || '' === trim( $svg ) ) {
            return '';
        }

        $allowed = [
            'svg'          => self::svg_common_attrs(),
            'g'            => self::svg_common_attrs(),
            'path'         => self::svg_common_attrs(),
            'rect'         => self::svg_common_attrs(),
            'circle'       => self::svg_common_attrs(),
            'ellipse'      => self::svg_common_attrs(),
            'line'         => self::svg_common_attrs(),
            'polyline'     => self::svg_common_attrs(),
            'polygon'      => self::svg_common_attrs(),
            'defs'         => self::svg_common_attrs(),
            'clippath'     => self::svg_common_attrs(),
            'mask'         => self::svg_common_attrs(),
            'symbol'       => self::svg_common_attrs(),
            'use'          => self::svg_common_attrs(),
            'title'        => [],
            'desc'         => [],
            'lineargradient' => self::svg_common_attrs(),
            'radialgradient' => self::svg_common_attrs(),
            'stop'         => self::svg_common_attrs(),
            'pattern'      => self::svg_common_attrs(),
        ];

        return wp_kses( $svg, $allowed );
    }

    /**
     * Add Tailwind classes to the root <svg>.
     */
    public static function apply_classes_to_svg( $svg, $classes ) {
        $classes = trim( (string) self::sanitize_classes( $classes ) );
        if ( '' === $classes || '' === trim( (string) $svg ) ) {
            return $svg;
        }

        $escaped_classes = esc_attr( $classes );

        if ( preg_match( '/<svg\b[^>]*\bclass=(["\'])(.*?)\1/i', $svg ) ) {
            return preg_replace_callback(
                '/<svg\b([^>]*?)\bclass=(["\'])(.*?)\2([^>]*)>/i',
                function ( $m ) use ( $escaped_classes ) {
                    $merged = trim( $m[3] . ' ' . $escaped_classes );
                    return '<svg' . $m[1] . 'class="' . esc_attr( $merged ) . '"' . $m[4] . '>';
                },
                $svg,
                1
            );
        }

        return preg_replace( '/<svg\b/i', '<svg class="' . $escaped_classes . '"', $svg, 1 );
    }

    /**
     * Add/update an attribute on the root <svg>.
     */
    public static function apply_svg_root_attr( $svg, $attr, $value ) {
        $attr  = trim( (string) $attr );
        $value = trim( (string) $value );
        if ( '' === $attr || '' === $value || '' === trim( (string) $svg ) ) {
            return $svg;
        }

        $safe_attr  = preg_replace( '/[^a-zA-Z0-9_\-:]/', '', $attr );
        $safe_value = esc_attr( $value );

        if ( preg_match( '/<svg\b[^>]*\b' . preg_quote( $safe_attr, '/' ) . '=(["\'])(.*?)\1/i', $svg ) ) {
            return preg_replace(
                '/<svg\b([^>]*?)\b' . preg_quote( $safe_attr, '/' ) . '=(["\'])(.*?)\2([^>]*)>/i',
                '<svg$1' . $safe_attr . '="' . $safe_value . '"$4>',
                $svg,
                1
            );
        }

        return preg_replace( '/<svg\b/i', '<svg ' . $safe_attr . '="' . $safe_value . '"', $svg, 1 );
    }

    /**
     * Shared attribute allow-list for SVG nodes.
     */
    private static function svg_common_attrs() {
        return [
            'id'                => true,
            'class'             => true,
            'viewBox'           => true,
            'viewbox'           => true,
            'width'             => true,
            'height'            => true,
            'x'                 => true,
            'y'                 => true,
            'cx'                => true,
            'cy'                => true,
            'r'                 => true,
            'rx'                => true,
            'ry'                => true,
            'x1'                => true,
            'y1'                => true,
            'x2'                => true,
            'y2'                => true,
            'd'                 => true,
            'points'            => true,
            'fill'              => true,
            'fill-opacity'      => true,
            'fill-rule'         => true,
            'clip-rule'         => true,
            'stroke'            => true,
            'stroke-width'      => true,
            'stroke-opacity'    => true,
            'stroke-linecap'    => true,
            'stroke-linejoin'   => true,
            'stroke-miterlimit' => true,
            'stroke-dasharray'  => true,
            'stroke-dashoffset' => true,
            'opacity'           => true,
            'transform'         => true,
            'clip-path'         => true,
            'mask'              => true,
            'href'              => true,
            'xlink:href'        => true,
            'xmlns'             => true,
            'xmlns:xlink'       => true,
            'preserveAspectRatio' => true,
            'preserveaspectratio' => true,
            'role'              => true,
            'aria-hidden'       => true,
            'aria-label'        => true,
            'aria-labelledby'   => true,
            'aria-describedby'  => true,
            'focusable'         => true,
            'style'             => true,
        ];
    }
}
