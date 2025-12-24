# AdToll
> A "Pay-to-Block" browser extension using the x402 protocol on Base blockchain

**Problem:** Creators lose revenue from ad blockers.  
**Solution:** An ad blocker that charges users micropayments for blocking ads and shares revenue with creators.

---

## Project Overview

AdToll is a proof-of-concept browser extension that demonstrates micropayments for ad blocking using:
- **x402 Protocol** (HTTP 402 Payment Required)
- **Base Blockchain** (Coinbase L2)
- **AnySpend** (Chain-agnostic payment facilitator)
- **Manifest V3** (Modern Chrome extension architecture)

### How It Works

1. **User blocks ads** using the extension (based on uBlock Origin Lite)
2. **Every 100 blocked ads**, the extension requests quota renewal from backend
3. **Backend checks quota** and returns:
   - `200 OK` if quota available
   - `402 Payment Required` if quota exhausted
4. **User pays** via x402 protocol (AnySpend SDK)
5. **Backend verifies payment** and tops up quota (+100 blocks)
6. **(Future)** Revenue shared with content creators

---

## Repository Structure

```
x402-AdBlocker/
├── backend/              # Node.js x402 server
│   ├── src/
│   │   └── index.ts     # Express server with x402 middleware
│   ├── package.json
│   ├── README.md        # Backend documentation
│   └── QUICKSTART.md    # Quick setup guide
│
├── extension/           # Chrome extension (MV3)
│   ├── chromium/        # Extension files
│   │   ├── js/
│   │   │   ├── background.js       # Modified: x402 hooks
│   │   │   ├── x402-payment.js     # NEW: Payment logic
│   │   │   └── x402-settings.js    # NEW: Settings UI
│   │   ├── dashboard.html          # Modified: x402 settings
│   │   └── manifest.json           # Modified: permissions
│   ├── ADTOLL_README.md            # Extension documentation
│   └── INTEGRATION.md              # Technical integration details
│
└── README.md            # This file
```

---

## Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Chrome/Edge 122+** (for `onRuleMatchedDebug` API)
- **Base wallet address** (for testing payments)

### 1. Start the Backend

```bash
cd backend
npm install
cp env.example .env
# Edit .env with your wallet address
npm run dev
```

Backend will start on `http://localhost:3000`

### 2. Load the Extension

```bash
cd extension/chromium
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chromium/` directory

### 3. Configure the Extension

1. Click the extension icon → Settings
2. Scroll to "AdToll (x402 Payment Settings)"
3. Enter:
   - Backend URL: `http://localhost:3000`
   - Wallet Address: Your Base wallet (0x...)
   - Blocks per Payment: `100`
4. Click "Save Configuration"

### 4. Test It

#### Option A: Test Payment Flow
```bash
# Click "Test Payment Flow" button in extension settings
```

#### Option B: Add Quota Manually
```bash
curl -X POST http://localhost:3000/admin/add-quota \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: dev-admin-key-12345" \
  -d '{"walletAddress":"YOUR_WALLET","blocks":100}'
```

#### Option C: Browse and Block
1. Visit ad-heavy websites
2. Watch the blocked counter increase
3. After 100 blocks, payment notification appears

---

## Architecture

### Backend (x402 Resource Server)

**Stack:** Node.js + Express + TypeScript  
**Key Library:** `@b3dotfun/anyspend-x402-express`

**Endpoints:**
- `POST /renew-quota` - Renew ad blocking quota (x402 protected)
- `GET /check-quota/:address` - Check remaining blocks
- `POST /admin/add-quota` - Manually add quota (testing)

**Flow:**
1. Extension requests quota
2. If quota > 0: Decrement and return 200
3. If quota = 0: Return 402 with x402 headers
4. If payment signature present: Verify and top up quota

### Extension (Chrome MV3)

**Base:** uBlock Origin Lite (forked)  
**Blocking:** `declarativeNetRequest` API  
**Tracking:** `onRuleMatchedDebug` listener

**New Components:**
- `x402-payment.js` - Payment logic and backend communication
- `x402-settings.js` - Configuration UI
- Modified `background.js` - Payment hooks
- Modified `dashboard.html` - Settings section

**Flow:**
1. Listen for blocked ads (`onRuleMatchedDebug`)
2. Increment counter on each block
3. At 100 blocks, call `/renew-quota`
4. Handle 402 response → Show payment notification
5. (Future) Sign payment with AnySpend SDK

---

## Features

**Backend:**
- x402 protocol compliance
- AnySpend middleware integration
- Quota management (in-memory)
- Payment verification (ready for signatures)
- Admin endpoints for testing

**Extension:**
- Ad blocking (uBOL rulesets)
- Payment tracking (every 100 blocks)
- Backend communication
- Settings UI with configuration
- Real-time stats display
- Browser notifications
- Test payment flow

### TODO (Future Enhancements)

1. **AnySpend SDK Integration**
   - Actual payment signing in extension
   - Payment confirmation UI/modal
   - Transaction history

2. **Creator Revenue Sharing**
   - Detect content creator wallet
   - Split payments (e.g., 70% creator, 30% admin)
   - Creator dashboard

3. **Production Features**
   - Persistent storage (PostgreSQL/Redis)
   - HTTPS backend
   - Secure wallet management
   - Analytics dashboard
   - Multi-chain support

4. **UX Improvements**
   - Better payment UI
   - Grace period handling
   - Subscription model option
   - Payment history viewer

---

## Testing Guide

### Backend Testing

```bash
# Health check
curl http://localhost:3000/health

# Check quota
curl http://localhost:3000/check-quota/0xYourAddress

# Try to renew (should get 402)
curl -X POST http://localhost:3000/renew-quota \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xYourAddress"}'

# Add quota manually
curl -X POST http://localhost:3000/admin/add-quota \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: dev-admin-key-12345" \
  -d '{"walletAddress":"0xYourAddress","blocks":100}'

# Try renew again (should succeed)
curl -X POST http://localhost:3000/renew-quota \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xYourAddress"}'
```

### Extension Testing

1. **Load extension** in Chrome
2. **Open background console:**
   - `chrome://extensions` → "service worker"
3. **Watch logs** for `[X402]` messages
4. **Browse websites** and watch counter
5. **Test payment** at 100 blocks

---

## Development

### Backend Development

```bash
cd backend
npm run dev      # Start with auto-reload
npm run build    # Compile TypeScript
npm start        # Run production build
```

### Extension Development

1. Make changes to files in `extension/chromium/`
2. Go to `chrome://extensions`
3. Click "Reload" button on the extension
4. Test changes

**Key Files to Modify:**
- `js/x402-payment.js` - Payment logic
- `js/x402-settings.js` - Settings UI
- `js/background.js` - Service worker hooks
- `dashboard.html` - Settings page

---

## Documentation

- **[Backend README](./backend/README.md)** - Server setup and API docs
- **[Extension README](./extension/ADTOLL_README.md)** - Extension docs
- **[Integration Guide](./extension/INTEGRATION.md)** - Technical details

---

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Change PORT in .env
PORT=3001
```

**Dependencies not installing:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Extension Issues

**Payment not triggering:**
- Check Chrome version (need 122+)
- Enable Developer Mode in extension settings
- Verify `onRuleMatchedDebug` is available

**Backend connection failed:**
- Verify backend is running
- Check backend URL in settings
- Look for CORS errors in console

**Wallet not configured:**
- Set wallet address in Settings
- Save configuration
- Test with "Test Payment Flow" button

---

## Security Considerations

### Current Implementation (MVP)
- In-memory quota storage (resets on restart)
- HTTP communication (local development)
- Simple admin key authentication
- No actual payment signatures yet

### Production Requirements
- Persistent database (PostgreSQL/Redis)
- HTTPS with proper certificates
- Secure wallet management
- Real payment signature verification
- Rate limiting and DDoS protection
- Audit logging

---

## Contributing

Contributions welcome!

**Areas for improvement:**
1. AnySpend SDK integration
2. Payment UI/UX design
3. Creator revenue sharing logic
4. Analytics and reporting
5. Multi-chain support
6. Security hardening
7. Testing suite

---

## License

- **uBlock Origin Lite**: GPL-3.0 (original)
- **x402 Integration Code**: ISC

---

## Resources

- [x402 Protocol Specification](https://x402.org)
- [AnySpend Documentation](https://docs.anyspend.io)
- [Base Network](https://base.org)
- [uBlock Origin Lite](https://github.com/gorhill/uBlock)
- [Chrome Extensions MV3](https://developer.chrome.com/docs/extensions/mv3/)


---

