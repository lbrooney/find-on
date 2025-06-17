#!/bin/bash

# Exit on error
set -e

# Create build directory
BUILD_DIR="build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy necessary files
cp manifest.json "$BUILD_DIR/"
cp *.js "$BUILD_DIR/"
cp *.html "$BUILD_DIR/"
cp -r css "$BUILD_DIR/"
cp -r js "$BUILD_DIR/"
cp -r fonts "$BUILD_DIR/"
cp icon-*.png "$BUILD_DIR/"
cp README.md "$BUILD_DIR/"
cp License.md "$BUILD_DIR/"

# Create zip file
VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
ZIP_NAME="find-on-v$VERSION.zip"

# Remove old zip if exists
rm -f "$ZIP_NAME"

# Create zip file
cd "$BUILD_DIR"
zip -r "../$ZIP_NAME" .
cd ..

# Clean up
rm -rf "$BUILD_DIR"

echo "Build complete: $ZIP_NAME" 