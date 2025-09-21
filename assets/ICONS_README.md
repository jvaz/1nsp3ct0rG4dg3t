# Extension Icons

This directory should contain the following PNG icon files for the Chrome extension:

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon32.png` - 32x32 pixels (Windows systems)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Current Status

Currently, there is an SVG template (`icon.svg`) that can be used to generate the required PNG files.

## How to Generate Icons

1. Use an SVG to PNG converter or design tool like:
   - Inkscape (free)
   - Adobe Illustrator
   - Online converters like svgtopng.com
   - ImageMagick command line tool

2. Export the SVG to the required sizes:
   ```bash
   # Using ImageMagick (if available)
   convert icon.svg -resize 16x16 icon16.png
   convert icon.svg -resize 32x32 icon32.png
   convert icon.svg -resize 48x48 icon48.png
   convert icon.svg -resize 128x128 icon128.png
   ```

3. Place the generated PNG files in this directory

## Icon Design

The icon represents the "1nsp3ct0rG4dg3t" concept with:
- A magnifying glass (inspection/debugging)
- Gear symbol (technical/developer tool)
- Code brackets (programming/web development)
- Blue gradient (professional developer tool aesthetic)

Until the PNG files are created, the extension may not display icons correctly in Chrome.