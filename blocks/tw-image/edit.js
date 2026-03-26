( function ( wp ) {
    const { registerBlockType } = wp.blocks;
    const { InspectorControls, MediaUpload, MediaUploadCheck, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, TextareaControl, Button, ToggleControl, ButtonGroup, SelectControl } = wp.components;
    const { useState } = wp.element;
    const { __ } = wp.i18n;

    const BREAKPOINTS = [ 'base', 'sm', 'md', 'lg', 'xl' ];

    registerBlockType( 'twgb/tw-image', {
        edit: function ( { attributes, setAttributes } ) {
            const { src, alt, twClasses, rawMode, responsiveAttrs } = attributes;
            const [ activeBp, setActiveBp ] = useState( 'base' );

            const blockProps = useBlockProps( {
                className: 'twgb-image-editor',
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
                    width: 'w-' + val,
                    height: 'h-' + val,
                    maxWidth: 'max-w-' + val,
                    borderRadius: val === 'DEFAULT' ? 'rounded' : 'rounded-' + val,
                    display: val,
                    margin: 'm-' + val,
                    marginX: 'mx-' + val,
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
                        { title: __( 'Image Settings', 'tw-gutenberg-bridge' ) },
                        wp.element.createElement( TextControl, {
                            label: __( 'Image URL', 'tw-gutenberg-bridge' ),
                            value: src,
                            onChange: function ( val ) { setAttributes( { src: val } ); },
                        } ),
                        wp.element.createElement( TextControl, {
                            label: __( 'Alt Text', 'tw-gutenberg-bridge' ),
                            value: alt,
                            onChange: function ( val ) { setAttributes( { alt: val } ); },
                        } ),
                        wp.element.createElement( MediaUploadCheck, null,
                            wp.element.createElement( MediaUpload, {
                                onSelect: function ( media ) {
                                    setAttributes( { src: media.url, alt: media.alt || '' } );
                                },
                                allowedTypes: [ 'image' ],
                                render: function ( { open } ) {
                                    return wp.element.createElement( Button, {
                                        onClick: open,
                                        variant: 'secondary',
                                    }, __( 'Choose from Media Library', 'tw-gutenberg-bridge' ) );
                                },
                            } )
                        ),
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
                        wp.element.createElement( TextControl, {
                            label: __( 'Width', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'width' ),
                            onChange: function ( val ) { setResponsiveAttr( 'width', val ); },
                            placeholder: 'e.g. full, 1/2, 64, auto',
                        } ),
                        wp.element.createElement( TextControl, {
                            label: __( 'Max Width', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'maxWidth' ),
                            onChange: function ( val ) { setResponsiveAttr( 'maxWidth', val ); },
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Border Radius', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'borderRadius' ),
                            options: [
                                { label: '—', value: '' },
                                { label: 'None', value: 'none' },
                                { label: 'Small', value: 'sm' },
                                { label: 'Default', value: 'DEFAULT' },
                                { label: 'Medium', value: 'md' },
                                { label: 'Large', value: 'lg' },
                                { label: 'XL', value: 'xl' },
                                { label: 'Full', value: 'full' },
                            ],
                            onChange: function ( val ) { setResponsiveAttr( 'borderRadius', val ); },
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
                    src
                        ? wp.element.createElement( 'img', { src: src, alt: alt, className: twClasses } )
                        : wp.element.createElement( 'div', {
                            className: 'twgb-image-placeholder',
                            style: { padding: '40px', background: '#f0f0f0', textAlign: 'center', borderRadius: '4px' },
                        }, __( 'Select an image', 'tw-gutenberg-bridge' ) )
                )
            );
        },

        save: function () {
            return null; // Dynamic block.
        },
    } );
} )( window.wp );
