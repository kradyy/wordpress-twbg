#!/bin/bash

# Script to set up a WordPress playground with the Tailwind Gutenberg Bridge plugin pre-activated

set -e

# Function to check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check if Node.js is installed
if ! command_exists node; then
    echo "Error: Node.js is required but not installed. Please install Node.js and try again."
    exit 1
fi

# Check if npm is installed
if ! command_exists npm; then
    echo "Error: npm is required but not installed. Please install npm and try again."
    exit 1
fi

# Check if wp-env is installed globally
if ! command_exists wp-env; then
    echo "wp-env not found. Installing @wordpress/env globally..."
    npm install -g @wordpress/env
fi

# Navigate to the project root (parent directory of plugin)
cd "$(dirname "$0")/.."

# Create .wp-env.json if it doesn't exist
if [ ! -f ".wp-env.json" ]; then
    echo "Creating .wp-env.json configuration..."
    cat > .wp-env.json << 'EOF'
{
    "core": null,
    "plugins": ["./plugin"],
    "themes": [],
    "port": 8888,
    "testsPort": 8889,
    "config": {
        "WP_DEBUG": true,
        "WP_DEBUG_LOG": true
    }
}
EOF
fi

# Start the WordPress environment
echo "Starting WordPress playground environment..."
wp-env start

# Wait a moment for the environment to fully start
sleep 5

# Activate the plugin
echo "Activating the Tailwind Gutenberg Bridge plugin..."
wp-env run cli wp plugin activate tailwind-gutenberg-bridge

echo ""
echo "WordPress playground is ready!"
echo "Access your site at: http://localhost:8888"
echo "WordPress admin: http://localhost:8888/wp-admin"
echo ""
echo "To stop the environment later, run: wp-env stop"
echo "To destroy the environment, run: wp-env destroy"