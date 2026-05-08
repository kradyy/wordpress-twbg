( function ( wp ) {
    const { registerBlockType } = wp.blocks;
    const { InspectorControls, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, TextareaControl, FormTokenField } = wp.components;
    const { __ } = wp.i18n;
    const { useState } = wp.element;
    const INLINE_PREVIEW_MAX_CHARS = 4000;

    registerBlockType( 'twgb/tw-svg', {
        edit: function ( { attributes, setAttributes, isSelected } ) {
            const { svg, twClasses, ariaLabel } = attributes;
            const svgLength = ( svg || '' ).length;
            const isLargeSvg = svgLength > INLINE_PREVIEW_MAX_CHARS;
            const shouldRenderPreview = Boolean( svg ) && ( isSelected || ! isLargeSvg );
            const classInputState = useState( '' );
            const classInput = classInputState[0];
            const setClassInput = classInputState[1];

            const blockProps = useBlockProps( {
                className: 'twgb-svg-editor ' + ( twClasses || '' ),
            } );

            return wp.element.createElement(
                wp.element.Fragment,
                null,
                isSelected && wp.element.createElement(
                    InspectorControls,
                    null,
                    wp.element.createElement(
                        PanelBody,
                        { title: __( 'SVG Settings', 'tw-gutenberg-bridge' ) },
                        wp.element.createElement( FormTokenField, {
                            label: __( 'Tailwind Classes', 'tw-gutenberg-bridge' ),
                            placeholder: __( 'e.g. w-full h-auto text-gray-700', 'tw-gutenberg-bridge' ),
                            value: window.twgbUtils && typeof window.twgbUtils.classStringToTokens === 'function'
                                ? window.twgbUtils.classStringToTokens( twClasses )
                                : String( twClasses || '' ).trim().split( /\s+/ ).filter( Boolean ),
                            suggestions: window.twgbUtils && typeof window.twgbUtils.getTailwindClassSuggestions === 'function'
                                ? window.twgbUtils.getTailwindClassSuggestions( classInput )
                                : [],
                            onChange: function ( tokens ) {
                                var nextClasses = window.twgbUtils && typeof window.twgbUtils.classTokensToString === 'function'
                                    ? window.twgbUtils.classTokensToString( tokens )
                                    : ( tokens || [] ).join( ' ' );
                                setAttributes( { twClasses: nextClasses } );
                            },
                            onInputChange: function ( value ) {
                                setClassInput( String( value || '' ) );
                            },
                            maxSuggestions: 200,
                            __experimentalAutoSelectFirstMatch: true,
                            __experimentalExpandOnFocus: true,
                            __experimentalShowHowTo: false,
                            tokenizeOnSpace: true,
                        } ),
                        wp.element.createElement( TextControl, {
                            label: __( 'ARIA Label (optional)', 'tw-gutenberg-bridge' ),
                            value: ariaLabel || '',
                            onChange: function ( val ) { setAttributes( { ariaLabel: val } ); },
                        } ),
                        wp.element.createElement( TextareaControl, {
                            label: __( 'SVG Markup', 'tw-gutenberg-bridge' ),
                            help: __( 'Paste full <svg>...</svg> markup.', 'tw-gutenberg-bridge' ),
                            value: svg || '',
                            rows: 12,
                            onChange: function ( val ) { setAttributes( { svg: val } ); },
                        } )
                    )
                ),
                wp.element.createElement(
                    'div',
                    blockProps,
                    shouldRenderPreview
                        ? wp.element.createElement( 'div', {
                            className: 'twgb-svg-preview',
                            dangerouslySetInnerHTML: { __html: svg },
                        } )
                        : svg
                            ? wp.element.createElement(
                                'div',
                                { className: 'twgb-svg-placeholder' },
                                __( 'SVG preview hidden for performance. Select block to preview.', 'tw-gutenberg-bridge' )
                            )
                        : wp.element.createElement(
                            'div',
                            { className: 'twgb-svg-placeholder' },
                            __( 'Paste SVG markup in the sidebar.', 'tw-gutenberg-bridge' )
                        )
                )
            );
        },
        save: function () {
            return null;
        },
    } );
} )( window.wp );
