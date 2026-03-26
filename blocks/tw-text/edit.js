( function ( wp ) {
    const { registerBlockType } = wp.blocks;
    const { RichText, InspectorControls, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, SelectControl, ToggleControl, TextareaControl, ButtonGroup, Button } = wp.components;
    const { useState } = wp.element;
    const { __ } = wp.i18n;

    const BREAKPOINTS = [ 'base', 'sm', 'md', 'lg', 'xl' ];
    const FONT_SIZES = [ 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl' ];
    const FONT_WEIGHTS = [ 'thin', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black' ];

    registerBlockType( 'twgb/tw-text', {
        edit: function ( { attributes, setAttributes } ) {
            const { content, twClasses, tag, rawMode, responsiveAttrs } = attributes;
            const [ activeBp, setActiveBp ] = useState( 'base' );

            const blockProps = useBlockProps( {
                className: 'twgb-text-editor ' + twClasses,
            } );

            function setResponsiveAttr( key, value ) {
                const updated = { ...responsiveAttrs };
                if ( ! updated[ key ] ) updated[ key ] = {};
                updated[ key ][ activeBp ] = value;
                setAttributes( { responsiveAttrs: updated } );
                rebuildClasses( updated );
            }

            function rebuildClasses( attrs ) {
                const classes = [];
                Object.keys( attrs ).forEach( function ( key ) {
                    if ( key === '_raw' ) { classes.push( ...attrs[ key ] ); return; }
                    const bpVals = attrs[ key ];
                    Object.keys( bpVals ).forEach( function ( bp ) {
                        const prefix = bp === 'base' ? '' : bp + ':';
                        const cls = attrToClass( key, bpVals[ bp ] );
                        if ( cls ) classes.push( prefix + cls );
                    } );
                } );
                setAttributes( { twClasses: classes.join( ' ' ) } );
            }

            function attrToClass( attr, val ) {
                if ( ! val ) return null;
                const map = {
                    fontSize: 'text-' + val,
                    fontWeight: 'font-' + val,
                    textAlign: 'text-' + val,
                    textColor: 'text-' + val,
                    padding: 'p-' + val,
                    margin: 'm-' + val,
                    marginY: 'my-' + val,
                    display: val,
                };
                return map[ attr ] || null;
            }

            function getAttrForBp( key ) {
                return ( responsiveAttrs[ key ] && responsiveAttrs[ key ][ activeBp ] ) || '';
            }

            return wp.element.createElement(
                wp.element.Fragment,
                null,
                wp.element.createElement(
                    InspectorControls,
                    null,
                    wp.element.createElement(
                        PanelBody,
                        { title: __( 'Text Settings', 'tw-gutenberg-bridge' ) },
                        wp.element.createElement( SelectControl, {
                            label: __( 'HTML Tag', 'tw-gutenberg-bridge' ),
                            value: tag,
                            options: [ 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'blockquote' ].map(
                                function ( t ) { return { label: t, value: t }; }
                            ),
                            onChange: function ( val ) { setAttributes( { tag: val } ); },
                        } ),
                        wp.element.createElement( ToggleControl, {
                            label: __( 'Raw Tailwind Mode', 'tw-gutenberg-bridge' ),
                            checked: rawMode,
                            onChange: function ( val ) {
                                if ( ! val && window.twgbUtils ) {
                                    var parsed = twgbUtils.parseClasses( twClasses );
                                    setAttributes( { rawMode: val, responsiveAttrs: parsed } );
                                } else {
                                    setAttributes( { rawMode: val } );
                                }
                            },
                        } )
                    ),
                    ! rawMode && wp.element.createElement(
                        PanelBody,
                        { title: __( 'Responsive Typography', 'tw-gutenberg-bridge' ), initialOpen: true },
                        wp.element.createElement(
                            ButtonGroup,
                            { className: 'twgb-bp-toggle' },
                            BREAKPOINTS.map( function ( bp ) {
                                return wp.element.createElement( Button, {
                                    key: bp,
                                    isPrimary: activeBp === bp,
                                    isSecondary: activeBp !== bp,
                                    onClick: function () { setActiveBp( bp ); },
                                    className: 'twgb-bp-btn',
                                }, bp.toUpperCase() );
                            } )
                        ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Font Size', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'fontSize' ),
                            options: [ { label: '—', value: '' } ].concat(
                                FONT_SIZES.map( function ( v ) { return { label: v, value: v }; } )
                            ),
                            onChange: function ( val ) { setResponsiveAttr( 'fontSize', val ); },
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Font Weight', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'fontWeight' ),
                            options: [ { label: '—', value: '' } ].concat(
                                FONT_WEIGHTS.map( function ( v ) { return { label: v, value: v }; } )
                            ),
                            onChange: function ( val ) { setResponsiveAttr( 'fontWeight', val ); },
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Text Align', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'textAlign' ),
                            options: [
                                { label: '—', value: '' },
                                { label: 'Left', value: 'left' },
                                { label: 'Center', value: 'center' },
                                { label: 'Right', value: 'right' },
                            ],
                            onChange: function ( val ) { setResponsiveAttr( 'textAlign', val ); },
                        } ),
                        wp.element.createElement( TextControl, {
                            label: __( 'Text Color', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'textColor' ),
                            onChange: function ( val ) { setResponsiveAttr( 'textColor', val ); },
                            placeholder: 'e.g. gray-700, blue-500',
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Visibility', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'display' ),
                            options: [
                                { label: '—', value: '' },
                                { label: 'Visible', value: 'block' },
                                { label: 'Hidden', value: 'hidden' },
                            ],
                            onChange: function ( val ) { setResponsiveAttr( 'display', val ); },
                        } )
                    ),
                    rawMode && wp.element.createElement(
                        PanelBody,
                        { title: __( 'Raw Classes', 'tw-gutenberg-bridge' ), initialOpen: true },
                        wp.element.createElement( TextareaControl, {
                            label: __( 'Tailwind Classes', 'tw-gutenberg-bridge' ),
                            value: twClasses,
                            onChange: function ( val ) { setAttributes( { twClasses: val } ); },
                            rows: 4,
                        } )
                    )
                ),
                wp.element.createElement(
                    'div',
                    blockProps,
                    wp.element.createElement( RichText, {
                        tagName: tag,
                        value: content,
                        onChange: function ( val ) { setAttributes( { content: val } ); },
                        placeholder: __( 'Type text...', 'tw-gutenberg-bridge' ),
                        className: twClasses,
                    } )
                )
            );
        },

        save: function () {
            return null; // Dynamic block – rendered by render.php.
        },
    } );
} )( window.wp );
