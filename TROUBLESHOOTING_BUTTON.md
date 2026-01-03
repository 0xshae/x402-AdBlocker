# Troubleshooting: Save Configuration Button Not Working

## Issue
The "Save Configuration" button in the AdToll settings doesn't respond when clicked in Brave browser.

## Root Cause
Potential timing issue or compatibility issue with Brave's event handling.

## Fix Applied
Updated `/extension/chromium/js/x402-settings.js` to:
1. Add extensive console logging for debugging
2. Check if DOM elements exist before attaching listeners
3. Use dual event listener attachment (both `dom.on` and direct `addEventListener`)
4. Better error handling and logging

## Testing Steps

### 1. Reload the Extension
```
1. Go to brave://extensions
2. Find "AdToll"
3. Click the reload button (circular arrow)
```

### 2. Open the Settings Page
```
1. Click the AdToll extension icon
2. Click "Settings" or right-click → Options
```

### 3. Open Developer Console
```
1. Right-click on the settings page
2. Click "Inspect"
3. Go to the "Console" tab
```

### 4. Look for Debug Messages
You should see:
```
[X402 Settings] Initializing...
[X402 Settings] Config loaded: {...}
[X402 Settings] Stats loaded: {...}
[X402 Settings] Save button listener attached
[X402 Settings] Test button listener attached
[X402 Settings] Initialization complete
```

### 5. Test the Button
```
1. Enter backend URL: http://localhost:3000
2. Enter wallet address: 0x...
3. Click "Save Configuration"
4. Watch the console for any errors
```

## Expected Behavior

**When button is clicked:**
- Console should show: `[X402] Config saved: {...}`
- Button text should change to "✓ Saved!" (green background)
- Button returns to normal after 2 seconds

**If it fails:**
- Console should show: `[X402] Failed to save config: <error>`
- Alert popup with error message

## Common Issues & Solutions

### Issue 1: Button Not Found
**Symptom:** Console shows "Save button not found"
**Solution:** 
- Dashboard HTML may not have loaded properly
- Try refreshing the page (F5)
- Check that you're on the Settings tab

### Issue 2: Background Script Error
**Symptom:** Console shows "Failed to save config" or no response
**Solution:**
- Open background service worker console:
  1. Go to `brave://extensions`
  2. Find AdToll
  3. Click "service worker" link
- Look for errors in background console
- Ensure background script is running

### Issue 3: Message Passing Failure
**Symptom:** Long delay then error
**Solution:**
```javascript
// In background console, test message handler:
chrome.runtime.sendMessage({what: 'getPaymentConfig'}, response => {
  console.log('Response:', response);
});
```

### Issue 4: Brave-Specific Issues
**Symptom:** Works in Chrome but not Brave
**Solution:**
- Check Brave Shields settings for the extension page
- Disable shields on the extension page
- Check Brave's extension permissions

## Manual Testing

If the button still doesn't work, test manually via console:

```javascript
// In the settings page console:
chrome.runtime.sendMessage({
  what: 'setPaymentConfig',
  config: {
    enabled: true,
    backendUrl: 'http://localhost:3000',
    walletAddress: '0xYourAddress',
    blocksPerPayment: 100
  }
}, response => {
  console.log('Saved:', response);
});
```

## Verification

After clicking Save:
```javascript
// Check if config was saved:
chrome.runtime.sendMessage({
  what: 'getPaymentConfig'
}, response => {
  console.log('Current config:', response);
});
```

## Alternative: Direct Storage Check

```javascript
// Check local storage directly:
chrome.storage.local.get('x402PaymentConfig', result => {
  console.log('Stored config:', result);
});
```

## If All Else Fails

1. **Check Extension Permissions:**
   - Go to `brave://extensions`
   - Click "Details" on AdToll
   - Ensure "Storage" permission is granted

2. **Reinstall Extension:**
   - Remove the extension
   - Close Brave completely
   - Reopen and reload the extension

3. **Check Brave Version:**
   - Needs Brave version based on Chromium 122+
   - Update Brave if needed

4. **Test in Chrome:**
   - Try the same steps in Chrome
   - If it works in Chrome but not Brave, it's a Brave-specific issue

## Getting More Info

Enable verbose logging:
1. Open background service worker console
2. Run: `localStorage.debug = 'x402:*'`
3. Reload extension
4. Try saving again
5. Check for detailed logs

## Contact/Report

If issue persists after trying all steps:
1. Copy all console logs (both settings page and background)
2. Note Brave version (`brave://version`)
3. Note extension version
4. Create issue with full details

