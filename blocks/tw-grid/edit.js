( function ( wp ) {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks, InspectorControls, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, SelectControl, ToggleControl, TextareaControl, ButtonGroup, Button } = wp.components;
    const { useState } = wp.element;
    const { __ } = wp.i18n;

    const BREAKPOINTS = [ 'base', 'sm', 'md', 'lg', 'xl' ];
    const COL_OPTIONS = [ '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'none' ];
    const GAP_OPTIONS = [ '0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20' ];

    registerBlockType( 'twgb/tw-grid', {
        edit: function ( { attributes, setAttributes } ) {
            const { twClasses, rawMode, responsiveAttrs } = attributes;
            const [ activeBp, setActiveBp ] = useState( 'base' );

            const blockProps = useBlockProps( {
                className: 'twgb-grid-editor ' + twClasses,
            } );

            function setResponsiveAttr( key, value ) {
                const updated = { ...responsiveAttrs };
                if ( ! updated[ key ] ) updated[ key ] = {};
                updated[ key ][ activeBp ] = value;
                setAttributes( { responsiveAttrs: updated } );
                rebuildClasses( updated );
            }

            function rebuildClasses( attrs ) {
                const classes = [ 'grid' ];
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
                    gridCols: 'grid-cols-' + val,
                    gap: 'gap-' + val,
                    gapX: 'gap-x-' + val,
                    gapY: 'gap-y-' + val,
                    padding: 'p-' + val,
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
                        { title: __( 'Grid Settings', 'tw-gutenberg-bridge' ) },
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
                        { title: __( 'Responsive Grid', 'tw-gutenberg-bridge' ), initialOpen: true },
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
                            label: __( 'Columns', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'gridCols' ),
                            options: [ { label: '—', value: '' } ].concat(
                                COL_OPTIONS.map( function ( v ) { return { label: v, value: v }; } )
                            ),
                            onChange: function ( val ) { setResponsiveAttr( 'gridCols', val ); },
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
                                { label: 'Grid', value: 'grid' },
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
