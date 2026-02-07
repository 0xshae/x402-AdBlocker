# AdToll: Quick Reference Guide

## 🎯 One-Minute Overview

**What:** Browser extension that charges micropayments for blocking ads  
**How:** HTTP 402 + x402 protocol + Base blockchain  
**Price:** $0.01 per 100 blocked ads

---

## 🔄 The Flow (Simplified)

```
1. User visits website
2. Extension blocks ads (via Chrome's declarativeNetRequest)
3. Extension counts blocks (1, 2, 3... 100)
4. At 100 blocks: Call backend /renew-quota
5. Backend checks: Does user have quota?
   - YES → Deduct 1, allow blocking, return 200
   - NO → Return 402 "Payment Required"
6. If 402: Show payment notification
7. (Future) User pays via AnySpend
8. Extension retries with payment signature
9. Backend verifies payment → Top up quota (+100 blocks)
10. Continue blocking
```

---

## 📁 File Structure

### Extension
- **background.js** - Main service worker, hooks into ad blocking
- **x402-payment.js** - Payment tracking and backend communication
- **x402-settings.js** - Settings UI logic
- **dashboard.html** - Settings page with config form

### Backend
- **src/index.ts** - Express server with x402 middleware
- **package.json** - Dependencies (@b3dotfun/anyspend-x402-express)

---

## 🔌 Key APIs

### Chrome Extension APIs
```javascript
chrome.declarativeNetRequest  // Block ads
chrome.declarativeNetRequest.onRuleMatchedDebug  // Track blocks
chrome.storage.local  // Save config
chrome.runtime.sendMessage  // Internal messaging
chrome.notifications  // Show alerts
```

### Backend APIs
```javascript
POST /renew-quota              // Request quota renewal
GET  /check-quota/:address     // Check remaining blocks
POST /admin/add-quota          // Manually add quota (testing)
GET  /health                   // Server status
```

---

## 💾 Data Storage

### Extension (Chrome Storage)
```javascript
{
  x402PaymentConfig: {
    backendUrl: 'http://localhost:3000',
    walletAddress: '0x...',
    blocksPerPayment: 100,
    enabled: true
  }
}
```

### Backend (In-Memory Map)
```javascript
userQuotas = Map {
  '0x1234...' => 87,   // 87 blocks remaining
  '0x5678...' => 0,    // Needs payment
  '0xabcd...' => 200   // Just paid
}
```

---

## 🎚️ State Variables

### Extension (x402-payment.js)
```javascript
totalBlockedCount = 537      // Lifetime total
lastPaymentBlock = 500        // Last payment at block 500
isPaymentInProgress = false   // Lock flag
paymentConfig = {...}         // Config object
```

---

## 🔑 Key Functions

### Extension

**incrementBlockedCount()**
- Called on every ad block
- Returns `true` every 100 blocks
- Triggers payment flow

**initiatePaymentFlow()**
- Calls `requestQuotaRenewal()`
- Handles 402 responses
- Shows notifications

**requestQuotaRenewal()**
- POSTs to backend
- Handles 200 (success) and 402 (payment required)
- Manages payment state

### Backend

**POST /renew-quota handler**
- Checks `userQuotas` map
- Returns 200 if quota > 0 (decrement)
- Returns 402 if quota = 0 (payment needed)

**x402 Middleware**
- Intercepts requests
- Checks for `X-Payment-Signature` header
- Verifies signature with AnySpend
- Tops up quota on valid payment

---

## 🔄 Message Flow

### Settings → Background
```javascript
chrome.runtime.sendMessage({
  what: 'setPaymentConfig',
  config: { walletAddress: '0x...', ... }
}, response => {
  // response = saved config
});
```

### Extension → Backend
```http
POST /renew-quota
Content-Type: application/json

{"walletAddress": "0x..."}
```

### Backend → Extension
```http
HTTP/1.1 402 Payment Required
X-402-Version: 1
X-402-Amount: 10000
...

{"error": "Payment Required", ...}
```

---

## 🎨 UI Elements

### Settings Page
- Backend URL input
- Wallet address input
- Blocks per payment input
- Enable/disable checkbox
- Save Configuration button
- Test Payment Flow button
- Stats display (live updating)

### Notifications
```javascript
chrome.notifications.create({
  type: 'basic',
  title: 'AdToll: Payment Required',
  message: 'Pay $0.01 to continue blocking ads'
});
```

---

## 🧪 Testing Commands

### Backend
```bash
# Health check
curl http://localhost:3000/health

# Check quota
curl http://localhost:3000/check-quota/0xYourAddress

# Add quota (testing)
curl -X POST http://localhost:3000/admin/add-quota \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: dev-admin-key-12345" \
  -d '{"walletAddress":"0xYourAddress","blocks":100}'

# Try renewal
curl -X POST http://localhost:3000/renew-quota \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xYourAddress"}'
```

### Extension Console
```javascript
// Get config
chrome.runtime.sendMessage(
  {what: 'getPaymentConfig'}, 
  r => console.log(r)
);

// Get stats
chrome.runtime.sendMessage(
  {what: 'getPaymentStats'}, 
  r => console.log(r)
);

// Test payment
chrome.runtime.sendMessage(
  {what: 'testPaymentFlow'}, 
  r => console.log(r)
);
```

---

## 🐛 Debug Logs

### Extension Console
```
[X402] Payment system initialized
[X402] Config loaded: {...}
[X402] Payment tracking listener activated
[X402] Payment threshold reached: 100 blocks
[X402] Requesting quota renewal from http://...
[X402] Quota renewed successfully
```

### Backend Console
```
[2025-12-24T...] Quota check for 0x...: 50 blocks remaining
[2025-12-24T...] Payment required for 0x...
```

---

## 🚦 Status Codes

- **200 OK** - Quota available, deducted successfully
- **402 Payment Required** - No quota, payment needed
- **400 Bad Request** - Missing walletAddress
- **403 Forbidden** - Invalid admin key
- **500 Internal Error** - Server error

---

## 📊 Metrics to Track

### Extension
- Total blocks (lifetime)
- Blocks since last payment
- Blocks until next payment
- Number of payments made

### Backend
- Requests per wallet
- Payment success rate
- Average quota per user
- Revenue (future)

---

## 🔐 Security Notes

### Current (MVP)
- In-memory storage (not persistent)
- HTTP (not HTTPS)
- Simple admin key auth
- No payment signatures yet

### Production TODO
- Persistent database (PostgreSQL/Redis)
- HTTPS with certificates
- JWT authentication
- Real payment verification
- Rate limiting
- Audit logging

---

## 🎯 Next Steps

1. **Test the flow**
   - Load extension
   - Browse ad-heavy sites
   - Watch counter increment
   - Add quota via admin endpoint
   - Test renewal

2. **Integrate AnySpend SDK**
   - Add payment signature generation
   - Implement payment UI
   - Connect to Base testnet

3. **Add persistence**
   - Replace Map with database
   - Store payment history
   - Add transaction logs

4. **Creator revenue sharing**
   - Detect creator wallets
   - Split payments
   - Creator dashboard

---

## 📚 Documentation Links

- **[TECHNICAL_FLOW.md](./TECHNICAL_FLOW.md)** - Complete technical documentation
- **[README.md](./README.md)** - Project overview
- **[backend/README.md](./backend/README.md)** - Backend API docs
- **[extension/ADTOLL_README.md](./extension/ADTOLL_README.md)** - Extension guide

---

## 💡 Pro Tips

1. **Always check both consoles** (extension + background worker)
2. **Enable Developer Mode** for payment tracking
3. **Use admin endpoint** to add quota for testing
4. **Check Chrome version** (need 122+ for onRuleMatchedDebug)
5. **Reload extension** after code changes
6. **Watch Network tab** to see backend requests

---

## 🎉 Success Checklist

- [ ] Backend running on port 3000
- [ ] Extension loaded in Chrome/Brave
- [ ] Settings page opens and loads
- [ ] Can save configuration
- [ ] Stats display updates
- [ ] Test payment flow works
- [ ] Backend logs show requests
- [ ] Ads are being blocked
- [ ] Counter increments
- [ ] 402 response at 100 blocks


