# Quick Start Guide

## Step-by-Step Setup

### 1. Install the Extension

- Open Chrome and go to `chrome://extensions/`
- Toggle "Developer mode" in the top-right corner
- Click "Load unpacked"
- Select the `tls-france-login-navigator` folder

### 2. Start Using

- Go to: https://visas-fr.tlscontact.com/en-us/country/gb/vac/gbLON2fr
- Click the extension icon in your toolbar
- Click "Start Automation"
- Sit back and watch it navigate to the login page!

## What Happens

The extension will automatically:

1. ✓ Click "Book an appointment"
2. ✓ Confirm "Yes" in popup
3. ✓ Select country dropdown
4. ✓ Choose "United Kingdom"
5. ✓ Confirm selection
6. ✓ Navigate to Wandsworth, London location
7. ✓ Click "Book an appointment" again
8. ✓ Answer "Yes" to France-Visas application
9. ✓ Answer "Yes" to TLScontact registration
10. ✓ Click "LOG IN" to reach login page

## Troubleshooting

### Icon Won't Load
- The icons are optional for testing
- Edit `manifest.json` to remove the icons section if needed

### Extension Doesn't Appear in Toolbar
- Make sure "Developer mode" is enabled
- Try reloading the extension from `chrome://extensions/`

### Automation Fails
- Check the browser console (F12 → Console tab) for error messages
- Ensure the TLS website is fully loaded
- The page structure might have changed - see CUSTOMIZATION.md

### Automation Doesn't Click Anything
- Wait a few seconds for the page to fully load
- Make sure the website has loaded completely before clicking "Start"
- Check if popup blockers are interfering

## Next Steps

- See **CUSTOMIZATION.md** to modify automation steps
- Check **README.md** for detailed information
- View browser console (F12) for debugging information
