/**
 * Tailwind Gutenberg Bridge – Editor Utilities
 *
 * Registers the block category and provides the HTML Import tool.
 */
( function ( wp ) {
    const { addFilter } = wp.hooks;
    const { registerPlugin } = wp.plugins;
    const { PluginMoreMenuItem } = wp.editPost || {};
    const { useState } = wp.element;
    const { Modal, Button, TextareaControl } = wp.components;
    const { dispatch, select } = wp.data;
    const { __ } = wp.i18n;
    const { createBlock } = wp.blocks;

    // ───────────────────────────────────────────
    // 1. Register block category
    // ───────────────────────────────────────────
    addFilter(
        'blocks.registerBlockType',
        'twgb/set-category',
        function ( settings ) {
            return settings;
        }
    );

    wp.domReady( function () {
        // Register category via the block categories filter (WP 5.8+).
        var existingCategories = select( 'core/blocks' ).getCategories();
        var hasCategory = existingCategories.some( function ( cat ) {
            return cat.slug === 'twgb';
        } );
        if ( ! hasCategory ) {
            dispatch( 'core/blocks' ).setCategories( [
                { slug: 'twgb', title: 'Tailwind Blocks', icon: 'layout' },
            ].concat( existingCategories ) );
        }
    } );

    // ───────────────────────────────────────────
    // 2. HTML Import Plugin (sidebar menu item)
    // ───────────────────────────────────────────
    if ( registerPlugin && PluginMoreMenuItem ) {
        registerPlugin( 'twgb-import', {
            render: function () {
                var _state = useState( false );
                var isOpen = _state[0];
                var setOpen = _state[1];

                var _html = useState( '' );
                var html = _html[0];
                var setHtml = _html[1];

                var _loading = useState( false );
                var loading = _loading[0];
                var setLoading = _loading[1];

                function handleImport() {
                    if ( ! html.trim() ) return;
                    setLoading( true );

                    // Use the REST parser endpoint.
                    wp.apiFetch( {
                        path: '/twgb/v1/parse',
                        method: 'POST',
                        data: { html: html },
                    } ).then( function ( response ) {
                        setLoading( false );
                        if ( response && response.blocks ) {
                            insertParsedBlocks( response.blocks );
                            setOpen( false );
                            setHtml( '' );
                        }
                    } ).catch( function ( err ) {
                        setLoading( false );
                        // Fallback: insert as raw HTML in a tw-container.
                        var block = createBlock( 'twgb/tw-container', {
                            twClasses: '',
                            rawMode: true,
                        } );
                        dispatch( 'core/block-editor' ).insertBlocks( [ block ] );
                        setOpen( false );
                    } );
                }

                function insertParsedBlocks( blockDescriptors ) {
                    var wpBlocks = blockDescriptors.map( descriptorToBlock );
                    dispatch( 'core/block-editor' ).insertBlocks( wpBlocks );
                }

                function descriptorToBlock( desc ) {
                    var inner = ( desc.innerBlocks || [] ).map( descriptorToBlock );
                    return createBlock( desc.blockName, desc.attrs || {}, inner );
                }

                return wp.element.createElement(
                    wp.element.Fragment,
                    null,
                    wp.element.createElement(
                        PluginMoreMenuItem,
                        {
                            onClick: function () { setOpen( true ); },
                            icon: 'upload',
                        },
                        __( 'Import Tailwind HTML', 'tw-gutenberg-bridge' )
                    ),
                    isOpen && wp.element.createElement(
                        Modal,
                        {
                            title: __( 'Import Tailwind HTML', 'tw-gutenberg-bridge' ),
                            onRequestClose: function () { setOpen( false ); },
                            className: 'twgb-import-modal',
                        },
                        wp.element.createElement( 'p', null,
                            __( 'Paste your Tailwind HTML below. It will be parsed into Gutenberg blocks.', 'tw-gutenberg-bridge' )
                        ),
                        wp.element.createElement( TextareaControl, {
                            value: html,
                            onChange: setHtml,
                            className: 'twgb-import-textarea',
                            rows: 12,
                            placeholder: '<div class="flex flex-col md:flex-row gap-4 p-8">\n  <h2 class="text-2xl font-bold">Hello</h2>\n  <p class="text-gray-600">World</p>\n</div>',
                        } ),
                        wp.element.createElement(
                            'div',
                            { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' } },
                            wp.element.createElement( Button, {
                                variant: 'secondary',
                                onClick: function () { setOpen( false ); },
                            }, __( 'Cancel', 'tw-gutenberg-bridge' ) ),
                            wp.element.createElement( Button, {
                                variant: 'primary',
                                onClick: handleImport,
                                isBusy: loading,
                                disabled: loading || ! html.trim(),
                            }, loading ? __( 'Parsing...', 'tw-gutenberg-bridge' ) : __( 'Import', 'tw-gutenberg-bridge' ) )
                        )
                    )
                );
            },
        } );
    }

} )( window.wp );
