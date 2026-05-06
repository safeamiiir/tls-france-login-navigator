# Customization Guide

This guide explains how to modify the extension if the website structure changes or you need to adjust the automation.

## Common Modifications

### 1. Adjusting Delays Between Steps

If clicks aren't registering properly, increase delays:

**File: `content.js`**

Find this line (around line 35):
```javascript
// Wait between steps
await sleep(800);
```

Change `800` to a larger value (in milliseconds):
- `1000` = 1 second
- `1500` = 1.5 seconds
- `2000` = 2 seconds

### 2. Changing Element Selectors

If the website updates its HTML, you may need to update selectors.

**To find new selectors:**
1. Open the website in Chrome
2. Press F12 to open Developer Tools
3. Right-click on the element
4. Select "Inspect"
5. Find the `id`, `class`, or other identifying attribute

**To update in `content.js`:**

Look for the selector in the `executeStep` function:

```javascript
case 'clickButtonApplyForVisa':
    await clickElement('#btn-apply-for-a-visa', 'Book an appointment button');
    break;
```

- `#btn-apply-for-a-visa` is the CSS selector (# = ID)
- Change to new selector, e.g., `#btn-book-appointment` or `.btn-primary`

### 3. Adding New Steps

To add a new step:

**Step 1:** Add to the steps array (in `startAutomation` function):
```javascript
const steps = [
    // ... existing steps ...
    { action: 'myNewAction' }
];
```

**Step 2:** Add the action handler in `executeStep` function:
```javascript
case 'myNewAction':
    await clickElement('#my-selector', 'My element description');
    break;
```

### 4. Modifying Text-Based Clicks

If you need to click something by its text content:

```javascript
// Find and click element containing specific text
await clickElementByContent('button', 'My Button Text');
```

### 5. Working with Dropdowns

For standard `<select>` dropdowns:
```javascript
await selectOptionByText('#dropdown-id', 'Option Text');
```

For custom dropdowns, create a new function similar to `clickElementByContent`.

## Debugging

### Enable Console Logging

The extension already logs to console. To see logs:

1. Keep the extension popup open
2. Open browser console (F12)
3. Go to "Console" tab
4. Run automation - messages will appear here

### Common Issues and Solutions

**Element not found:**
- The selector may have changed
- The element might not be visible yet
- Try adding a longer delay before clicking

**Page navigation issues:**
- Add `await sleep(1000);` after navigation steps
- Some steps might need longer delays

**Multiple similar elements:**
- Use more specific selectors
- Combine ID, class, and attribute selectors
- Use position if necessary (first, last, nth-child)

## Advanced: Custom Functions

You can add custom functions for complex interactions:

```javascript
async function myCustomFunction() {
    // Your logic here
    return new Promise((resolve, reject) => {
        // Do something
        resolve();
    });
}
```

Then call it in `executeStep`:
```javascript
case 'myAction':
    await myCustomFunction();
    break;
```

## Testing Changes

1. Save your modifications to `content.js`
2. Go to `chrome://extensions/`
3. Click the refresh icon on the TLS France Navigator extension
4. Open the website again
5. Test the automation

## Reverting Changes

If something breaks, you can:
1. Reload from git/backup
2. Or revert changes in your editor
3. Refresh the extension

## Common CSS Selectors Reference

```javascript
// ID selector
'#elementId'

// Class selector
'.className'

// Attribute selector
'[data-id="123"]'
'input[type="text"]'

// Pseudo-selectors
'.class > .child'
'.class .descendant'

// Multiple classes
'.class1.class2'

// Combining selectors
'button.btn-primary'
```

## Need Help?

- Check browser console for error messages (F12)
- Inspect elements on the website to find selectors
- Test selectors in browser console: `document.querySelector('#selector')`
- Review existing automation patterns in `content.js`
