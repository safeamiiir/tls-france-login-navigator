# TLS France Login Navigator Chrome Extension

A Chrome extension that automates the navigation to the France TLS login page, following a series of specific clicks and interactions.

## Features

- Automated navigation through the France TLS website
- Automatically selects United Kingdom as the country
- Finds and clicks the Wandsworth (London) location
- Completes all required confirmations
- Real-time status updates and step tracking
- User-friendly popup interface

## Installation

### For Development/Testing:

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select this folder (`tls-france-login-navigator`)

## How to Use

1. Open the France TLS website in your browser:
   ```
   https://visas-fr.tlscontact.com/en-us/country/gb/vac/gbLON2fr
   ```

2. Click the extension icon in your Chrome toolbar

3. Click the "Start Automation" button in the popup

4. The extension will automatically perform all the required steps:
   - Click "Book an appointment" button
   - Select "Yes" in popup
   - Select country (United Kingdom)
   - Confirm country selection
   - Click Continue on Wandsworth card
   - Click "Book an appointment" again
   - Answer "Yes" to France-Visas question
   - Answer "Yes" to TLScontact question
   - Click final "LOG IN" button

5. Watch the status updates in the popup to monitor progress

## File Structure

```
tls-france-login-navigator/
├── manifest.json          # Extension configuration
├── popup.html             # Popup interface
├── popup.js               # Popup logic
├── content.js             # Main automation script
├── background.js          # Service worker
├── styles.css             # Popup styling
├── images/                # Icon assets
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Technical Details

### Permissions

- `scripting` - Allows injecting content script into page
- `activeTab` - Access to current active tab
- `tabs` - Tab management
- `host_permissions` - Access to visas-fr.tlscontact.com

### Automation Steps (11 total)

1. Click "Book an appointment" button (id="btn-apply-for-a-visa")
2. Select "Yes" in popup (id="btn-yes")
3. Click "Select a country" button (id="btn-select-country")
4. Open country dropdown (id="select-country")
5. Select "United Kingdom" from dropdown
6. Confirm country selection (id="btn-confirm-country")
7. Click "Continue" in Wandsworth card
8. Click "Book an appointment" again
9. Answer "Yes" to France-Visas application question
10. Answer "Yes" to TLScontact registration question
11. Click "LOG IN" button (id="btn-select-country" with LOG IN text)

## Error Handling

- If an element is not found, the automation stops and displays an error message
- The extension logs all actions to the browser console for debugging
- Step failures are highlighted in the popup interface

## Troubleshooting

**"Error: Please open the TLS France website first"**
- Make sure you have the correct website open in a tab

**"Element not found" error**
- The page structure may have changed
- Wait for the page to fully load before starting automation
- Check the browser console for detailed error messages

**Automation doesn't start**
- Reload the extension (chrome://extensions/)
- Close and reopen the popup
- Make sure the website tab is active

## Support

For issues or feature requests, modify the `content.js` file to adjust selectors or timing as needed.

## Notes

- The extension includes delays between actions to allow page transitions
- Selectors are based on the current website structure
- If the website updates its HTML, selectors in `content.js` may need adjustment
