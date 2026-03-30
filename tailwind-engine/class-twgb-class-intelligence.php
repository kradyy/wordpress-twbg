<?php
/**
 * Tailwind Class Intelligence – parses and generates Tailwind utility classes.
 */
class TWGB_Class_Intelligence {

    /**
     * Breakpoint prefixes in order.
     */
    const BREAKPOINTS = [ 'base', 'sm', 'md', 'lg', 'xl', '2xl' ];

    /**
     * Mapping of attribute keys to Tailwind class patterns.
     */
    private static $property_map = [
        'paddingX'      => 'px',
        'paddingY'      => 'py',
        'padding'       => 'p',
        'paddingTop'    => 'pt',
        'paddingRight'  => 'pr',
        'paddingBottom' => 'pb',
        'paddingLeft'   => 'pl',
        'marginX'       => 'mx',
        'marginY'       => 'my',
        'margin'        => 'm',
        'marginTop'     => 'mt',
        'marginRight'   => 'mr',
        'marginBottom'  => 'mb',
        'marginLeft'    => 'ml',
        'gap'           => 'gap',
        'gapX'          => 'gap-x',
        'gapY'          => 'gap-y',
        'fontSize'      => 'text',
        'fontWeight'    => 'font',
        'textAlign'     => 'text',
        'textColor'     => 'text',
        'bgColor'       => 'bg',
        'borderRadius'  => 'rounded',
        'width'         => 'w',
        'height'        => 'h',
        'maxWidth'      => 'max-w',
        'display'       => '',
        'flexDirection' => 'flex',
        'gridCols'      => 'grid-cols',
        'justifyContent'=> 'justify',
        'alignItems'    => 'items',
        'hidden'        => 'hidden',
    ];

    /**
     * Parse a class string into structured responsive attributes.
     *
     * Input:  "px-4 md:px-8 flex md:flex-row gap-4 lg:gap-8"
     * Output: [
     *   'paddingX'      => [ 'base' => '4', 'md' => '8' ],
     *   'display'       => [ 'base' => 'flex' ],
     *   'flexDirection' => [ 'md' => 'row' ],
     *   'gap'           => [ 'base' => '4', 'lg' => '8' ],
     * ]
     */
    public static function parse_classes( $class_string ) {
        $classes = preg_split( '/\s+/', trim( $class_string ) );
        $attrs   = [];
        $raw     = []; // classes we can't parse go here

        foreach ( $classes as $cls ) {
            $parsed = self::parse_single_class( $cls );
            if ( $parsed ) {
                $key = $parsed['attribute'];
                if ( ! isset( $attrs[ $key ] ) ) {
                    $attrs[ $key ] = [];
                }
                $attrs[ $key ][ $parsed['breakpoint'] ] = $parsed['value'];
            } else {
                $raw[] = $cls;
            }
        }

        if ( ! empty( $raw ) ) {
            $attrs['_raw'] = $raw;
        }

        return $attrs;
    }

    /**
     * Parse a single Tailwind class.
     *
     * @return array|null  { attribute, breakpoint, value }
     */
    public static function parse_single_class( $cls ) {
        $breakpoint = 'base';
        $utility    = $cls;

        // Check for breakpoint prefix.
        if ( preg_match( '/^(sm|md|lg|xl|2xl):(.+)$/', $cls, $m ) ) {
            $breakpoint = $m[1];
            $utility    = $m[2];
        }

        // Display utilities.
        $display_values = [ 'block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden', 'table' ];
        if ( in_array( $utility, $display_values, true ) ) {
            return [ 'attribute' => 'display', 'breakpoint' => $breakpoint, 'value' => $utility ];
        }

        // Flex direction.
        $flex_dirs = [ 'flex-row' => 'row', 'flex-col' => 'col', 'flex-row-reverse' => 'row-reverse', 'flex-col-reverse' => 'col-reverse' ];
        if ( isset( $flex_dirs[ $utility ] ) ) {
            return [ 'attribute' => 'flexDirection', 'breakpoint' => $breakpoint, 'value' => $flex_dirs[ $utility ] ];
        }

        // Justify / align.
        if ( preg_match( '/^justify-(.+)$/', $utility, $m ) ) {
            return [ 'attribute' => 'justifyContent', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
        }
        if ( preg_match( '/^items-(.+)$/', $utility, $m ) ) {
            return [ 'attribute' => 'alignItems', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
        }

        // Spacing: p, px, py, pt, pr, pb, pl, m, mx, my, mt, mr, mb, ml.
        $spacing_map = [
            'px' => 'paddingX', 'py' => 'paddingY', 'pt' => 'paddingTop',
            'pr' => 'paddingRight', 'pb' => 'paddingBottom', 'pl' => 'paddingLeft',
            'p'  => 'padding',
            'mx' => 'marginX', 'my' => 'marginY', 'mt' => 'marginTop',
            'mr' => 'marginRight', 'mb' => 'marginBottom', 'ml' => 'marginLeft',
            'm'  => 'margin',
        ];
        if ( preg_match( '/^(px|py|pt|pr|pb|pl|p|mx|my|mt|mr|mb|ml|m)-(.+)$/', $utility, $m ) ) {
            $attr = $spacing_map[ $m[1] ] ?? null;
            if ( $attr ) {
                return [ 'attribute' => $attr, 'breakpoint' => $breakpoint, 'value' => $m[2] ];
            }
        }

        // Gap.
        if ( preg_match( '/^gap-x-(.+)$/', $utility, $m ) ) {
            return [ 'attribute' => 'gapX', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
        }
        if ( preg_match( '/^gap-y-(.+)$/', $utility, $m ) ) {
            return [ 'attribute' => 'gapY', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
        }
        if ( preg_match( '/^gap-(.+)$/', $utility, $m ) ) {
            return [ 'attribute' => 'gap', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
        }

        // Grid cols.
        if ( preg_match( '/^grid-cols-(.+)$/', $utility, $m ) ) {
            return [ 'attribute' => 'gridCols', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
        }

        // Typography.
        $font_sizes = [ 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl' ];
        if ( preg_match( '/^text-(.+)$/', $utility, $m ) ) {
            if ( preg_match( '/^\[-?\d*\.?\d+(px|rem|em|%)\]$/', $m[1] ) ) {
                return [ 'attribute' => 'fontSize', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
            }
            if ( in_array( $m[1], $font_sizes, true ) ) {
                return [ 'attribute' => 'fontSize', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
            }
            $align_vals = [ 'left', 'center', 'right', 'justify', 'start', 'end' ];
            if ( in_array( $m[1], $align_vals, true ) ) {
                return [ 'attribute' => 'textAlign', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
            }
            // Color.
            return [ 'attribute' => 'textColor', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
        }

        $font_weights = [
            'font-thin' => 'thin', 'font-extralight' => 'extralight', 'font-light' => 'light',
            'font-normal' => 'normal', 'font-medium' => 'medium', 'font-semibold' => 'semibold',
            'font-bold' => 'bold', 'font-extrabold' => 'extrabold', 'font-black' => 'black',
        ];
        if ( isset( $font_weights[ $utility ] ) ) {
            return [ 'attribute' => 'fontWeight', 'breakpoint' => $breakpoint, 'value' => $font_weights[ $utility ] ];
        }

        // Background color.
        if ( preg_match( '/^bg-(.+)$/', $utility, $m ) ) {
            return [ 'attribute' => 'bgColor', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
        }

        // Border radius.
        if ( preg_match( '/^rounded(?:-(.+))?$/', $utility, $m ) ) {
            $val = isset( $m[1] ) ? $m[1] : 'DEFAULT';
            return [ 'attribute' => 'borderRadius', 'breakpoint' => $breakpoint, 'value' => $val ];
        }

        // Width / height.
        if ( preg_match( '/^w-(.+)$/', $utility, $m ) ) {
            return [ 'attribute' => 'width', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
        }
        if ( preg_match( '/^h-(.+)$/', $utility, $m ) ) {
            return [ 'attribute' => 'height', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
        }
        if ( preg_match( '/^max-w-(.+)$/', $utility, $m ) ) {
            return [ 'attribute' => 'maxWidth', 'breakpoint' => $breakpoint, 'value' => $m[1] ];
        }

        return null;
    }

    /**
     * Convert structured attributes back into a Tailwind class string.
     */
    public static function attributes_to_classes( $attrs ) {
        $classes = [];

        foreach ( $attrs as $key => $responsive_values ) {
            if ( $key === '_raw' ) {
                $classes = array_merge( $classes, $responsive_values );
                continue;
            }

            foreach ( $responsive_values as $bp => $value ) {
                $prefix = ( $bp === 'base' ) ? '' : $bp . ':';
                $cls    = self::generate_class( $key, $value );
                if ( $cls ) {
                    $classes[] = $prefix . $cls;
                }
            }
        }

        return implode( ' ', $classes );
    }

    /**
     * Generate a single Tailwind class from attribute + value.
     */
    private static function generate_class( $attribute, $value ) {
        // Display is its own class.
        if ( $attribute === 'display' ) {
            return $value;
        }

        // Flex direction.
        if ( $attribute === 'flexDirection' ) {
            return 'flex-' . $value;
        }

        // Justify / align.
        if ( $attribute === 'justifyContent' ) {
            return 'justify-' . $value;
        }
        if ( $attribute === 'alignItems' ) {
            return 'items-' . $value;
        }

        // Font weight.
        if ( $attribute === 'fontWeight' ) {
            return 'font-' . $value;
        }

        // Grid cols.
        if ( $attribute === 'gridCols' ) {
            return 'grid-cols-' . $value;
        }

        // Border radius.
        if ( $attribute === 'borderRadius' ) {
            return $value === 'DEFAULT' ? 'rounded' : 'rounded-' . $value;
        }

        // Spacing, gap, text, bg, w, h, max-w.
        $prefix_map = [
            'paddingX' => 'px', 'paddingY' => 'py', 'paddingTop' => 'pt',
            'paddingRight' => 'pr', 'paddingBottom' => 'pb', 'paddingLeft' => 'pl',
            'padding' => 'p',
            'marginX' => 'mx', 'marginY' => 'my', 'marginTop' => 'mt',
            'marginRight' => 'mr', 'marginBottom' => 'mb', 'marginLeft' => 'ml',
            'margin' => 'm',
            'gap' => 'gap', 'gapX' => 'gap-x', 'gapY' => 'gap-y',
            'fontSize' => 'text', 'textAlign' => 'text', 'textColor' => 'text',
            'bgColor' => 'bg',
            'width' => 'w', 'height' => 'h', 'maxWidth' => 'max-w',
        ];

        $prefix = $prefix_map[ $attribute ] ?? null;
        if ( $prefix ) {
            return $prefix . '-' . $value;
        }

        return null;
    }
}
