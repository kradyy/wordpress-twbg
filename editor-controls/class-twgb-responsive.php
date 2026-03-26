<?php
/**
 * Responsive breakpoint helper for editor controls.
 */
class TWGB_Responsive {

    const BREAKPOINTS = [
        'base' => [ 'label' => 'Base', 'icon' => 'smartphone', 'min' => 0 ],
        'sm'   => [ 'label' => 'SM',   'icon' => 'smartphone', 'min' => 640 ],
        'md'   => [ 'label' => 'MD',   'icon' => 'tablet',     'min' => 768 ],
        'lg'   => [ 'label' => 'LG',   'icon' => 'laptop',     'min' => 1024 ],
        'xl'   => [ 'label' => 'XL',   'icon' => 'desktop',    'min' => 1280 ],
        '2xl'  => [ 'label' => '2XL',  'icon' => 'desktop',    'min' => 1536 ],
    ];

    /**
     * Get breakpoint config for JS.
     */
    public static function get_config() {
        return self::BREAKPOINTS;
    }
}
