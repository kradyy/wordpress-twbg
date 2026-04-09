( function ( wp ) {
    const { registerBlockType } = wp.blocks;
    const { RichText, InspectorControls, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, SelectControl, ToggleControl, TextareaControl, ButtonGroup, Button } = wp.components;
    const { useState, useEffect } = wp.element;
    const { __ } = wp.i18n;

    const BREAKPOINTS = [ 'base', 'sm', 'md', 'lg', 'xl' ];
    const FONT_SIZES = [ 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl' ];
    const FONT_WEIGHTS = [ 'thin', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black' ];
    const MIN_RESIZE_WIDTH = 60;
    const MIN_RESIZE_HEIGHT = 24;

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

    registerBlockType( 'twgb/tw-text', {
        edit: function ( { attributes, setAttributes, isSelected } ) {
            const { content, twClasses, tag, rawMode, responsiveAttrs } = attributes;
            const [ activeBp, setActiveBp ] = useState( 'base' );
            const [ resizeDraft, setResizeDraft ] = useState( null );

            const blockProps = useBlockProps( {
                className: 'twgb-text-editor ' + twClasses,
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
                    fontSize: 'text-' + val,
                    fontWeight: 'font-' + val,
                    textAlign: 'text-' + val,
                    textColor: 'text-' + val,
                    padding: 'p-' + val,
                    margin: 'm-' + val,
                    marginY: 'my-' + val,
                    display: val,
                    width: 'w-' + val,
                    height: 'h-' + val,
                    maxWidth: 'max-w-' + val,
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

            function getFontSizeOptions() {
                var options = [ { label: '—', value: '' } ].concat(
                    FONT_SIZES.map( function ( v ) { return { label: v, value: v }; } )
                );
                var current = getAttrForBp( 'fontSize' );
                if ( current && ! options.some( function ( opt ) { return opt.value === current; } ) ) {
                    options.push( { label: current, value: current } );
                }
                return options;
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

            useEffect( function () {
                if ( rawMode || ! window.twgbUtils || ! isSelected ) {
                    return;
                }

                var parsed = twgbUtils.parseClasses( twClasses || '' );
                if ( ! parsed || Object.keys( parsed ).length === 0 ) {
                    return;
                }

                var current = responsiveAttrs || {};
                var merged = {};

                Object.keys( parsed ).forEach( function ( key ) {
                    if ( parsed[ key ] && typeof parsed[ key ] === 'object' && ! Array.isArray( parsed[ key ] ) ) {
                        merged[ key ] = { ...parsed[ key ] };
                    } else {
                        merged[ key ] = parsed[ key ];
                    }
                } );

                Object.keys( current ).forEach( function ( key ) {
                    if ( current[ key ] && typeof current[ key ] === 'object' && ! Array.isArray( current[ key ] ) ) {
                        merged[ key ] = { ...( merged[ key ] || {} ), ...current[ key ] };
                    } else {
                        merged[ key ] = current[ key ];
                    }
                } );

                if ( JSON.stringify( merged ) !== JSON.stringify( current ) ) {
                    setAttributes( { responsiveAttrs: merged } );
                }
            }, [ rawMode, twClasses, responsiveAttrs, isSelected ] );

            return wp.element.createElement(
                wp.element.Fragment,
                null,
                isSelected && wp.element.createElement(
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
                            options: getFontSizeOptions(),
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
                    resizedBlockProps,
                    wp.element.createElement( RichText, {
                        tagName: tag,
                        value: content,
                        onChange: function ( val ) { setAttributes( { content: val } ); },
                        placeholder: __( 'Type text...', 'tw-gutenberg-bridge' ),
                        className: twClasses,
                    } ),
                    renderResizeControls()
                )
            );
        },

        save: function () {
            return null; // Dynamic block – rendered by render.php.
        },
    } );
} )( window.wp );
