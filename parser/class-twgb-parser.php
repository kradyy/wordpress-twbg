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
        // Suppress warnings for HTML5 tags.
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
        // Text nodes.
        if ( $node->nodeType === XML_TEXT_NODE ) {
            $text = trim( $node->textContent );
            if ( empty( $text ) ) {
                return null;
            }
            return [
                'blockName'  => 'twgb/tw-text',
                'attrs'      => [
                    'content'       => $text,
                    'tag'           => 'p',
                    'twClasses'     => '',
                    'responsiveAttrs' => [],
                ],
                'innerBlocks' => [],
            ];
        }

        // Element nodes only.
        if ( $node->nodeType !== XML_ELEMENT_NODE ) {
            return null;
        }

        $tag     = strtolower( $node->tagName );
        $classes = $node->getAttribute( 'class' );
        $parsed  = TWGB_Class_Intelligence::parse_classes( $classes );

        // Determine block type from element + classes.
        $block_type = self::detect_block_type( $tag, $classes, $parsed );

        // Collect inner blocks.
        $inner_blocks = [];
        $inner_html   = '';
        foreach ( $node->childNodes as $child ) {
            $inner_html .= $doc->saveHTML( $child );
            $child_block = self::node_to_block( $child, $doc );
            if ( $child_block ) {
                $inner_blocks[] = $child_block;
            }
        }

        $attrs = [
            'twClasses'       => $classes,
            'responsiveAttrs' => $parsed,
        ];

        switch ( $block_type ) {
            case 'twgb/tw-svg':
                $attrs['svg'] = trim( $doc->saveHTML( $node ) );
                $attrs['ariaLabel'] = $node->getAttribute( 'aria-label' ) ?: '';
                $inner_blocks = []; // svg is a leaf block
                break;

            case 'twgb/tw-image':
                $attrs['src'] = $node->getAttribute( 'src' );
                $attrs['alt'] = $node->getAttribute( 'alt' );
                $attrs['tag'] = 'img';
                break;

            case 'twgb/tw-button':
                $attrs['content'] = trim( $node->textContent );
                $attrs['href']    = $node->getAttribute( 'href' ) ?: '';
                $attrs['tag']     = $tag;
                break;

            case 'twgb/tw-text':
                $attrs['content'] = trim( $inner_html );
                $attrs['tag']     = $tag;
                $inner_blocks     = []; // text blocks are leaf nodes
                break;

            case 'twgb/tw-grid':
            case 'twgb/tw-flex':
            case 'twgb/tw-container':
                $attrs['tag'] = $tag === 'section' ? 'section' : 'div';
                break;
        }

        return [
            'blockName'   => $block_type,
            'attrs'       => $attrs,
            'innerBlocks' => $inner_blocks,
        ];
    }

    /**
     * Detect which block type best fits the element.
     */
    private static function detect_block_type( $tag, $classes, $parsed ) {
        // Inline SVG.
        if ( $tag === 'svg' ) {
            return 'twgb/tw-svg';
        }

        // Images.
        if ( $tag === 'img' ) {
            return 'twgb/tw-image';
        }

        // Buttons / links that look like buttons.
        if ( $tag === 'button' || ( $tag === 'a' && preg_match( '/\bbtn\b|bg-.*\brounded\b/', $classes ) ) ) {
            return 'twgb/tw-button';
        }

        // Text elements.
        $text_tags = [ 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'label', 'blockquote' ];
        if ( in_array( $tag, $text_tags, true ) ) {
            return 'twgb/tw-text';
        }

        // Grid layout.
        $display = $parsed['display'] ?? [];
        if ( in_array( 'grid', $display, true ) || in_array( 'inline-grid', $display, true ) || isset( $parsed['gridCols'] ) ) {
            return 'twgb/tw-grid';
        }

        // Flex layout.
        if ( in_array( 'flex', $display, true ) || in_array( 'inline-flex', $display, true ) || isset( $parsed['flexDirection'] ) ) {
            return 'twgb/tw-flex';
        }

        // Default container.
        return 'twgb/tw-container';
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
