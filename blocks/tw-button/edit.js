( function ( wp ) {
    const { registerBlockType } = wp.blocks;
    const { RichText, InspectorControls, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, SelectControl, ToggleControl, TextareaControl, ButtonGroup, Button } = wp.components;
    const { useState } = wp.element;
    const { __ } = wp.i18n;

    const BREAKPOINTS = [ 'base', 'sm', 'md', 'lg', 'xl' ];
    const SPACING_OPTIONS = [ '0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16' ];

    registerBlockType( 'twgb/tw-button', {
        edit: function ( { attributes, setAttributes } ) {
            const { content, href, twClasses, tag, rawMode, responsiveAttrs } = attributes;
            const [ activeBp, setActiveBp ] = useState( 'base' );

            const blockProps = useBlockProps( {
                className: 'twgb-button-editor',
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
                    paddingX: 'px-' + val,
                    paddingY: 'py-' + val,
                    fontSize: 'text-' + val,
                    fontWeight: 'font-' + val,
                    bgColor: 'bg-' + val,
                    textColor: 'text-' + val,
                    borderRadius: val === 'DEFAULT' ? 'rounded' : 'rounded-' + val,
                    display: val,
                    width: 'w-' + val,
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
                        { title: __( 'Button Settings', 'tw-gutenberg-bridge' ) },
                        wp.element.createElement( SelectControl, {
                            label: __( 'Element', 'tw-gutenberg-bridge' ),
                            value: tag,
                            options: [
                                { label: 'Link (a)', value: 'a' },
                                { label: 'Button', value: 'button' },
                            ],
                            onChange: function ( val ) { setAttributes( { tag: val } ); },
                        } ),
                        wp.element.createElement( TextControl, {
                            label: __( 'URL', 'tw-gutenberg-bridge' ),
                            value: href,
                            onChange: function ( val ) { setAttributes( { href: val } ); },
                            placeholder: 'https://',
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
                        { title: __( 'Responsive Controls', 'tw-gutenberg-bridge' ), initialOpen: true },
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
                            label: __( 'Padding X', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'paddingX' ),
                            options: [ { label: '—', value: '' } ].concat(
                                SPACING_OPTIONS.map( function ( v ) { return { label: v, value: v }; } )
                            ),
                            onChange: function ( val ) { setResponsiveAttr( 'paddingX', val ); },
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Padding Y', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'paddingY' ),
                            options: [ { label: '—', value: '' } ].concat(
                                SPACING_OPTIONS.map( function ( v ) { return { label: v, value: v }; } )
                            ),
                            onChange: function ( val ) { setResponsiveAttr( 'paddingY', val ); },
                        } ),
                        wp.element.createElement( TextControl, {
                            label: __( 'Background', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'bgColor' ),
                            onChange: function ( val ) { setResponsiveAttr( 'bgColor', val ); },
                            placeholder: 'e.g. blue-500',
                        } ),
                        wp.element.createElement( TextControl, {
                            label: __( 'Text Color', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'textColor' ),
                            onChange: function ( val ) { setResponsiveAttr( 'textColor', val ); },
                            placeholder: 'e.g. white',
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Border Radius', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'borderRadius' ),
                            options: [
                                { label: '—', value: '' },
                                { label: 'None', value: 'none' },
                                { label: 'Default', value: 'DEFAULT' },
                                { label: 'MD', value: 'md' },
                                { label: 'LG', value: 'lg' },
                                { label: 'Full', value: 'full' },
                            ],
                            onChange: function ( val ) { setResponsiveAttr( 'borderRadius', val ); },
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
                        tagName: 'span',
                        value: content,
                        onChange: function ( val ) { setAttributes( { content: val } ); },
                        placeholder: __( 'Button text...', 'tw-gutenberg-bridge' ),
                        className: twClasses + ' inline-block cursor-pointer',
                    } )
                )
            );
        },

        save: function () {
            return null; // Dynamic block.
        },
    } );
} )( window.wp );
