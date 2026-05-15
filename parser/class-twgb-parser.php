<?php
/**
 * HTML-to-Block Parser – converts Tailwind HTML into Gutenberg block structures.
 */
class TWGB_Parser {

    /**
     * REST endpoint callback.
     */
    public static function rest_parse( $request ) {
        $html = $request->get_param( 'html' );
        if ( empty( $html ) ) {
            return new WP_Error( 'no_html', 'No HTML provided.', [ 'status' => 400 ] );
        }

        $blocks = self::parse_html( $html );

        return rest_ensure_response( [
            'blocks'    => $blocks,
            'gutenberg' => self::blocks_to_gutenberg( $blocks ),
        ] );
    }

    /**
     * Parse an HTML string into an array of block descriptors.
     */
    public static function parse_html( $html ) {
        $html = trim( $html );
        if ( empty( $html ) ) {
            return [];
        }

        $doc = new DOMDocument();
        libxml_use_internal_errors( true );
        $doc->loadHTML( '<div id="twgb-root">' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );
        libxml_clear_errors();

        $root = $doc->getElementById( 'twgb-root' );
        if ( ! $root ) {
            return [];
        }

        $blocks = [];
        foreach ( $root->childNodes as $node ) {
            $block = self::node_to_block( $node, $doc );
            if ( $block ) {
                $blocks[] = $block;
            }
        }

        return $blocks;
    }

    /**
     * Convert a DOM node into a block descriptor.
     */
    private static function node_to_block( $node, $doc ) {
        if ( $node->nodeType === XML_TEXT_NODE ) {
            $text = trim( $node->textContent );
            if ( '' === $text ) {
                return null;
            }

            return [
                'blockName'   => 'core/paragraph',
                'attrs'       => [
                    'content' => $text,
                ],
                'innerBlocks' => [],
            ];
        }

        if ( $node->nodeType !== XML_ELEMENT_NODE ) {
            return null;
        }

        $tag = strtolower( $node->tagName );
        $classes = TWGB_Renderer::sanitize_classes( $node->getAttribute( 'class' ) );
        $parsed = TWGB_Class_Intelligence::parse_classes( $classes );

        $inner_blocks = [];
        $inner_html = '';
        foreach ( $node->childNodes as $child ) {
            $inner_html .= $doc->saveHTML( $child );
            $child_block = self::node_to_block( $child, $doc );
            if ( $child_block ) {
                $inner_blocks[] = $child_block;
            }
        }

        $block_type = self::detect_block_type( $tag, $classes, $parsed );

        switch ( $block_type ) {
            case 'twgb/tw-svg':
                return [
                    'blockName'   => 'twgb/tw-svg',
                    'attrs'       => [
                        'svg'       => trim( $doc->saveHTML( $node ) ),
                        'ariaLabel' => $node->getAttribute( 'aria-label' ) ?: '',
                        'twClasses' => $classes,
                        'rawMode'   => false,
                    ],
                    'innerBlocks' => [],
                ];

            case 'core/image':
                $image_url = $node->getAttribute( 'src' ) ?: '';
                // Avoid broken-image placeholders when src is missing.
                if ( '' === trim( $image_url ) ) {
                    return null;
                }

                return [
                    'blockName'   => 'core/image',
                    'attrs'       => array_merge(
                        [
                            'url' => $image_url,
                            'alt' => $node->getAttribute( 'alt' ) ?: '',
                        ],
                        self::tailwind_attrs( $classes )
                    ),
                    'innerBlocks' => [],
                ];

            case 'twgb/core-button':
                $button_text = trim( $node->textContent );
                $button_url  = '';
                $button_classes = $classes;

                // Handle wrapper-first markup like:
                // <div class="wp-block-button ..."><a class="wp-block-button__link">...</a></div>
                if ( 'a' !== $tag && 'button' !== $tag ) {
                    $anchor = null;
                    foreach ( $node->childNodes as $child ) {
                        if ( $child->nodeType === XML_ELEMENT_NODE && strtolower( $child->tagName ) === 'a' ) {
                            $anchor = $child;
                            break;
                        }
                    }

                    if ( $anchor ) {
                        $button_text = trim( $anchor->textContent );
                        $button_url  = $anchor->getAttribute( 'href' ) ?: '';
                        $button_classes = trim(
                            TWGB_Renderer::sanitize_classes(
                                $classes . ' ' . ( $anchor->getAttribute( 'class' ) ?: '' )
                            )
                        );
                    }
                } else {
                    $button_url = $tag === 'a' ? ( $node->getAttribute( 'href' ) ?: '' ) : '';
                }

                // Remove structural Gutenberg classes from the Tailwind payload.
                $button_classes = preg_replace(
                    '/\b(?:wp-block-button|wp-block-button__link|wp-element-button|wp-block-buttons(?:-is-layout-flex)?|is-layout-\S+)\b/',
                    '',
                    $button_classes
                );
                $button_classes = trim( TWGB_Renderer::sanitize_classes( (string) $button_classes ) );

                $button_attrs = [
                    'text' => $button_text,
                    'url'  => $button_url,
                ];

                $button_attrs = array_merge( $button_attrs, self::tailwind_attrs( $button_classes ) );

                return [
                    'blockName'   => 'core/buttons',
                    'attrs'       => [],
                    'innerBlocks' => [
                        [
                            'blockName'   => 'core/button',
                            'attrs'       => $button_attrs,
                            'innerBlocks' => [],
                        ],
                    ],
                ];

            case 'core/heading':
                return [
                    'blockName'   => 'core/heading',
                    'attrs'       => array_merge(
                        [
                            'content' => trim( $inner_html !== '' ? $inner_html : $node->textContent ),
                            'level'   => self::heading_level( $tag ),
                        ],
                        self::tailwind_attrs( $classes )
                    ),
                    'innerBlocks' => [],
                ];

            case 'core/paragraph':
                return [
                    'blockName'   => 'core/paragraph',
                    'attrs'       => array_merge(
                        [
                            'content' => trim( $inner_html !== '' ? $inner_html : $node->textContent ),
                        ],
                        self::tailwind_attrs( $classes )
                    ),
                    'innerBlocks' => [],
                ];

            case 'core/group':
            default:
                $attrs = self::tailwind_attrs( $classes );
                $tag_name = self::group_tag_name( $tag );
                if ( '' !== $tag_name ) {
                    $attrs['tagName'] = $tag_name;
                }

                return [
                    'blockName'   => 'core/group',
                    'attrs'       => $attrs,
                    'innerBlocks' => $inner_blocks,
                ];
        }
    }

    /**
     * Detect which block type best fits the element.
     */
    private static function detect_block_type( $tag, $classes, $parsed ) {
        if ( $tag === 'svg' ) {
            return 'twgb/tw-svg';
        }

        if ( $tag === 'img' ) {
            return 'core/image';
        }

        if ( 'div' === $tag && preg_match( '/\bwp-block-button\b/', $classes ) ) {
            return 'twgb/core-button';
        }

        $looks_like_button = (
            preg_match( '/\bbtn\b/', $classes )
            || ( preg_match( '/\bbg-[^\s]+\b/', $classes ) && preg_match( '/\brounded(?:-[^\s]+)?\b/', $classes ) )
        );
        if ( $tag === 'button' || ( $tag === 'a' && $looks_like_button ) ) {
            return 'twgb/core-button';
        }

        if ( in_array( $tag, [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ], true ) ) {
            return 'core/heading';
        }

        if ( in_array( $tag, [ 'p', 'span', 'label', 'blockquote' ], true ) ) {
            return 'core/paragraph';
        }

        $display = $parsed['display'] ?? [];
        if ( in_array( 'grid', $display, true ) || in_array( 'inline-grid', $display, true ) || in_array( 'flex', $display, true ) || in_array( 'inline-flex', $display, true ) ) {
            return 'core/group';
        }

        return 'core/group';
    }

    /**
     * Build SKA-style Tailwind attribute payload.
     */
    private static function tailwind_attrs( $classes ) {
        $classes = trim( TWGB_Renderer::sanitize_classes( $classes ) );
        if ( '' === $classes ) {
            return [];
        }

        return [
            'twgbTailwind' => [
                'cx' => $classes,
            ],
        ];
    }

    /**
     * Convert heading tag name to level integer.
     */
    private static function heading_level( $tag ) {
        $level = (int) str_replace( 'h', '', strtolower( (string) $tag ) );
        if ( $level < 1 || $level > 6 ) {
            return 2;
        }

        return $level;
    }

    /**
     * Map element tag to supported core/group tagName.
     */
    private static function group_tag_name( $tag ) {
        $allowed = [
            'div',
            'section',
            'article',
            'aside',
            'main',
            'header',
            'footer',
            'nav',
        ];

        $tag = strtolower( (string) $tag );
        return in_array( $tag, $allowed, true ) ? $tag : '';
    }

    /**
     * Convert block descriptors to Gutenberg block markup.
     */
    public static function blocks_to_gutenberg( $blocks ) {
        $output = '';
        foreach ( $blocks as $block ) {
            $name  = $block['blockName'];
            $attrs = $block['attrs'];
            $json  = ! empty( $attrs ) ? ' ' . wp_json_encode( $attrs ) : '';
            $inner = '';

            if ( ! empty( $block['innerBlocks'] ) ) {
                $inner = self::blocks_to_gutenberg( $block['innerBlocks'] );
            }

            if ( ! empty( $inner ) ) {
                $output .= "<!-- wp:{$name}{$json} -->\n{$inner}<!-- /wp:{$name} -->\n";
            } else {
                $output .= "<!-- wp:{$name}{$json} /-->\n";
            }
        }
        return $output;
    }
}
