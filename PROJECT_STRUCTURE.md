# Project Architecture

## Overview

This is a Chrome extension (Manifest V3) that automates navigation through the France TLS website to reach the login page.

## File Structure

```
tls-france-login-navigator/
├── manifest.json           # Chrome extension configuration
├── content.js              # Main automation logic (injected into webpage)
├── background.js           # Service worker (handles extension lifecycle)
├── popup.html              # UI for the extension popup
├── popup.js                # Popup interaction logic
├── styles.css              # Styling for the popup
├── README.md               # Full documentation
├── QUICKSTART.md           # Quick setup guide
├── CUSTOMIZATION.md        # Customization instructions
├── images/                 # Icons directory
│   └── README.md           # Icon requirements
└── PROJECT_STRUCTURE.md    # This file
```

## How It Works

### 1. User Interaction Flow

```
User Opens Website
        ↓
User Clicks Extension Icon
        ↓
Popup Opens (popup.html)
        ↓
User Clicks "Start Automation"
        ↓
Content Script Injected (content.js)
        ↓
Automation Begins
```

### 2. File Responsibilities

#### `manifest.json`
- Defines extension metadata
- Declares permissions needed
- Points to other files
- Manifest V3 format

#### `content.js`
- **Main automation logic**
- Runs in the context of the webpage
- Contains all click sequences
- Handles element finding and interaction
- Communicates with popup for status updates

Key functions:
- `startAutomation()` - Initiates all steps
- `executeStep()` - Performs each automation step
- `clickElement()` - Generic element clicker
- `selectOptionByText()` - Selects dropdown options
- `clickContinueInWandsoworthCard()` - Specialized card finder

#### `popup.js`
- Handles popup UI interactions
- Manages the "Start" and "Stop" buttons
- Injects content script into webpage
- Receives and displays status updates
- Shows step-by-step progress

#### `popup.html`
- UI layout for the extension popup
- Buttons for starting/stopping automation
- Status display area
- Step list for tracking progress

#### `styles.css`
- Styling for popup interface
- Color scheme and animations
- Responsive layout

#### `background.js`
- Service worker for extension lifecycle
- Could handle persistence in future versions
- Currently minimal but extensible

## Automation Sequence

The extension performs 11 automated steps:

```
Step 1: Click "Book an appointment" (id="btn-apply-for-a-visa")
   ↓
Step 2: Click "Yes" popup (id="btn-yes")
   ↓
Step 3: Click "Select a country" (id="btn-select-country")
   ↓
Step 4: Open dropdown (id="select-country")
   ↓
Step 5: Select "United Kingdom"
   ↓
Step 6: Confirm country (id="btn-confirm-country")
   ↓
Step 7: Click "Continue" in Wandsworth card
   ↓
Step 8: Click "Book an appointment" again
   ↓
Step 9: Click "Yes" (France-Visas question)
   ↓
Step 10: Click "Yes" (TLScontact question)
   ↓
Step 11: Click "LOG IN" button
   ↓
Login Page Reached!
```

## Technical Stack

- **Framework:** Chrome Extension API (Manifest V3)
- **Languages:** JavaScript, HTML, CSS
- **Browser:** Google Chrome (or Chromium-based)
- **Target Website:** https://visas-fr.tlscontact.com/

## Key Concepts

### Message Passing
- Popup and content script communicate via `chrome.runtime.sendMessage()`
- Allows popup to trigger automation and receive status updates

### Element Selection
- Uses standard CSS selectors
- Falls back to text content matching when needed
- Includes error handling for missing elements

### Timing
- Includes delays between actions (800ms default)
- Scrolls elements into view before clicking
- Waits for transitions between steps

### Error Handling
- Catches exceptions and displays to user
- Logs errors to browser console
- Stops automation on failure

## Data Flow

```
Popup UI
   ↓ (click Start)
popup.js
   ↓ (inject content script)
content.js loads
   ↓ (receives start message)
startAutomation()
   ↓ (performs 11 steps)
executeStep()
   ↓ (for each step)
clickElement() / selectOption() / custom functions
   ↓ (interaction with webpage)
Website responds
   ↓ (page updates)
updatePopup()
   ↓ (send status message)
popup.js receives
   ↓ (displays progress)
Popup UI updated
```

## Security Considerations

- Extension only has access to visas-fr.tlscontact.com (specified in manifest)
- Runs scripts only in active tabs on that domain
- No external network requests
- No data collection or storage
- Open source for transparency

## Performance

- Lightweight (~50KB total)
- Minimal memory footprint
- No persistent background processes
- Service worker only active when needed

## Extension Lifecycle

1. **Installation:** 
   - Copied to Chrome extensions folder
   - Manifest read and validated
   
2. **Activation:**
   - Background service worker starts
   - Extension icon appears in toolbar

3. **User Action:**
   - User clicks extension icon
   - Popup loads (popup.html)

4. **Automation:**
   - Content script injected
   - Steps executed sequentially
   - Status updates sent to popup

5. **Completion:**
   - User reaches login page
   - Extension can be reused

## Future Enhancements

Possible improvements:
- Save automation preferences
- Record and replay custom sequences
- Support for other TLS countries
- A/B testing different paths
- Detailed analytics logging
- Error recovery strategies

## Troubleshooting

### Extension Won't Load
- Check manifest syntax
- Ensure all file paths are correct
- Check Chrome console for errors

### Automation Fails
- Verify CSS selectors match current website
- Check browser console for specific errors
- Increase delays between steps if needed

### Status Not Updating
- Check popup.js message handlers
- Verify content.js can access DOM elements
- Check for console errors

## Development Notes

- Modify `content.js` to change automation logic
- Update `popup.html` for UI changes
- Edit `styles.css` for styling changes
- Always reload extension after code changes
- Use browser DevTools for debugging (F12)

---

For detailed setup instructions, see **QUICKSTART.md**
For customization details, see **CUSTOMIZATION.md**
For general information, see **README.md**
