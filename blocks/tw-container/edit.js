( function ( wp ) {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks, InspectorControls, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, SelectControl, ToggleControl, TextareaControl, ButtonGroup, Button } = wp.components;
    const { useState } = wp.element;
    const { useSelect } = wp.data;
    const { __ } = wp.i18n;

    const BREAKPOINTS = [ 'base', 'sm', 'md', 'lg', 'xl' ];
    const BREAKPOINT_TO_PREVIEW_DEVICE = {
        base: 'Desktop',
        sm: 'Mobile',
        md: 'Tablet',
        lg: 'Desktop',
        xl: 'Desktop',
    };
    const SPACING_OPTIONS = [ '0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32', '40', '48', '64' ];
    const MIN_RESIZE_WIDTH = 80;
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

    function getPreviewDeviceTypeFromSelect( select ) {
        var stores = [ 'core/editor', 'core/edit-post' ];

        for ( var i = 0; i < stores.length; i++ ) {
            var selectors = null;
            try {
                selectors = select( stores[ i ] );
            } catch ( error ) {
                continue;
            }

            if ( ! selectors ) {
                continue;
            }

            if ( typeof selectors.getDeviceType === 'function' ) {
                var stableType = selectors.getDeviceType();
                if ( stableType ) {
                    return stableType;
                }
            }

            if ( typeof selectors.__experimentalGetPreviewDeviceType === 'function' ) {
                var experimentalType = selectors.__experimentalGetPreviewDeviceType();
                if ( experimentalType ) {
                    return experimentalType;
                }
            }
        }

        return 'Desktop';
    }

    function setPreviewDeviceType( nextType ) {
        var stores = [ 'core/editor', 'core/edit-post' ];

        for ( var i = 0; i < stores.length; i++ ) {
            var actions = null;
            try {
                actions = wp.data.dispatch( stores[ i ] );
            } catch ( error ) {
                continue;
            }

            if ( ! actions ) {
                continue;
            }

            if ( typeof actions.setDeviceType === 'function' ) {
                actions.setDeviceType( nextType );
                return;
            }

            if ( typeof actions.__experimentalSetPreviewDeviceType === 'function' ) {
                actions.__experimentalSetPreviewDeviceType( nextType );
                return;
            }
        }
    }

    registerBlockType( 'twgb/tw-container', {
        edit: function ( { attributes, setAttributes, isSelected } ) {
            const { twClasses, tag, rawMode, responsiveAttrs } = attributes;
            const [ activeBp, setActiveBp ] = useState( 'base' );
            const [ resizeDraft, setResizeDraft ] = useState( null );
            const previewDeviceType = useSelect( function ( select ) {
                return getPreviewDeviceTypeFromSelect( select );
            }, [] );

            const blockProps = useBlockProps( {
                className: 'twgb-container-editor ' + twClasses,
            } );

            function rebuildClasses( attrs ) {
                const classes = [];
                Object.keys( attrs || {} ).forEach( function ( key ) {
                    if ( key === '_raw' ) {
                        classes.push( ...attrs[ key ] );
                        return;
                    }
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
                    display: val,
                    flexDirection: 'flex-' + val,
                    gap: 'gap-' + val,
                    padding: 'p-' + val,
                    paddingX: 'px-' + val,
                    paddingY: 'py-' + val,
                    margin: 'm-' + val,
                    marginX: 'mx-' + val,
                    marginY: 'my-' + val,
                    width: 'w-' + val,
                    height: 'h-' + val,
                    maxWidth: 'max-w-' + val,
                    bgColor: 'bg-' + val,
                    borderRadius: val === 'DEFAULT' ? 'rounded' : 'rounded-' + val,
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

            function setActiveBreakpoint( nextBp ) {
                setActiveBp( nextBp );
                if ( BREAKPOINT_TO_PREVIEW_DEVICE[ nextBp ] ) {
                    setPreviewDeviceType( BREAKPOINT_TO_PREVIEW_DEVICE[ nextBp ] );
                }
            }

            function getResizeStyle() {
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

                const target = event.currentTarget.parentElement;
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

                let rafId = null;
                let lastMoveEvent = null;

                function onMouseMove( moveEvent ) {
                    lastMoveEvent = moveEvent;
                    if ( rafId !== null ) {
                        return;
                    }

                    rafId = window.requestAnimationFrame( function () {
                        rafId = null;
                        if ( ! lastMoveEvent ) {
                            return;
                        }
                        setResizeDraft( getNextSize( lastMoveEvent ) );
                        lastMoveEvent = null;
                    } );
                }

                function onMouseUp( moveEvent ) {
                    document.removeEventListener( 'mousemove', onMouseMove );
                    document.removeEventListener( 'mouseup', onMouseUp );
                    if ( rafId !== null ) {
                        window.cancelAnimationFrame( rafId );
                        rafId = null;
                    }

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
                if ( rawMode || ! isSelected ) {
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

            const resizeStyle = getResizeStyle();
            const resizedBlockProps = {
                ...blockProps,
                className: blockProps.className + ' twgb-resizable' + ( isSelected && ! rawMode ? ' is-selected' : '' ),
                style: { ...( blockProps.style || {} ), ...resizeStyle },
            };

            return wp.element.createElement(
                wp.element.Fragment,
                null,
                isSelected && wp.element.createElement(
                    InspectorControls,
                    null,
                    wp.element.createElement(
                        PanelBody,
                        { title: __( 'Container Settings', 'tw-gutenberg-bridge' ) },
                        wp.element.createElement( SelectControl, {
                            label: __( 'HTML Tag', 'tw-gutenberg-bridge' ),
                            value: tag,
                            options: [
                                { label: 'div', value: 'div' },
                                { label: 'section', value: 'section' },
                                { label: 'article', value: 'article' },
                                { label: 'main', value: 'main' },
                                { label: 'aside', value: 'aside' },
                                { label: 'header', value: 'header' },
                                { label: 'footer', value: 'footer' },
                                { label: 'nav', value: 'nav' },
                            ],
                            onChange: function ( val ) { setAttributes( { tag: val } ); },
                        } ),
                        wp.element.createElement( ToggleControl, {
                            label: __( 'Raw Tailwind Mode', 'tw-gutenberg-bridge' ),
                            checked: rawMode,
                            onChange: function ( val ) {
                                if ( ! val && window.twgbUtils ) {
                                    // Leaving raw mode: parse twClasses back into responsiveAttrs.
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
                        wp.element.createElement( SelectControl, {
                            label: __( 'Preview Device', 'tw-gutenberg-bridge' ),
                            value: previewDeviceType || 'Desktop',
                            options: [
                                { label: __( 'Desktop', 'tw-gutenberg-bridge' ), value: 'Desktop' },
                                { label: __( 'Tablet', 'tw-gutenberg-bridge' ), value: 'Tablet' },
                                { label: __( 'Mobile', 'tw-gutenberg-bridge' ), value: 'Mobile' },
                            ],
                            onChange: function ( nextType ) { setPreviewDeviceType( nextType ); },
                        } ),
                        wp.element.createElement(
                            ButtonGroup,
                            { className: 'twgb-bp-toggle' },
                            BREAKPOINTS.map( function ( bp ) {
                                return wp.element.createElement( Button, {
                                    key: bp,
                                    isPrimary: activeBp === bp,
                                    isSecondary: activeBp !== bp,
                                    onClick: function () { setActiveBreakpoint( bp ); },
                                    className: 'twgb-bp-btn',
                                }, bp.toUpperCase() );
                            } )
                        ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Display', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'display' ),
                            options: [
                                { label: '—', value: '' },
                                { label: 'Block', value: 'block' },
                                { label: 'Flex', value: 'flex' },
                                { label: 'Grid', value: 'grid' },
                                { label: 'Hidden', value: 'hidden' },
                            ],
                            onChange: function ( val ) { setResponsiveAttr( 'display', val ); },
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Padding', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'padding' ),
                            options: [ { label: '—', value: '' } ].concat(
                                SPACING_OPTIONS.map( function ( v ) { return { label: v, value: v }; } )
                            ),
                            onChange: function ( val ) { setResponsiveAttr( 'padding', val ); },
                        } ),
                        wp.element.createElement( SelectControl, {
                            label: __( 'Gap', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'gap' ),
                            options: [ { label: '—', value: '' } ].concat(
                                SPACING_OPTIONS.map( function ( v ) { return { label: v, value: v }; } )
                            ),
                            onChange: function ( val ) { setResponsiveAttr( 'gap', val ); },
                        } ),
                        wp.element.createElement( TextControl, {
                            label: __( 'Max Width', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'maxWidth' ),
                            onChange: function ( val ) { setResponsiveAttr( 'maxWidth', val ); },
                            placeholder: 'e.g. 7xl, screen-xl, prose',
                        } ),
                        wp.element.createElement( TextControl, {
                            label: __( 'Background', 'tw-gutenberg-bridge' ),
                            value: getAttrForBp( 'bgColor' ),
                            onChange: function ( val ) { setResponsiveAttr( 'bgColor', val ); },
                            placeholder: 'e.g. white, gray-100, blue-500',
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
                    tag || 'div',
                    resizedBlockProps,
                    wp.element.createElement( InnerBlocks, {
                        templateLock: false,
                    } ),
                    renderResizeControls()
                )
            );
        },

        save: function () {
            return wp.element.createElement( InnerBlocks.Content );
        },
    } );
} )( window.wp );
