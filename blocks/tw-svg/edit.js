( function ( wp ) {
    const { registerBlockType } = wp.blocks;
    const { InspectorControls, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, TextareaControl } = wp.components;
    const { __ } = wp.i18n;
    const INLINE_PREVIEW_MAX_CHARS = 4000;

    registerBlockType( 'twgb/tw-svg', {
        edit: function ( { attributes, setAttributes, isSelected } ) {
            const { svg, twClasses, ariaLabel } = attributes;
            const svgLength = ( svg || '' ).length;
            const isLargeSvg = svgLength > INLINE_PREVIEW_MAX_CHARS;
            const shouldRenderPreview = Boolean( svg ) && ( isSelected || ! isLargeSvg );

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
                        wp.element.createElement( TextControl, {
                            label: __( 'Tailwind Classes', 'tw-gutenberg-bridge' ),
                            value: twClasses || '',
                            onChange: function ( val ) { setAttributes( { twClasses: val } ); },
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
