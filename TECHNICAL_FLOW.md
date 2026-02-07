# AdToll: Complete Technical Flow Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Extension Initialization Flow](#extension-initialization-flow)
3. [Ad Blocking Flow](#ad-blocking-flow)
4. [Payment Tracking Flow](#payment-tracking-flow)
5. [Backend Communication Flow](#backend-communication-flow)
6. [Payment Verification Flow](#payment-verification-flow)
7. [State Management](#state-management)
8. [Data Structures](#data-structures)
9. [API Reference](#api-reference)
10. [Sequence Diagrams](#sequence-diagrams)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              AdToll Extension (MV3)                   │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │ Background  │  │   Settings   │  │   Popup     │ │  │
│  │  │   Service   │  │     Page     │  │    Page     │ │  │
│  │  │   Worker    │  │ (dashboard)  │  │             │ │  │
│  │  └──────┬──────┘  └──────┬───────┘  └─────────────┘ │  │
│  │         │                 │                           │  │
│  │         │   ┌─────────────┴─────────────┐            │  │
│  │         │   │   x402-payment.js         │            │  │
│  │         │   │   (Payment Module)        │            │  │
│  │         │   └───────────┬───────────────┘            │  │
│  │         │               │                             │  │
│  │  ┌──────▼───────────────▼────────────────────────┐   │  │
│  │  │  declarativeNetRequest API (Chrome)          │   │  │
│  │  │  - Block ads based on rulesets               │   │  │
│  │  │  - onRuleMatchedDebug listener               │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
                         │ POST /renew-quota
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   AdToll Backend Server                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Express.js + TypeScript                             │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │   x402 Middleware                                │ │  │
│  │  │   (@b3dotfun/anyspend-x402-express)             │ │  │
│  │  └─────────────────┬───────────────────────────────┘ │  │
│  │                    │                                  │  │
│  │  ┌─────────────────▼───────────────────────────────┐ │  │
│  │  │   Quota Manager (In-Memory Map)                 │ │  │
│  │  │   Address → Remaining Blocks                    │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ (Future: Settlement)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Base Blockchain (L2)                      │
│  - USDC/ETH Payments                                         │
│  - AnySpend Protocol                                         │
│  - On-chain Settlement                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Extension Initialization Flow

### Step 1: Extension Load

**File:** `background.js` - `start()` and `startSession()`

```javascript
// Sequence when extension loads/updates
1. Load ruleset configuration
2. Load admin configuration
3. Check for version changes
4. Enable ad blocking rulesets
5. Register content scripts
6. Initialize x402 payment system ← NEW
7. Activate payment tracking listener ← NEW
```

**What Happens:**

```javascript
// In background.js startSession()
async function startSession() {
    // ... existing uBOL initialization ...
    
    // Initialize X402 Payment System
    await initPaymentSystem();
    // Loads config from storage:
    // - backendUrl (default: http://localhost:3000)
    // - walletAddress (user configured)
    // - blocksPerPayment (default: 100)
    // - enabled (default: true)
    
    // Activate payment tracking
    if (dnr.onRuleMatchedDebug) {
        dnr.onRuleMatchedDebug.addListener(x402RuleListener);
        // Now listening to EVERY blocked request
    }
}
```

**Storage Structure:**
```javascript
chrome.storage.local = {
    x402PaymentConfig: {
        backendUrl: 'http://localhost:3000',
        walletAddress: '0x...',
        blocksPerPayment: 100,
        enabled: true,
        pricePerBlock: '$0.01'
    }
}
```

---

## Ad Blocking Flow

### How uBlock Origin Lite Blocks Ads

**Core Mechanism:** Chrome's `declarativeNetRequest` API

```
1. User loads webpage (e.g., news.example.com)
   │
   ├─> Browser makes network requests
   │   - main page: news.example.com/article
   │   - ad script: ads.network.com/banner.js
   │   - tracker: analytics.com/track.js
   │
2. Chrome checks each request against enabled rulesets
   │
   ├─> Ruleset: easylist.json has rule:
   │   {"action":{"type":"block"},"condition":{"urlFilter":"||ads.network.com^"}}
   │
3. Chrome blocks matching requests BEFORE they load
   │   - Ad script blocked ✓
   │   - Tracker blocked ✓
   │   - Main page allowed ✓
   │
4. If Developer Mode enabled: onRuleMatchedDebug fires
   │
   └─> Our x402RuleListener is called ← OUR HOOK
```

**Rulesets Used:**
- `ublock-filters.json` - uBlock's custom filters
- `easylist.json` - EasyList ad blocking
- `easyprivacy.json` - Privacy protection
- `pgl.json` - Peter Lowe's ad server list
- And ~50 more regional/specialized lists

---

## Payment Tracking Flow

### The x402RuleListener Hook

**File:** `background.js` - `x402RuleListener()`

```javascript
// This function is called EVERY TIME an ad is blocked
const x402RuleListener = (ruleInfo) => {
    // ruleInfo contains:
    // - request: { url, initiator, tabId, ... }
    // - rule: { ruleId, rulesetId }
    
    // Increment our counter
    const paymentRequired = incrementBlockedCount();
    // Returns true every 100 blocks
    
    if (paymentRequired) {
        // Trigger payment flow
        initiatePaymentFlow();
    }
};
```

### incrementBlockedCount() Logic

**File:** `x402-payment.js`

```javascript
// Module-level state
let totalBlockedCount = 0;
let lastPaymentBlock = 0;

export function incrementBlockedCount() {
    totalBlockedCount++;  // 1, 2, 3, ... 99, 100
    
    const blocksSincePayment = totalBlockedCount - lastPaymentBlock;
    // First time: 100 - 0 = 100
    // After payment: 200 - 100 = 100
    
    if (blocksSincePayment >= paymentConfig.blocksPerPayment) {
        return true;  // TIME TO PAY!
    }
    
    return false;  // Keep blocking
}
```

### Visual Flow

```
Block #1    → incrementBlockedCount() → false → continue
Block #2    → incrementBlockedCount() → false → continue
Block #3    → incrementBlockedCount() → false → continue
...
Block #99   → incrementBlockedCount() → false → continue
Block #100  → incrementBlockedCount() → TRUE  → PAYMENT TIME!
            ↓
    initiatePaymentFlow()
            ↓
    requestQuotaRenewal()
```

---

## Backend Communication Flow

### Step 1: Request Quota Renewal

**File:** `x402-payment.js` - `requestQuotaRenewal()`

```javascript
export async function requestQuotaRenewal() {
    // Check if payment is already in progress
    if (isPaymentInProgress) return;
    
    isPaymentInProgress = true;
    
    // Make HTTP request to backend
    const response = await fetch(`${backendUrl}/renew-quota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            walletAddress: paymentConfig.walletAddress
        })
    });
    
    const data = await response.json();
    
    if (response.status === 200) {
        // SUCCESS: Quota renewed
        resetPaymentCounter();  // lastPaymentBlock = totalBlockedCount
        return { success: true };
    }
    
    if (response.status === 402) {
        // PAYMENT REQUIRED
        return {
            success: false,
            needsPayment: true,
            paymentInfo: data  // x402 payment details
        };
    }
}
```

### HTTP Request Details

```http
POST /renew-quota HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

---

## Backend Processing Flow

### Step 1: Request Arrives at Backend

**File:** `backend/src/index.ts` - Middleware Chain

```javascript
// Express middleware chain:
1. CORS middleware           → Allow extension origin
2. JSON body parser          → Parse request body
3. x402 Payment middleware   → Check for payment signature ← KEY
4. Route handler             → Our /renew-quota logic
```

### Step 2: x402 Middleware Check

**Library:** `@b3dotfun/anyspend-x402-express`

```javascript
// Automatic check by middleware:
const paymentSignature = req.headers['x-payment-signature'];

if (paymentSignature) {
    // User has paid! Verify signature
    const verified = await verifyPaymentSignature(paymentSignature);
    
    if (verified) {
        // Mark request as "paid"
        req.x402Paid = true;
        next();  // Continue to route handler
    } else {
        // Invalid signature
        res.status(402).json({ error: 'Invalid payment' });
    }
} else {
    // No payment signature, continue normally
    next();
}
```

### Step 3: Route Handler Logic

**File:** `backend/src/index.ts` - `/renew-quota` endpoint

```javascript
app.post('/renew-quota', (req, res) => {
    const { walletAddress } = req.body;
    
    // Normalize address
    const address = walletAddress.toLowerCase();
    
    // Check in-memory quota map
    const quota = userQuotas.get(address) || 0;
    
    console.log(`Quota check for ${address}: ${quota} blocks`);
    
    if (quota > 0) {
        // ✓ User has quota
        userQuotas.set(address, quota - 1);
        
        return res.status(200).json({
            success: true,
            remainingBlocks: quota - 1
        });
    } else {
        // ✗ No quota - need payment
        return res.status(402).json({
            error: 'Payment Required',
            message: 'Quota exhausted',
            priceFor100Blocks: '$0.01'
        });
    }
});
```

### Backend State

```javascript
// In-memory Map
userQuotas = new Map([
    ['0x1234...', 150],  // Has 150 blocks left
    ['0x5678...', 0],    // Exhausted
    ['0x9abc...', 50],   // Has 50 blocks left
]);
```

---

## Payment Verification Flow

### Scenario: User Needs to Pay (402 Response)

**Step 1: Backend Returns 402**

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-402-Version: 1
X-402-Amount: 10000
X-402-Currency: USDC
X-402-Address: 0xAdminWalletAddress
X-402-Network: base-sepolia

{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "10000",
    "resource": "http://localhost:3000/renew-quota",
    "description": "AdToll: Pay to block 100 ads",
    "payTo": "0xAdminWalletAddress",
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "maxTimeoutSeconds": 120
  }]
}
```

**Step 2: Extension Handles 402**

```javascript
// In x402-payment.js
if (response.status === 402) {
    // Show notification to user
    showPaymentNotification(
        'Payment Required',
        'Pay $0.01 to continue blocking ads'
    );
    
    // (Future) Open AnySpend payment UI
    // const signature = await anyspend.requestPayment(paymentInfo);
    
    // (Current MVP) Just log and continue with grace period
    resetPaymentCounter();  // Temporary workaround
}
```

### Step 3: User Signs Payment (Future Implementation)

```javascript
// Using AnySpend SDK (not yet implemented)
import { AnySpend } from '@anyspend/sdk';

const anyspend = new AnySpend();

// Show payment UI
const payment = await anyspend.pay({
    amount: '10000',  // $0.01 in USDC microdollars
    currency: 'USDC',
    network: 'base-sepolia',
    to: '0xAdminWalletAddress',
    description: 'AdToll: Pay to block 100 ads'
});

// Get signature
const signature = payment.signature;
```

### Step 4: Retry Request with Payment

```javascript
// Extension retries with signature
const response = await fetch(`${backendUrl}/renew-quota`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Payment-Signature': signature  // ← The key!
    },
    body: JSON.stringify({
        walletAddress: paymentConfig.walletAddress
    })
});
```

### Step 5: Backend Verifies and Tops Up

```javascript
// x402 middleware intercepts
if (req.headers['x-payment-signature']) {
    const verified = await verifyPaymentWithAnySpend(
        req.headers['x-payment-signature']
    );
    
    if (verified) {
        // Payment is valid!
        // Settle on blockchain
        await settlePaymentOnChain(verified);
        
        // Top up user's quota
        const address = req.body.walletAddress.toLowerCase();
        const currentQuota = userQuotas.get(address) || 0;
        userQuotas.set(address, currentQuota + 100);  // +100 blocks!
        
        return res.status(200).json({
            success: true,
            remainingBlocks: currentQuota + 100
        });
    }
}
```

---

## State Management

### Extension State (Background Service Worker)

```javascript
// x402-payment.js module-level state
{
    paymentConfig: {
        backendUrl: 'http://localhost:3000',
        walletAddress: '0x...',
        blocksPerPayment: 100,
        enabled: true
    },
    totalBlockedCount: 537,        // Lifetime blocks
    lastPaymentBlock: 500,          // Last time we paid
    isPaymentInProgress: false      // Lock flag
}
```

### Backend State (In-Memory)

```javascript
// backend/src/index.ts
const userQuotas = new Map<string, number>();

// Example state:
{
    '0x1234...5678': 87,   // 87 blocks remaining
    '0xabcd...ef01': 0,    // Needs to pay
    '0x9876...5432': 200   // Just paid, has 200 blocks
}
```

### Chrome Storage

```javascript
chrome.storage.local.get('x402PaymentConfig', result => {
    // Persisted config (survives extension reload)
    result.x402PaymentConfig = {
        backendUrl: '...',
        walletAddress: '...',
        blocksPerPayment: 100,
        enabled: true
    };
});
```

---

## Data Structures

### Payment Config

```typescript
interface PaymentConfig {
    backendUrl: string;          // 'http://localhost:3000'
    walletAddress: string;       // '0x...'
    pricePerBlock: string;       // '$0.01'
    blocksPerPayment: number;    // 100
    enabled: boolean;            // true
}
```

### Payment Stats

```typescript
interface PaymentStats {
    totalBlocked: number;           // 537
    blocksSincePayment: number;     // 37
    blocksUntilPayment: number;     // 63
    paymentsRequired: number;       // 5
    enabled: boolean;               // true
}
```

### x402 Payment Info (from 402 response)

```typescript
interface X402PaymentInfo {
    x402Version: number;                 // 1
    error: string;                       // 'X-PAYMENT header is required'
    accepts: [{
        scheme: string;                  // 'exact'
        network: string;                 // 'base-sepolia'
        maxAmountRequired: string;       // '10000' (microdollars)
        resource: string;                // 'http://localhost:3000/renew-quota'
        description: string;             // 'AdToll: Pay to block 100 ads'
        payTo: string;                   // '0xAdminWallet'
        asset: string;                   // '0x036CbD5... (USDC contract)'
        maxTimeoutSeconds: number;       // 120
    }];
}
```

---

## API Reference

### Extension Internal API

#### chrome.runtime.sendMessage()

**From:** UI pages (settings, popup)  
**To:** Background service worker

```javascript
// Get config
chrome.runtime.sendMessage(
    { what: 'getPaymentConfig' },
    response => console.log(response)
);

// Set config
chrome.runtime.sendMessage(
    { 
        what: 'setPaymentConfig',
        config: { walletAddress: '0x...', ... }
    },
    response => console.log('Saved:', response)
);

// Get stats
chrome.runtime.sendMessage(
    { what: 'getPaymentStats' },
    response => console.log(response)
);

// Test payment
chrome.runtime.sendMessage(
    { what: 'testPaymentFlow' },
    response => console.log(response)
);
```

### Backend HTTP API

#### POST /renew-quota

Request quota renewal for ad blocking.

**Request:**
```http
POST /renew-quota
Content-Type: application/json

{
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Quota renewed",
  "remainingBlocks": 99,
  "walletAddress": "0x1234..."
}
```

**Response (Payment Required):**
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-402-Version: 1
X-402-Amount: 10000
...

{
  "error": "Payment Required",
  "message": "Your ad blocking quota has expired",
  "remainingBlocks": 0,
  "priceFor100Blocks": "$0.01",
  "x402Version": 1,
  "accepts": [...]
}
```

#### GET /check-quota/:walletAddress

Check remaining quota without decrementing.

**Response:**
```json
{
  "walletAddress": "0x1234...",
  "remainingBlocks": 87
}
```

#### POST /admin/add-quota

Manually add quota (for testing).

**Headers:**
- `X-Admin-Key: your-admin-key`

**Request:**
```json
{
  "walletAddress": "0x1234...",
  "blocks": 100
}
```

---

## Sequence Diagrams

### Complete Flow: User Blocks 100 Ads

```
User Browser          Extension              Backend              Blockchain
    │                    │                      │                      │
    │  Load webpage      │                      │                      │
    ├───────────────────>│                      │                      │
    │                    │                      │                      │
    │                    │ declarativeNetRequest│                      │
    │                    │ blocks ad request    │                      │
    │                    │                      │                      │
    │                    │ onRuleMatchedDebug() │                      │
    │                    │ fires                │                      │
    │                    │                      │                      │
    │                    │ x402RuleListener()   │                      │
    │                    │ incrementCounter()   │                      │
    │                    │ (count = 1)          │                      │
    │                    │                      │                      │
    │  ...repeat 98 more times...               │                      │
    │                    │                      │                      │
    │  Load webpage #50  │                      │                      │
    ├───────────────────>│                      │                      │
    │                    │ Block ad             │                      │
    │                    │ incrementCounter()   │                      │
    │                    │ (count = 100) ✓      │                      │
    │                    │                      │                      │
    │                    │ initiatePaymentFlow()│                      │
    │                    │ ─────────────────────│                      │
    │                    │                      │                      │
    │                    │ requestQuotaRenewal()│                      │
    │                    │ POST /renew-quota    │                      │
    │                    ├─────────────────────>│                      │
    │                    │   {walletAddress}    │                      │
    │                    │                      │                      │
    │                    │                      │ Check quota in Map   │
    │                    │                      │ quota = 0 (empty!)   │
    │                    │                      │                      │
    │                    │    402 Payment Req   │                      │
    │                    │<─────────────────────┤                      │
    │                    │   + x402 headers     │                      │
    │                    │                      │                      │
    │  Notification:     │                      │                      │
    │  "Payment Required"│                      │                      │
    │<───────────────────┤                      │                      │
    │                    │                      │                      │
    │  (Future: AnySpend Payment UI)            │                      │
    │  User signs payment│                      │                      │
    │───────────────────>│                      │                      │
    │                    │                      │                      │
    │                    │ Retry POST /renew-quota                     │
    │                    │ + X-Payment-Signature│                      │
    │                    ├─────────────────────>│                      │
    │                    │                      │                      │
    │                    │                      │ x402 middleware:     │
    │                    │                      │ verify signature     │
    │                    │                      │                      │
    │                    │                      │ Settle payment       │
    │                    │                      ├─────────────────────>│
    │                    │                      │  Transfer USDC       │
    │                    │                      │<─────────────────────┤
    │                    │                      │  Tx confirmed        │
    │                    │                      │                      │
    │                    │                      │ Update quota:        │
    │                    │                      │ Map['0x1234'] = 100  │
    │                    │                      │                      │
    │                    │    200 OK            │                      │
    │                    │<─────────────────────┤                      │
    │                    │ {remainingBlocks:100}│                      │
    │                    │                      │                      │
    │                    │ resetPaymentCounter()│                      │
    │                    │ lastPaymentBlock=100 │                      │
    │                    │                      │                      │
    │  Continue blocking │                      │                      │
    │<───────────────────┤                      │                      │
    │                    │                      │                      │
```

### Settings Update Flow

```
Settings Page         Background Worker       Chrome Storage
     │                       │                      │
     │  User clicks          │                      │
     │  "Save Config"        │                      │
     │                       │                      │
     │  sendMessage()        │                      │
     │  'setPaymentConfig'   │                      │
     ├──────────────────────>│                      │
     │                       │                      │
     │                       │ savePaymentConfig()  │
     │                       │                      │
     │                       │ chrome.storage.local │
     │                       │   .set()             │
     │                       ├─────────────────────>│
     │                       │                      │
     │                       │  Success             │
     │                       │<─────────────────────┤
     │                       │                      │
     │  Response             │                      │
     │<──────────────────────┤                      │
     │  {success: true}      │                      │
     │                       │                      │
     │  Button turns green   │                      │
     │  "✓ Saved!"           │                      │
     │                       │                      │
```

---

## Key Technical Details

### Why onRuleMatchedDebug?

Chrome's `declarativeNetRequest` API blocks requests **silently**. There's no normal way to know when a request is blocked. The `onRuleMatchedDebug` API is specifically for **debugging** - it fires an event whenever a rule matches.

**Requirements:**
- Chrome 122+
- Developer mode must be enabled
- Only available in development builds

**For Production:**
We'll need to use badge text count or periodic quota checks instead.

### Why In-Memory Storage?

**MVP Simplicity:**
- Fast lookups (O(1))
- No database setup needed
- Perfect for hackathon demo

**Production Needs:**
- PostgreSQL or Redis
- Persistent across server restarts
- Multiple server instances
- Payment history
- Analytics

### Why x402 Protocol?

**Standard HTTP Status Code:**
- 402 = "Payment Required" (reserved since HTTP/1.1)
- Finally getting real-world use!

**Benefits:**
- Works with existing HTTP infrastructure
- No special client software needed (just payment signature)
- Clear semantics
- Cacheable responses

---

## Future Enhancements

### 1. Real Payment Integration

```javascript
// Replace mock payment with AnySpend SDK
import { AnySpend } from '@anyspend/sdk';

const payment = await anyspend.pay({
    amount: paymentInfo.maxAmountRequired,
    currency: 'USDC',
    network: paymentInfo.network,
    to: paymentInfo.payTo
});

// Retry with signature
fetch(url, {
    headers: {
        'X-Payment-Signature': payment.signature
    }
});
```

### 2. Creator Revenue Sharing

```javascript
// Detect content creator
const creatorWallet = await detectCreatorWallet(currentTab.url);

if (creatorWallet) {
    // Split payment: 70% creator, 30% platform
    await splitPayment({
        total: '$0.01',
        recipients: [
            { address: creatorWallet, share: 0.7 },
            { address: adminWallet, share: 0.3 }
        ]
    });
}
```

### 3. Persistent Storage

```javascript
// Replace in-memory Map with database
const quota = await db.query(
    'SELECT remaining_blocks FROM quotas WHERE wallet = $1',
    [walletAddress]
);

await db.query(
    'UPDATE quotas SET remaining_blocks = $1 WHERE wallet = $2',
    [quota - 1, walletAddress]
);
```

### 4. Subscription Model

```javascript
// Allow monthly subscription instead of per-block
{
    subscriptionType: 'monthly',
    price: '$2.99',
    unlimited: true,
    expiresAt: '2025-02-01'
}
```

---

## Troubleshooting Tips

### Extension Not Blocking Ads

**Check:**
1. Is the extension enabled?
2. Are rulesets enabled? (Settings → Filter Lists)
3. Is the site in "No filtering" mode?

### Payment Tracking Not Working

**Check:**
1. Chrome version 122+ (for `onRuleMatchedDebug`)
2. Developer mode enabled in extension settings
3. Background service worker is running
4. Console shows `[X402] Payment tracking listener activated`

### Backend Not Responding

**Check:**
1. Backend server is running (`npm run dev`)
2. Correct URL in extension settings
3. CORS is enabled for extension origin
4. No firewall blocking localhost:3000

### Button Not Saving

**Check:**
1. Console for JavaScript errors
2. Background service worker console
3. Storage permissions granted
4. Settings page loaded correctly

---

## Summary

**The complete flow in one sentence:**

User browses web → Extension blocks ads using declarativeNetRequest → Every 100th block triggers payment check → Backend returns 402 if no quota → User pays via x402/AnySpend → Backend verifies and tops up quota → Blocking continues.

**Key Innovation:**

We've taken a standard ad blocker (uBOL) and added a payment layer using HTTP 402 and blockchain micropayments, creating a fair system where users pay small amounts for ad-free browsing, and that money can be shared with content creators.


