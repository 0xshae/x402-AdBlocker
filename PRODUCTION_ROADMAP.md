# AdToll: Production Roadmap

## Current Status: MVP Complete ✅

### What's Working Now

**Backend (x402 Server):**
- ✅ Express + TypeScript server running
- ✅ x402 middleware integrated (@b3dotfun/anyspend-x402-express)
- ✅ Quota management (in-memory Map)
- ✅ 402 Payment Required responses with x402 headers
- ✅ Admin endpoints for testing
- ✅ CORS configured for extension
- ✅ Comprehensive API documentation

**Extension (Chrome MV3):**
- ✅ Ad blocking via declarativeNetRequest (uBOL base)
- ✅ Payment tracking (counts every blocked ad)
- ✅ Backend communication (fetch to /renew-quota)
- ✅ Settings UI with configuration form
- ✅ Real-time stats display
- ✅ Browser notifications
- ✅ Payment bypass vulnerability FIXED
- ✅ Blocking pauses when quota exhausted

**Documentation:**
- ✅ Complete technical flow documentation
- ✅ API reference guides
- ✅ Quick reference for developers
- ✅ Troubleshooting guides
- ✅ Security documentation
- ✅ Branding guidelines

**Security:**
- ✅ Payment bypass vulnerability patched
- ✅ Blocking properly pauses until payment
- ✅ Counter only resets after verified payment

---

## What's Missing for Public Launch

### Critical (Must Have) 🔴

#### 1. **AnySpend SDK Integration**
**Status:** Not implemented (placeholder only)  
**Priority:** CRITICAL  
**Effort:** 2-3 days

**Current State:**
```javascript
// In x402-payment.js
if (result.needsPayment) {
    showPaymentNotification('Payment Required', ...);
    // TODO: Integrate AnySpend SDK
    return { success: false, needsPayment: true };
}
```

**Needs:**
- [ ] Install AnySpend SDK: `npm install @anyspend/sdk`
- [ ] Implement payment signature generation
- [ ] Create payment UI modal/popup
- [ ] Handle signature in retry request
- [ ] Test on Base Sepolia testnet
- [ ] Add error handling for failed payments

**Code to Add:**
```javascript
import { AnySpend } from '@anyspend/sdk';

async function processPayment(paymentInfo) {
    const anyspend = new AnySpend();
    
    // Request payment from user
    const payment = await anyspend.pay({
        amount: paymentInfo.maxAmountRequired,
        currency: 'USDC',
        network: paymentInfo.network,
        to: paymentInfo.payTo,
        description: paymentInfo.description
    });
    
    // Retry request with signature
    const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Payment-Signature': payment.signature
        },
        body: JSON.stringify({ walletAddress })
    });
    
    return response;
}
```

---

#### 2. **Persistent Database**
**Status:** In-memory only (data lost on restart)  
**Priority:** CRITICAL  
**Effort:** 1-2 days

**Current State:**
```javascript
// In backend/src/index.ts
const userQuotas = new Map<string, number>();
// Lost on server restart!
```

**Options:**

**Option A: PostgreSQL** (Recommended)
```bash
npm install pg
```
```typescript
import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Create tables
CREATE TABLE user_quotas (
    wallet_address VARCHAR(42) PRIMARY KEY,
    remaining_blocks INTEGER NOT NULL,
    last_payment_at TIMESTAMP,
    total_payments INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_history (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    amount VARCHAR(20) NOT NULL,
    blocks_purchased INTEGER NOT NULL,
    transaction_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Option B: Redis** (Faster, simpler)
```bash
npm install redis
```
```typescript
import { createClient } from 'redis';

const redis = createClient({
    url: process.env.REDIS_URL
});

// Store quota
await redis.set(`quota:${walletAddress}`, remainingBlocks);

// Get quota
const quota = await redis.get(`quota:${walletAddress}`);
```

**Tasks:**
- [ ] Choose database (PostgreSQL recommended)
- [ ] Set up database (local + production)
- [ ] Create schema/migrations
- [ ] Replace Map with database queries
- [ ] Add connection pooling
- [ ] Add error handling for DB failures
- [ ] Add transaction support for payments

---

#### 3. **HTTPS & Production Deployment**
**Status:** HTTP only, localhost  
**Priority:** CRITICAL  
**Effort:** 1 day

**Current:** `http://localhost:3000`  
**Needed:** `https://api.adtoll.io`

**Steps:**
1. **Choose hosting provider:**
   - Railway.app (recommended - easy, auto-deploy)
   - Heroku
   - DigitalOcean
   - AWS/GCP (more complex)

2. **Set up SSL certificate:**
   - Let's Encrypt (free)
   - Cloudflare (free, includes DDoS protection)
   - Provider's built-in SSL

3. **Configure production environment:**
   ```env
   NODE_ENV=production
   PORT=443
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   ADMIN_WALLET=0xYourRealWallet
   NETWORK=base  # mainnet, not sepolia
   ```

4. **Update extension:**
   ```javascript
   // In x402-payment.js
   const DEFAULT_CONFIG = {
       backendUrl: 'https://api.adtoll.io',  // Production URL
       ...
   };
   ```

**Tasks:**
- [ ] Set up production server
- [ ] Configure SSL certificate
- [ ] Set up environment variables
- [ ] Configure CORS for extension origin
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure rate limiting
- [ ] Set up automatic backups

---

#### 4. **Chrome Web Store Submission**
**Status:** Not submitted  
**Priority:** CRITICAL  
**Effort:** 2-3 days (includes review time)

**Requirements:**
1. **Developer Account:** $5 one-time fee
2. **Store Listing Assets:**
   - [ ] Extension icon (128x128, 48x48, 16x16)
   - [ ] 5 screenshots (1280x800 or 640x400)
   - [ ] Promotional tile image (440x280)
   - [ ] Small promo tile (optional, 220x140)
   - [ ] Hero image for featured listing (optional)

3. **Listing Information:**
   - [ ] Name: "AdToll - Pay to Block Ads"
   - [ ] Description (132 chars): "Pay the toll, skip the ads. Fair micropayments for ad-free browsing using x402 protocol on Base blockchain."
   - [ ] Full description (detailed, up to 16,000 chars)
   - [ ] Category: Productivity
   - [ ] Language: English (+ others if translated)

4. **Legal Requirements:**
   - [ ] Privacy policy URL (required)
   - [ ] Terms of service URL
   - [ ] Support email
   - [ ] Website URL

5. **Extension Package:**
   - [ ] Clean manifest.json (no dev flags)
   - [ ] Proper permissions justification
   - [ ] Remove developer mode dependencies
   - [ ] Replace `onRuleMatchedDebug` for production

**Critical Issue:** `onRuleMatchedDebug` API is **development only**!

**Production Alternative:**
```javascript
// Replace onRuleMatchedDebug with periodic quota checks
setInterval(async () => {
    // Check badge count
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
        const badge = await chrome.action.getBadgeText({ tabId: tab.id });
        // Badge shows blocked count automatically in MV3
        // Use this to estimate blocks
    }
}, 60000); // Every minute
```

**Tasks:**
- [ ] Create Chrome Web Store developer account
- [ ] Design extension icons and screenshots
- [ ] Write privacy policy
- [ ] Write terms of service
- [ ] Remove dev-only code (onRuleMatchedDebug)
- [ ] Test production build
- [ ] Submit for review (7-14 days)
- [ ] Respond to any review feedback

---

### Important (Should Have) 🟡

#### 5. **Payment Confirmation UI**
**Status:** Browser notification only  
**Priority:** HIGH  
**Effort:** 2-3 days

**Current:** Simple browser notification  
**Needed:** Proper payment modal/popup

**Design:**
```
┌─────────────────────────────────────┐
│  AdToll - Payment Required          │
├─────────────────────────────────────┤
│  Your ad blocking quota expired     │
│                                     │
│  Ads Blocked: 100                   │
│  Cost: $0.01 USDC                   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Connect Wallet                │ │
│  └───────────────────────────────┘ │
│                                     │
│  Your payment goes to:              │
│  • Content creators (70%)           │
│  • AdToll network (30%)             │
└─────────────────────────────────────┘
```

**Files to Create:**
- `extension/chromium/payment-modal.html`
- `extension/chromium/css/payment-modal.css`
- `extension/chromium/js/payment-modal.js`

**Tasks:**
- [ ] Design payment UI mockup
- [ ] Create payment modal HTML/CSS
- [ ] Integrate with AnySpend SDK
- [ ] Add wallet connection
- [ ] Show transaction progress
- [ ] Handle payment success/failure
- [ ] Add "Remind me later" option (with limit)

---

#### 6. **Testing Suite**
**Status:** Manual testing only  
**Priority:** HIGH  
**Effort:** 3-5 days

**Needed:**

**Backend Tests:**
```bash
npm install --save-dev jest supertest
```

```typescript
// backend/src/__tests__/quota.test.ts
describe('Quota Management', () => {
    test('should return 200 when quota available', async () => {
        // Add quota
        await request(app)
            .post('/admin/add-quota')
            .send({ walletAddress: '0xtest', blocks: 100 });
        
        // Request renewal
        const response = await request(app)
            .post('/renew-quota')
            .send({ walletAddress: '0xtest' });
        
        expect(response.status).toBe(200);
        expect(response.body.remainingBlocks).toBe(99);
    });
    
    test('should return 402 when quota exhausted', async () => {
        const response = await request(app)
            .post('/renew-quota')
            .send({ walletAddress: '0xnoquota' });
        
        expect(response.status).toBe(402);
    });
});
```

**Extension Tests:**
```bash
# Use Puppeteer for E2E testing
npm install --save-dev puppeteer
```

**Tasks:**
- [ ] Set up Jest for backend
- [ ] Write API endpoint tests
- [ ] Write quota management tests
- [ ] Write payment verification tests
- [ ] Set up Puppeteer for extension
- [ ] Write E2E blocking tests
- [ ] Write payment flow tests
- [ ] Set up CI/CD (GitHub Actions)

---

#### 7. **Monitoring & Analytics**
**Status:** Console logs only  
**Priority:** HIGH  
**Effort:** 2 days

**Needed:**

1. **Error Tracking:**
   ```bash
   npm install @sentry/node @sentry/browser
   ```

2. **Analytics:**
   ```bash
   npm install mixpanel-browser
   ```

3. **Logging:**
   ```bash
   npm install winston
   ```

**Track:**
- Payment success/failure rates
- Average blocks per user
- Revenue metrics
- Error rates
- Performance metrics
- User retention

**Tasks:**
- [ ] Set up Sentry for error tracking
- [ ] Add analytics tracking
- [ ] Create logging strategy
- [ ] Set up monitoring dashboard
- [ ] Configure alerts for critical errors
- [ ] Add performance monitoring

---

### Nice to Have (Future) 🟢

#### 8. **Creator Revenue Sharing**
**Status:** Not implemented  
**Priority:** MEDIUM  
**Effort:** 5-7 days

**Concept:**
```javascript
// Detect creator wallet from page
async function detectCreatorWallet(url) {
    // Check meta tags
    const creatorWallet = await chrome.tabs.executeScript({
        code: `document.querySelector('meta[name="ethereum-address"]')?.content`
    });
    
    // Or check ENS domain
    // Or check creator registry
    
    return creatorWallet;
}

// Split payment
async function splitPayment(total, creatorWallet) {
    const creatorShare = total * 0.7;  // 70% to creator
    const platformShare = total * 0.3; // 30% to AdToll
    
    await sendPayment(creatorWallet, creatorShare);
    await sendPayment(platformWallet, platformShare);
}
```

**Tasks:**
- [ ] Define creator wallet detection methods
- [ ] Create creator registry
- [ ] Implement payment splitting
- [ ] Build creator dashboard
- [ ] Add creator analytics
- [ ] Create creator signup flow

---

#### 9. **Subscription Model**
**Status:** Pay-per-100-blocks only  
**Priority:** MEDIUM  
**Effort:** 3-5 days

**Options:**
```javascript
const plans = {
    payPerUse: {
        price: '$0.01',
        blocks: 100,
        unlimited: false
    },
    monthly: {
        price: '$2.99',
        blocks: 'unlimited',
        period: 30 // days
    },
    yearly: {
        price: '$29.99',
        blocks: 'unlimited',
        period: 365
    }
};
```

**Tasks:**
- [ ] Add subscription logic to backend
- [ ] Create subscription UI
- [ ] Add subscription management
- [ ] Handle renewal notifications
- [ ] Add grace period logic

---

#### 10. **Multi-Language Support**
**Status:** English only  
**Priority:** LOW  
**Effort:** Ongoing

**Tasks:**
- [ ] Extract strings to i18n files
- [ ] Translate to major languages
- [ ] Update extension manifest
- [ ] Test in different locales

---

## Launch Checklist

### Phase 1: Core Functionality (Week 1-2)
- [ ] Integrate AnySpend SDK
- [ ] Set up PostgreSQL database
- [ ] Deploy backend to production (HTTPS)
- [ ] Test payment flow end-to-end
- [ ] Fix any critical bugs

### Phase 2: Production Ready (Week 3)
- [ ] Create payment UI modal
- [ ] Write privacy policy & ToS
- [ ] Remove dev-only code
- [ ] Set up monitoring (Sentry)
- [ ] Write automated tests
- [ ] Security audit

### Phase 3: Store Submission (Week 4)
- [ ] Design store assets (icons, screenshots)
- [ ] Create Chrome Web Store account
- [ ] Submit extension for review
- [ ] Set up support channels
- [ ] Prepare marketing materials

### Phase 4: Soft Launch (Week 5-6)
- [ ] Beta test with small group
- [ ] Gather feedback
- [ ] Fix reported issues
- [ ] Monitor metrics
- [ ] Iterate based on data

### Phase 5: Public Launch (Week 7)
- [ ] Public announcement
- [ ] Marketing push
- [ ] Monitor for issues
- [ ] Scale infrastructure as needed

---

## Estimated Timeline

**Minimum Viable Production (MVP):**
- **Timeline:** 2-3 weeks
- **Includes:** Items 1-4 (AnySpend, Database, HTTPS, Store)

**Full Production Release:**
- **Timeline:** 4-6 weeks
- **Includes:** Items 1-7 (adds Testing, Monitoring, Payment UI)

**Feature Complete:**
- **Timeline:** 8-12 weeks
- **Includes:** Items 1-10 (all features)

---

## Budget Estimate

### One-Time Costs
- Chrome Web Store developer account: $5
- SSL certificate: $0 (Let's Encrypt)
- Logo/design work: $0-500 (DIY or hire)

### Monthly Costs (MVP)
- Server hosting (Railway/Heroku): $10-25/month
- Database (PostgreSQL): Included or $10/month
- Domain name: $12/year ($1/month)
- **Total:** ~$20-35/month

### Monthly Costs (Production)
- Server hosting: $50-100/month (scaled)
- Database: $25-50/month
- Monitoring (Sentry): $26/month (team plan)
- Analytics: $0-25/month
- **Total:** ~$100-200/month

---

## Risk Assessment

### Critical Risks

1. **AnySpend Integration Complexity**
   - Risk: SDK may not work as expected
   - Mitigation: Test thoroughly on testnet first
   - Fallback: Direct smart contract interaction

2. **Chrome Web Store Rejection**
   - Risk: Extension violates store policies
   - Mitigation: Follow guidelines carefully
   - Fallback: Firefox Add-ons, Edge store

3. **Payment Processing Issues**
   - Risk: Failed payments, lost quota
   - Mitigation: Comprehensive testing, transaction logs
   - Fallback: Manual quota restoration

4. **Scalability**
   - Risk: Can't handle many users
   - Mitigation: Load testing, auto-scaling
   - Fallback: Rate limiting, queue system

---

## Next Immediate Steps (This Week)

### Priority 1: Get Payments Working
```bash
# 1. Install AnySpend SDK
cd extension/chromium
npm install @anyspend/sdk

# 2. Implement payment signature
# Edit: extension/chromium/js/x402-payment.js
# Add: processPayment() function

# 3. Test on Base Sepolia
# Get testnet USDC
# Try complete payment flow
```

### Priority 2: Set Up Database
```bash
# 1. Install PostgreSQL locally
brew install postgresql  # Mac
sudo apt install postgresql  # Linux

# 2. Create database
createdb adtoll_dev

# 3. Install driver
cd backend
npm install pg

# 4. Update backend code
# Replace Map with database queries
```

### Priority 3: Deploy to Production
```bash
# 1. Create Railway account
# railway.app

# 2. Connect GitHub repo
# Auto-deploy on push

# 3. Add environment variables
# In Railway dashboard

# 4. Deploy!
```

---

## Resources

### Tutorials Needed
- [ ] AnySpend SDK integration guide
- [ ] Base blockchain testnet setup
- [ ] PostgreSQL with TypeScript
- [ ] Chrome extension testing
- [ ] Chrome Web Store submission

### Documentation to Read
- [AnySpend Docs](https://docs.anyspend.io)
- [Base Developer Docs](https://docs.base.org)
- [Chrome Extension Publishing](https://developer.chrome.com/docs/webstore/publish)
- [x402 Protocol Spec](https://x402.org)

---

## Success Metrics

### Week 1
- [ ] Successful test payment on testnet
- [ ] Database storing quotas persistently
- [ ] Backend deployed with HTTPS

### Month 1
- [ ] Extension in Chrome Web Store
- [ ] 100+ installs
- [ ] 10+ successful payments
- [ ] Zero critical bugs

### Month 3
- [ ] 1,000+ active users
- [ ] Payment success rate >95%
- [ ] Creator revenue sharing live
- [ ] Featured in tech press

---

**Current Phase:** 🟢 MVP Complete, Ready for Production Work

**Next Phase:** 🔴 Critical Production Features (Weeks 1-2)

**Status:** On track for public launch in 4-6 weeks with focused effort

