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
        return preg_replace( '/[^a-zA-Z0-9\s\-_:\/\.\[\]#%]/', '', $classes );
    }
}
