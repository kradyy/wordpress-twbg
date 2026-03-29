/**
 * Shared Tailwind class parsing utilities for all TW blocks.
 * Loaded before individual block scripts.
 */
( function () {
    'use strict';

    // Class-to-attribute parser (client-side mirror of PHP TWGB_Class_Intelligence).
    var DISPLAY_VALUES = [ 'block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden', 'table' ];
    var FLEX_DIRS = { 'flex-row': 'row', 'flex-col': 'col', 'flex-row-reverse': 'row-reverse', 'flex-col-reverse': 'col-reverse' };
    var FONT_SIZES = [ 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl' ];
    var FONT_WEIGHTS = {
        'font-thin': 'thin', 'font-extralight': 'extralight', 'font-light': 'light',
        'font-normal': 'normal', 'font-medium': 'medium', 'font-semibold': 'semibold',
        'font-bold': 'bold', 'font-extrabold': 'extrabold', 'font-black': 'black',
    };
    var ALIGN_VALS = [ 'left', 'center', 'right', 'justify', 'start', 'end' ];
    var SPACING_MAP = {
        'px': 'paddingX', 'py': 'paddingY', 'pt': 'paddingTop',
        'pr': 'paddingRight', 'pb': 'paddingBottom', 'pl': 'paddingLeft',
        'p': 'padding',
        'mx': 'marginX', 'my': 'marginY', 'mt': 'marginTop',
        'mr': 'marginRight', 'mb': 'marginBottom', 'ml': 'marginLeft',
        'm': 'margin',
    };

    function parseSingleClass( cls ) {
        var bp = 'base';
        var utility = cls;
        var bpMatch = cls.match( /^(sm|md|lg|xl|2xl):(.+)$/ );
        if ( bpMatch ) { bp = bpMatch[1]; utility = bpMatch[2]; }

        // Display
        if ( DISPLAY_VALUES.indexOf( utility ) !== -1 ) return { attr: 'display', bp: bp, val: utility };

        // Flex direction
        if ( FLEX_DIRS[ utility ] ) return { attr: 'flexDirection', bp: bp, val: FLEX_DIRS[ utility ] };

        // Flex wrap
        if ( utility === 'flex-wrap' ) return { attr: 'flexWrap', bp: bp, val: 'wrap' };
        if ( utility === 'flex-nowrap' ) return { attr: 'flexWrap', bp: bp, val: 'nowrap' };
        if ( utility === 'flex-wrap-reverse' ) return { attr: 'flexWrap', bp: bp, val: 'wrap-reverse' };

        // Justify
        var justifyMatch = utility.match( /^justify-(.+)$/ );
        if ( justifyMatch ) return { attr: 'justifyContent', bp: bp, val: justifyMatch[1] };

        // Align items
        var itemsMatch = utility.match( /^items-(.+)$/ );
        if ( itemsMatch ) return { attr: 'alignItems', bp: bp, val: itemsMatch[1] };

        // Spacing
        var spacingMatch = utility.match( /^(px|py|pt|pr|pb|pl|p|mx|my|mt|mr|mb|ml|m)-(.+)$/ );
        if ( spacingMatch && SPACING_MAP[ spacingMatch[1] ] ) {
            return { attr: SPACING_MAP[ spacingMatch[1] ], bp: bp, val: spacingMatch[2] };
        }

        // Gap
        if ( utility.match( /^gap-x-(.+)$/ ) ) return { attr: 'gapX', bp: bp, val: utility.match( /^gap-x-(.+)$/ )[1] };
        if ( utility.match( /^gap-y-(.+)$/ ) ) return { attr: 'gapY', bp: bp, val: utility.match( /^gap-y-(.+)$/ )[1] };
        if ( utility.match( /^gap-(.+)$/ ) ) return { attr: 'gap', bp: bp, val: utility.match( /^gap-(.+)$/ )[1] };

        // Grid cols
        var gridMatch = utility.match( /^grid-cols-(.+)$/ );
        if ( gridMatch ) return { attr: 'gridCols', bp: bp, val: gridMatch[1] };

        // Font size
        var textMatch = utility.match( /^text-(.+)$/ );
        if ( textMatch ) {
            if ( FONT_SIZES.indexOf( textMatch[1] ) !== -1 ) return { attr: 'fontSize', bp: bp, val: textMatch[1] };
            if ( ALIGN_VALS.indexOf( textMatch[1] ) !== -1 ) return { attr: 'textAlign', bp: bp, val: textMatch[1] };
            return { attr: 'textColor', bp: bp, val: textMatch[1] };
        }

        // Font weight
        if ( FONT_WEIGHTS[ utility ] ) return { attr: 'fontWeight', bp: bp, val: FONT_WEIGHTS[ utility ] };

        // Background
        var bgMatch = utility.match( /^bg-(.+)$/ );
        if ( bgMatch ) return { attr: 'bgColor', bp: bp, val: bgMatch[1] };

        // Border radius
        var roundedMatch = utility.match( /^rounded(?:-(.+))?$/ );
        if ( roundedMatch ) return { attr: 'borderRadius', bp: bp, val: roundedMatch[1] || 'DEFAULT' };

        // Width / height / max-width
        var wMatch = utility.match( /^w-(.+)$/ );
        if ( wMatch ) return { attr: 'width', bp: bp, val: wMatch[1] };
        var hMatch = utility.match( /^h-(.+)$/ );
        if ( hMatch ) return { attr: 'height', bp: bp, val: hMatch[1] };
        var mwMatch = utility.match( /^max-w-(.+)$/ );
        if ( mwMatch ) return { attr: 'maxWidth', bp: bp, val: mwMatch[1] };

        return null;
    }

    /**
     * Parse a Tailwind class string into a responsiveAttrs object.
     * Returns { attrs: { ... }, raw: [ 'unparseable-class', ... ] }
     */
    function parseClasses( classString ) {
        var classes = ( classString || '' ).trim().split( /\s+/ ).filter( Boolean );
        var attrs = {};
        var raw = [];

        classes.forEach( function ( cls ) {
            var parsed = parseSingleClass( cls );
            if ( parsed ) {
                if ( ! attrs[ parsed.attr ] ) attrs[ parsed.attr ] = {};
                attrs[ parsed.attr ][ parsed.bp ] = parsed.val;
            } else {
                raw.push( cls );
            }
        } );

        if ( raw.length ) attrs._raw = raw;
        return attrs;
    }

    /**
     * Convert responsiveAttrs back into a Tailwind class string.
     */
    function attrsToClasses( attrs, attrToClassFn ) {
        var classes = [];
        Object.keys( attrs ).forEach( function ( key ) {
            if ( key === '_raw' ) {
                classes = classes.concat( attrs[ key ] );
                return;
            }
            var bpVals = attrs[ key ];
            Object.keys( bpVals ).forEach( function ( bp ) {
                var prefix = bp === 'base' ? '' : bp + ':';
                var cls = attrToClassFn( key, bpVals[ bp ] );
                if ( cls ) classes.push( prefix + cls );
            } );
        } );
        return classes.join( ' ' );
    }

    /**
     * Convert a Tailwind sizing token (e.g. "1/2", "64", "[420px]") to CSS value.
     */
    function tailwindSizeToCss( value, axis ) {
        if ( ! value ) {
            return '';
        }

        var arbitraryMatch = value.match( /^\[(.+)\]$/ );
        if ( arbitraryMatch ) {
            return arbitraryMatch[1];
        }

        var keywordMap = {
            auto: 'auto',
            full: '100%',
            min: 'min-content',
            max: 'max-content',
            fit: 'fit-content',
            screen: axis === 'height' ? '100vh' : '100vw',
        };
        if ( keywordMap[ value ] ) {
            return keywordMap[ value ];
        }

        var fractionMatch = value.match( /^(\d+)\/(\d+)$/ );
        if ( fractionMatch ) {
            var numerator = parseFloat( fractionMatch[1] );
            var denominator = parseFloat( fractionMatch[2] );
            if ( denominator > 0 ) {
                return ( ( numerator / denominator ) * 100 ) + '%';
            }
        }

        if ( /^-?\d+(?:\.\d+)?$/.test( value ) ) {
            // Tailwind spacing scale unit (1 => 0.25rem => 4px).
            return ( parseFloat( value ) * 4 ) + 'px';
        }

        if ( /^-?\d+(?:\.\d+)?(?:px|rem|em|%|vw|vh)$/.test( value ) ) {
            return value;
        }

        return '';
    }

    /**
     * Convert a pixel value to Tailwind arbitrary sizing token.
     */
    function pixelsToTailwindSize( px ) {
        var rounded = Math.max( 1, Math.round( Number( px ) || 0 ) );
        return '[' + rounded + 'px]';
    }

    // Expose globally for block scripts.
    window.twgbUtils = {
        parseClasses: parseClasses,
        attrsToClasses: attrsToClasses,
        tailwindSizeToCss: tailwindSizeToCss,
        pixelsToTailwindSize: pixelsToTailwindSize,
    };

} )();
