( function ( wp ) {
    const { registerBlockType } = wp.blocks;
    const { InspectorControls, MediaUpload, MediaUploadCheck, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, TextareaControl, Button, ToggleControl, ButtonGroup, SelectControl } = wp.components;
    const { useState } = wp.element;
    const { __ } = wp.i18n;

    const BREAKPOINTS = [ 'base', 'sm', 'md', 'lg', 'xl' ];
    const MIN_RESIZE_WIDTH = 40;
    const MIN_RESIZE_HEIGHT = 40;

    function cloneResponsiveAttrs( attrs ) {
        const cloned = {};
        Object.keys( attrs || {} ).forEach( function ( key ) {
            if ( Array.isArray( attrs[ key ] ) ) {
                cloned[ key ] = attrs[ key ].slice();
            } else if ( attrs[ key ] && typeof attrs[ key ] === 'object' ) {
                cloned[ key ] = { ...attrs[ key ] };
            } else {
                cloned[ key ] = attrs[ key ];
            }
        } );
        return cloned;
    }

    function setBreakpointValue( attrs, key, breakpoint, value ) {
        if ( value ) {
            if ( ! attrs[ key ] ) attrs[ key ] = {};
            attrs[ key ][ breakpoint ] = value;
            return;
        }

        if ( attrs[ key ] && attrs[ key ][ breakpoint ] ) {
            delete attrs[ key ][ breakpoint ];
            if ( ! Object.keys( attrs[ key ] ).length ) {
                delete attrs[ key ];
            }
        }
    }

    function toResizeToken( px ) {
        if ( window.twgbUtils && window.twgbUtils.pixelsToTailwindSize ) {
            return window.twgbUtils.pixelsToTailwindSize( px );
        }
        return '[' + Math.max( 1, Math.round( Number( px ) || 0 ) ) + 'px]';
    }

    function sizeToCss( value, axis ) {
        if ( ! value || ! window.twgbUtils || ! window.twgbUtils.tailwindSizeToCss ) {
            return '';
        }
        return window.twgbUtils.tailwindSizeToCss( value, axis );
    }

    registerBlockType( 'twgb/tw-image', {
        edit: function ( { attributes, setAttributes, isSelected } ) {
            const { src, alt, twClasses, rawMode, responsiveAttrs } = attributes;
            const [ activeBp, setActiveBp ] = useState( 'base' );
            const [ resizeDraft, setResizeDraft ] = useState( null );

            const blockProps = useBlockProps( {
                className: 'twgb-image-editor twgb-resizable' + ( isSelected && ! rawMode ? ' is-selected' : '' ),
            } );

            function rebuildClasses( attrs ) {
                const classes = [];
                Object.keys( attrs || {} ).forEach( function ( key ) {
                    if ( key === '_raw' ) { classes.push( ...attrs[ key ] ); return; }
                    const bpVals = attrs[ key ];
                    Object.keys( bpVals || {} ).forEach( function ( bp ) {
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

            function getWorkingResponsiveAttrs() {
                const parsed = window.twgbUtils
                    ? cloneResponsiveAttrs( twgbUtils.parseClasses( twClasses || '' ) )
                    : {};
                const current = cloneResponsiveAttrs( responsiveAttrs );

                Object.keys( current ).forEach( function ( key ) {
                    if ( Array.isArray( current[ key ] ) ) {
                        parsed[ key ] = current[ key ].slice();
                        return;
                    }
                    if ( current[ key ] && typeof current[ key ] === 'object' ) {
                        parsed[ key ] = { ...( parsed[ key ] || {} ), ...current[ key ] };
                        return;
                    }
                    parsed[ key ] = current[ key ];
                } );

                return parsed;
            }

            function setResponsiveAttr( key, value ) {
                const updated = getWorkingResponsiveAttrs();
                setBreakpointValue( updated, key, activeBp, value );
                setAttributes( { responsiveAttrs: updated } );
                rebuildClasses( updated );
            }

            function getAttrForBp( key ) {
                return ( responsiveAttrs && responsiveAttrs[ key ] && responsiveAttrs[ key ][ activeBp ] ) || '';
            }

            function getImagePreviewStyle() {
                if ( resizeDraft ) {
                    return {
                        width: resizeDraft.width + 'px',
                        height: resizeDraft.height + 'px',
                    };
                }

                const style = {};
                const widthCss = sizeToCss( getAttrForBp( 'width' ), 'width' );
                const heightCss = sizeToCss( getAttrForBp( 'height' ), 'height' );
                if ( widthCss ) style.width = widthCss;
                if ( heightCss ) style.height = heightCss;
                return style;
            }

            function startResize( direction, event ) {
                if ( rawMode || ! isSelected || event.button !== 0 ) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                const editorRoot = event.currentTarget.parentElement;
                const target = editorRoot && editorRoot.querySelector( '[data-twgb-resize-target="true"]' );
                if ( ! target ) {
                    return;
                }

                const startRect = target.getBoundingClientRect();
                const start = {
                    x: event.clientX,
                    y: event.clientY,
                    width: startRect.width,
                    height: startRect.height,
                };

                function getNextSize( moveEvent ) {
                    const deltaX = moveEvent.clientX - start.x;
                    const deltaY = moveEvent.clientY - start.y;
                    const nextWidth = direction.indexOf( 'e' ) !== -1
                        ? Math.max( MIN_RESIZE_WIDTH, start.width + deltaX )
                        : start.width;
                    const nextHeight = direction.indexOf( 's' ) !== -1
                        ? Math.max( MIN_RESIZE_HEIGHT, start.height + deltaY )
                        : start.height;
                    return { width: nextWidth, height: nextHeight };
                }

                function onMouseMove( moveEvent ) {
                    setResizeDraft( getNextSize( moveEvent ) );
                }

                function onMouseUp( moveEvent ) {
                    document.removeEventListener( 'mousemove', onMouseMove );
                    document.removeEventListener( 'mouseup', onMouseUp );

                    const nextSize = getNextSize( moveEvent );
                    const updated = getWorkingResponsiveAttrs();

                    if ( direction.indexOf( 'e' ) !== -1 ) {
                        setBreakpointValue( updated, 'width', activeBp, toResizeToken( nextSize.width ) );
                    }
                    if ( direction.indexOf( 's' ) !== -1 ) {
                        setBreakpointValue( updated, 'height', activeBp, toResizeToken( nextSize.height ) );
                    }

                    setAttributes( { responsiveAttrs: updated } );
                    rebuildClasses( updated );
                    setResizeDraft( null );
                }

                document.addEventListener( 'mousemove', onMouseMove );
                document.addEventListener( 'mouseup', onMouseUp );
            }

            function renderResizeControls() {
                if ( rawMode || ! isSelected || ! src ) {
                    return null;
                }

                const badgeSize = resizeDraft
                    ? Math.round( resizeDraft.width ) + ' x ' + Math.round( resizeDraft.height )
                    : null;

                return [
                    wp.element.createElement( 'span', {
                        key: 'handle-e',
                        className: 'twgb-resize-handle twgb-resize-handle-e',
                        onMouseDown: function ( event ) { startResize( 'e', event ); },
                    } ),
                    wp.element.createElement( 'span', {
                        key: 'handle-s',
                        className: 'twgb-resize-handle twgb-resize-handle-s',
                        onMouseDown: function ( event ) { startResize( 's', event ); },
                    } ),
                    wp.element.createElement( 'span', {
                        key: 'handle-se',
                        className: 'twgb-resize-handle twgb-resize-handle-se',
                        onMouseDown: function ( event ) { startResize( 'se', event ); },
                    } ),
                    badgeSize && wp.element.createElement(
                        'span',
                        { key: 'badge', className: 'twgb-resize-badge' },
                        badgeSize
                    ),
                ];
            }

            const imagePreviewStyle = getImagePreviewStyle();

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
                        ? wp.element.createElement( 'img', {
                            src: src,
                            alt: alt,
                            className: twClasses,
                            style: imagePreviewStyle,
                            'data-twgb-resize-target': 'true',
                        } )
                        : wp.element.createElement( 'div', {
                            className: 'twgb-image-placeholder',
                            style: { padding: '40px', background: '#f0f0f0', textAlign: 'center', borderRadius: '4px' },
                        }, __( 'Select an image', 'tw-gutenberg-bridge' ) ),
                    renderResizeControls()
                )
            );
        },

        save: function () {
            return null; // Dynamic block.
        },
    } );
} )( window.wp );
