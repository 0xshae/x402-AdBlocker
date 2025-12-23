# AdPayBlock Backend Server

Backend server for the x402 Ad Blocker, implementing the x402 protocol for micropayments on Base blockchain.

## Features

- **x402 Protocol Implementation**: Handles payment verification using AnySpend
- **Quota Management**: In-memory tracking of user ad-blocking quotas
- **Payment Integration**: Automatic quota top-up on successful payment verification
- **Base Blockchain**: Supports Base and Base Sepolia networks

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   - `ADMIN_WALLET`: Your wallet address to receive payments
   - `NETWORK`: `base-sepolia` (testnet) or `base` (mainnet)
   - `PAYMENT_AMOUNT`: Amount per quota renewal (e.g., `$0.01`)

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### POST `/renew-quota`

Renew ad-blocking quota for a user.

**Request Body:**
```json
{
  "walletAddress": "0x..."
}
```

**Response (200 OK - Has Quota):**
```json
{
  "success": true,
  "message": "Quota decremented",
  "remainingQuota": 99
}
```

**Response (402 Payment Required - No Quota):**
Returns standard x402 headers:
- `x-402-amount`: Payment amount
- `x-402-currency`: Currency (USDC)
- `x-402-address`: Admin wallet address
- `x-402-network`: Network (base-sepolia/base)

**Response (200 OK - Payment Verified):**
```json
{
  "success": true,
  "message": "Payment successful. Quota topped up.",
  "remainingQuota": 99
}
```

### GET `/quota/:walletAddress`

Check current quota for a wallet address.

**Response:**
```json
{
  "walletAddress": "0x...",
  "remainingQuota": 50
}
```

### GET `/health`

Health check endpoint.

## Architecture

1. **Quota Check**: When `/renew-quota` is called, the server first checks if the user has remaining quota.
2. **Quota Available**: If quota > 0, decrement by 1 and return 200 OK.
3. **Quota Exhausted**: If quota <= 0, the payment middleware intercepts and returns 402 Payment Required.
4. **Payment Verification**: If `PAYMENT-SIGNATURE` header is present, the middleware verifies the payment.
5. **Quota Top-up**: On successful verification, user's quota is topped up (default: +100 blocks).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `ADMIN_WALLET` | Wallet address to receive payments | Required |
| `NETWORK` | Blockchain network | `base-sepolia` |
| `PAYMENT_AMOUNT` | Amount per quota renewal | `$0.01` |
| `FACILITATOR_URL` | Custom payment facilitator URL | (optional) |
| `CDP_CLIENT_KEY` | CDP client key for paywall | (optional) |

## Notes

- Quota storage is in-memory and will reset on server restart
- For production, consider implementing persistent storage (database)
- The payment middleware automatically handles x402 protocol compliance

