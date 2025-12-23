# AdPayBlock Backend Server

The x402-compliant backend server for the AdPayBlock browser extension. This server handles micropayments for ad blocking using the AnySpend protocol on Base blockchain.

## 🏗️ Architecture

This backend acts as an **x402 Resource Server** that:
- Tracks user ad blocking quotas (blocks remaining)
- Returns `402 Payment Required` when quota is exhausted
- Verifies payment signatures using AnySpend middleware
- Settles transactions on Base blockchain (User → Admin Wallet)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A wallet address on Base (or Base Sepolia for testing)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Configuration

Edit `.env` file:

```env
# Server port
PORT=3000

# Your wallet address (receives payments)
ADMIN_WALLET=0xYourWalletAddressHere

# Network: 'base' for mainnet, 'base-sepolia' for testnet
NETWORK=base-sepolia

# Price per 100 ad blocks (in USDC)
PRICE_PER_100_BLOCKS=$0.01

# Admin key for manual quota management
ADMIN_KEY=your-secure-random-string
```

### Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production build
npm run build
npm start
```

## 📡 API Endpoints

### Health Check
```http
GET /health
```

Returns server status and configuration.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-24T10:00:00.000Z",
  "network": "base-sepolia",
  "pricePerBlock": "$0.01"
}
```

---

### Renew Quota (x402 Protected)
```http
POST /renew-quota
Content-Type: application/json

{
  "walletAddress": "0x..."
}
```

**Behavior:**
- If user has quota: Decrements quota and returns 200 OK
- If quota exhausted: Returns 402 Payment Required with x402 headers
- If valid payment signature provided: Verifies payment and tops up quota (+100 blocks)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Quota renewed",
  "remainingBlocks": 99,
  "walletAddress": "0x..."
}
```

**Payment Required Response (402):**
```json
{
  "error": "Payment Required",
  "message": "Your ad blocking quota has expired. Please pay to continue.",
  "remainingBlocks": 0,
  "priceFor100Blocks": "$0.01"
}
```

The 402 response includes x402 protocol headers automatically added by the middleware.

---

### Check Quota
```http
GET /check-quota/:walletAddress
```

Check remaining blocks without decrementing quota.

**Response:**
```json
{
  "walletAddress": "0x...",
  "remainingBlocks": 50
}
```

---

### Admin: Add Quota
```http
POST /admin/add-quota
Content-Type: application/json
X-Admin-Key: your-admin-key

{
  "walletAddress": "0x...",
  "blocks": 100
}
```

Manually add quota for testing purposes.

## 🔐 x402 Protocol Flow

1. **Extension makes request** to `/renew-quota` with wallet address
2. **Server checks quota:**
   - ✅ Quota available → Decrement and return 200
   - ❌ No quota → Return 402 with payment headers
3. **Extension sees 402** and prompts user for payment
4. **User signs payment** using AnySpend SDK
5. **Extension retries request** with `PAYMENT-SIGNATURE` header
6. **Middleware verifies signature** and settles on-chain
7. **Server tops up quota** (+100 blocks) and returns 200

## 🧪 Testing

### Manual Testing with curl

```bash
# Health check
curl http://localhost:3000/health

# Check quota (should be 0 initially)
curl http://localhost:3000/check-quota/0xYourAddress

# Try to renew (should get 402)
curl -X POST http://localhost:3000/renew-quota \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xYourAddress"}'

# Add quota manually (for testing)
curl -X POST http://localhost:3000/admin/add-quota \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: dev-admin-key-12345" \
  -d '{"walletAddress":"0xYourAddress","blocks":100}'

# Try to renew again (should succeed now)
curl -X POST http://localhost:3000/renew-quota \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xYourAddress"}'
```

## 🛠️ Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Payment Protocol:** x402 (via `@b3dotfun/anyspend-x402-express`)
- **Blockchain:** Base (Coinbase L2)
- **Settlement:** AnySpend (chain-agnostic facilitator)

## 📝 Notes

- The server uses an **in-memory database** (Map) for quota tracking
- For production, replace with a persistent database (PostgreSQL, Redis, etc.)
- The x402 middleware handles all payment verification automatically
- Default facilitator is x402.org (suitable for testnet)
- For mainnet, consider running your own facilitator

## 🔗 Integration with Extension

The browser extension should:
1. Track blocked ads count
2. Every 100 blocks, call `/renew-quota`
3. If 402 received, prompt user for payment
4. Sign payment with AnySpend SDK
5. Retry request with signature
6. Continue blocking on success

## 📚 Resources

- [x402 Protocol Spec](https://x402.org)
- [AnySpend Documentation](https://docs.anyspend.io)
- [Base Network](https://base.org)

## 📄 License

ISC
