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
    var TAILWIND_VARIANT_PREFIXES = [ '', 'sm:', 'md:', 'lg:', 'xl:', '2xl:', 'hover:', 'focus:' ];
    var TAILWIND_SUGGESTION_BASE = [
        'block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden',
        'w-full', 'w-auto', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4', 'w-screen',
        'h-full', 'h-auto', 'h-screen', 'min-h-screen',
        'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl', 'max-w-none',
        'max-h-full', 'overflow-hidden', 'overflow-auto', 'overflow-x-hidden', 'overflow-y-auto',
        'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8', 'p-10', 'p-12', 'p-16',
        'px-0', 'px-2', 'px-3', 'px-4', 'px-5', 'px-6', 'px-8', 'px-10', 'px-12',
        'py-0', 'py-2', 'py-3', 'py-4', 'py-5', 'py-6', 'py-8', 'py-10', 'py-12',
        'pt-0', 'pt-4', 'pt-6', 'pt-8', 'pr-0', 'pr-4', 'pr-6', 'pb-0', 'pb-4', 'pb-6', 'pl-0', 'pl-4', 'pl-6',
        'm-0', 'm-2', 'm-4', 'm-6', 'm-8', 'mx-auto', 'mx-0', 'mx-2', 'mx-4', 'my-0', 'my-2', 'my-4', 'my-6',
        'mt-0', 'mt-2', 'mt-4', 'mt-6', 'mb-0', 'mb-2', 'mb-4', 'mb-6', 'ml-0', 'ml-2', 'mr-0', 'mr-2',
        'gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-8', 'gap-10', 'gap-12',
        'gap-x-2', 'gap-x-4', 'gap-x-6', 'gap-y-2', 'gap-y-4', 'gap-y-6',
        'flex-row', 'flex-col', 'flex-wrap', 'flex-nowrap', 'items-start', 'items-center', 'items-end', 'items-stretch',
        'justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly',
        'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-6', 'grid-cols-12',
        'col-span-1', 'col-span-2', 'col-span-3', 'col-span-4', 'col-span-6', 'col-span-12',
        'rounded', 'rounded-none', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',
        'border', 'border-0', 'border-2', 'border-gray-200', 'border-gray-300', 'border-black', 'border-white',
        'shadow', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-none',
        'text-left', 'text-center', 'text-right', 'text-justify',
        'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl',
        'font-thin', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold',
        'leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose',
        'tracking-tight', 'tracking-normal', 'tracking-wide',
        'text-black', 'text-white', 'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-900',
        'text-blue-500', 'text-indigo-600', 'text-green-600', 'text-red-600',
        'bg-transparent', 'bg-white', 'bg-black', 'bg-gray-50', 'bg-gray-100', 'bg-gray-900',
        'bg-blue-500', 'bg-blue-600', 'bg-indigo-600', 'bg-green-600', 'bg-red-600', 'bg-yellow-400',
        'object-cover', 'object-contain', 'object-center',
        'relative', 'absolute', 'fixed', 'sticky',
        'top-0', 'right-0', 'bottom-0', 'left-0', 'inset-0',
        'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50',
        'opacity-0', 'opacity-25', 'opacity-50', 'opacity-75', 'opacity-100',
        'cursor-pointer', 'cursor-not-allowed', 'select-none',
        'transition', 'transition-all', 'duration-150', 'duration-200', 'duration-300', 'ease-in-out',
    ];
    var TAILWIND_SUGGESTIONS = null;

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
            var arbitrarySizeMatch = textMatch[1].match( /^\[-?\d*\.?\d+(px|rem|em|%)\]$/ );
            if ( arbitrarySizeMatch ) return { attr: 'fontSize', bp: bp, val: textMatch[1] };
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

    function classStringToTokens( classString ) {
        return String( classString || '' ).trim().split( /\s+/ ).filter( Boolean );
    }

    function classTokensToString( tokens ) {
        if ( ! Array.isArray( tokens ) ) {
            return '';
        }

        return tokens
            .map( function ( token ) {
                if ( typeof token === 'string' ) {
                    return token.trim();
                }
                if ( token && typeof token.value === 'string' ) {
                    return token.value.trim();
                }
                return '';
            } )
            .filter( Boolean )
            .join( ' ' );
    }

    function getTailwindSuggestionsPool() {
        if ( Array.isArray( TAILWIND_SUGGESTIONS ) ) {
            return TAILWIND_SUGGESTIONS;
        }

        var pool = [];

        TAILWIND_VARIANT_PREFIXES.forEach( function ( prefix ) {
            TAILWIND_SUGGESTION_BASE.forEach( function ( cls ) {
                pool.push( prefix + cls );
            } );
        } );

        TAILWIND_SUGGESTIONS = Array.from( new Set( pool ) );
        return TAILWIND_SUGGESTIONS;
    }

    function getTailwindClassSuggestions( inputValue ) {
        var raw = String( inputValue || '' ).trim().toLowerCase();
        var parts = raw.split( /\s+/ ).filter( Boolean );
        var value = parts.length ? parts[ parts.length - 1 ] : '';
        var pool = getTailwindSuggestionsPool();

        if ( ! value ) {
            return pool.slice( 0, 200 );
        }

        return pool.filter( function ( cls ) {
            return cls.toLowerCase().indexOf( value ) !== -1;
        } ).slice( 0, 200 );
    }

    function getAllTailwindClassSuggestions() {
        return getTailwindSuggestionsPool().slice();
    }

    // Expose globally for block scripts.
    window.twgbUtils = {
        parseClasses: parseClasses,
        attrsToClasses: attrsToClasses,
        tailwindSizeToCss: tailwindSizeToCss,
        pixelsToTailwindSize: pixelsToTailwindSize,
        classStringToTokens: classStringToTokens,
        classTokensToString: classTokensToString,
        getTailwindClassSuggestions: getTailwindClassSuggestions,
        getAllTailwindClassSuggestions: getAllTailwindClassSuggestions,
    };

} )();
