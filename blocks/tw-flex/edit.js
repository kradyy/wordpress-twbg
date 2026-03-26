( function ( wp ) {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks, InspectorControls, useBlockProps } = wp.blockEditor;
    const { PanelBody, SelectControl, ToggleControl, TextareaControl, ButtonGroup, Button, TextControl } = wp.components;
    const { useState } = wp.element;
    const { __ } = wp.i18n;

    const BREAKPOINTS = [ 'base', 'sm', 'md', 'lg', 'xl' ];
    const GAP_OPTIONS = [ '0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20' ];

    registerBlockType( 'twgb/tw-flex', {
        edit: function ( { attributes, setAttributes } ) {
            const { twClasses, rawMode, responsiveAttrs } = attributes;
            const [ activeBp, setActiveBp ] = useState( 'base' );

            const blockProps = useBlockProps( {
                className: 'twgb-flex-editor ' + twClasses,
            } );

            function setResponsiveAttr( key, value ) {
                const updated = { ...responsiveAttrs };
                if ( ! updated[ key ] ) updated[ key ] = {};
                updated[ key ][ activeBp ] = value;
                setAttributes( { responsiveAttrs: updated } );
                rebuildClasses( updated );
            }

            function rebuildClasses( attrs ) {
                const classes = [ 'flex' ];
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
                    flexDirection: 'flex-' + val,
                    justifyContent: 'justify-' + val,
                    alignItems: 'items-' + val,
                    gap: 'gap-' + val,
                    padding: 'p-' + val,
                    flexWrap: 'flex-' + val,
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
                        { title: __( 'Flex Settings', 'tw-gutenberg-bridge' ) },
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
                        { title: __( 'Responsive Flex', 'tw-gutenberg-bridge' ), initialOpen: true },
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
                            label: __( 'Direction', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'flexDirection' ),
                            options: [
                                { label: '—', value: '' },
                                { label: 'Row', value: 'row' },
                                { label: 'Column', value: 'col' },
                                { label: 'Row Reverse', value: 'row-reverse' },
                                { label: 'Column Reverse', value: 'col-reverse' },
                            ],
                            onChange: function ( val ) { setResponsiveAttr( 'flexDirection', val ); },
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Justify', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'justifyContent' ),
                            options: [
                                { label: '—', value: '' },
                                { label: 'Start', value: 'start' },
                                { label: 'Center', value: 'center' },
                                { label: 'End', value: 'end' },
                                { label: 'Between', value: 'between' },
                                { label: 'Around', value: 'around' },
                                { label: 'Evenly', value: 'evenly' },
                            ],
                            onChange: function ( val ) { setResponsiveAttr( 'justifyContent', val ); },
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Align Items', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'alignItems' ),
                            options: [
                                { label: '—', value: '' },
                                { label: 'Start', value: 'start' },
                                { label: 'Center', value: 'center' },
                                { label: 'End', value: 'end' },
                                { label: 'Stretch', value: 'stretch' },
                                { label: 'Baseline', value: 'baseline' },
                            ],
                            onChange: function ( val ) { setResponsiveAttr( 'alignItems', val ); },
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Wrap', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'flexWrap' ),
                            options: [
                                { label: '—', value: '' },
                                { label: 'Wrap', value: 'wrap' },
                                { label: 'No Wrap', value: 'nowrap' },
                                { label: 'Wrap Reverse', value: 'wrap-reverse' },
                            ],
                            onChange: function ( val ) { setResponsiveAttr( 'flexWrap', val ); },
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Gap', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'gap' ),
                            options: [ { label: '—', value: '' } ].concat(
                                GAP_OPTIONS.map( function ( v ) { return { label: v, value: v }; } )
                            ),
                            onChange: function ( val ) { setResponsiveAttr( 'gap', val ); },
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Visibility', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'display' ),
                            options: [
                                { label: '—', value: '' },
                                { label: 'Flex', value: 'flex' },
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
                    wp.element.createElement( InnerBlocks, { templateLock: false } )
                )
            );
        },

        save: function () {
            return wp.element.createElement( InnerBlocks.Content );
        },
    } );
} )( window.wp );
