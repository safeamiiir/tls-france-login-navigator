# Icons Required

This folder should contain three icon files for the Chrome extension:

- `icon16.png` - 16x16 pixels (used in extension list)
- `icon48.png` - 48x48 pixels (used in extension management page)
- `icon128.png` - 128x128 pixels (used in Chrome Web Store/large displays)

## To Generate Simple Icons

You can use any image editor or online tool to create simple icons. For a quick solution:

1. Use Chrome's built-in extension icon generator
2. Create simple PNG files with your branding
3. Or use an online icon creator tool

## Quick Solution for Testing

If you don't have icons ready, you can temporarily comment out the "icons" section in manifest.json:

```json
// "icons": {
//     "16": "images/icon16.png",
//     "48": "images/icon48.png",
//     "128": "images/icon128.png"
// }
```

The extension will still work without custom icons - Chrome will use a default icon.
