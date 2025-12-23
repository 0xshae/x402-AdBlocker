import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { paymentMiddleware } from '@b3dotfun/anyspend-x402-express';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database to track user quotas
// Map<walletAddress, remainingBlocks>
const userQuotas: Map<string, number> = new Map();

// Default quota top-up amount (blocks)
const QUOTA_TOP_UP = 100;

// Get admin wallet address from environment (default to a placeholder)
const ADMIN_WALLET = process.env.ADMIN_WALLET || '0x0000000000000000000000000000000000000000';

/**
 * Configure payment middleware for /renew-quota endpoint
 * This middleware will:
 * 1. Check if X-PAYMENT header is present
 * 2. If not present, return 402 Payment Required
 * 3. If present, verify the payment
 * 4. If verified, call next() to continue
 */
const x402Middleware = paymentMiddleware(
  ADMIN_WALLET as `0x${string}`, // payTo address
  {
    '/renew-quota': {
      price: process.env.PAYMENT_AMOUNT || '$0.01', // USDC amount in dollars
      network: process.env.NETWORK || 'base-sepolia', // Base network
      config: {
        description: 'Ad blocker quota renewal'
      }
    }
  },
  // Optional facilitator configuration
  process.env.FACILITATOR_URL ? {
    url: process.env.FACILITATOR_URL
  } : undefined,
  // Optional paywall configuration
  process.env.CDP_CLIENT_KEY ? {
    cdpClientKey: process.env.CDP_CLIENT_KEY,
    appName: 'AdPayBlock',
    appLogo: '/logo.svg'
  } : undefined
);

/**
 * Custom middleware to check quota before payment verification
 */
const checkQuotaMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ 
      error: 'walletAddress is required in request body' 
    });
  }

  const quota = userQuotas.get(walletAddress) || 0;

  // If user has quota, decrement and return success
  if (quota > 0) {
    userQuotas.set(walletAddress, quota - 1);
    return res.status(200).json({ 
      success: true,
      message: 'Quota decremented',
      remainingQuota: quota - 1
    });
  }

  // If no quota, pass to payment middleware
  // The payment middleware will handle 402 response or payment verification
  next();
};

/**
 * Handler for successful payment verification
 * This is called after the payment middleware verifies payment
 */
const handlePaymentSuccess = (req: Request, res: Response) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ 
      error: 'walletAddress is required' 
    });
  }

  // Top up user's quota
  const currentQuota = userQuotas.get(walletAddress) || 0;
  const newQuota = currentQuota + QUOTA_TOP_UP;
  userQuotas.set(walletAddress, newQuota);

  // Decrement one block for this request
  userQuotas.set(walletAddress, newQuota - 1);

  return res.status(200).json({
    success: true,
    message: 'Payment successful. Quota topped up.',
    remainingQuota: newQuota - 1
  });
};

/**
 * POST /renew-quota
 * 
 * Flow:
 * 1. Check if user has quota
 * 2. If yes: decrement quota and return 200
 * 3. If no: payment middleware handles 402 response or payment verification
 * 4. If payment verified: top up quota and return 200
 */
app.post('/renew-quota', 
  checkQuotaMiddleware,  // First check quota
  x402Middleware,        // Then check/verify payment
  handlePaymentSuccess   // Finally handle successful payment
);

/**
 * GET /quota/:walletAddress
 * Check current quota for a wallet address
 */
app.get('/quota/:walletAddress', (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  const quota = userQuotas.get(walletAddress) || 0;

  return res.status(200).json({
    walletAddress,
    remainingQuota: quota
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 AdPayBlock Backend Server running on port ${port}`);
  console.log(`📊 Admin Wallet: ${ADMIN_WALLET}`);
  console.log(`🌐 Network: ${process.env.NETWORK || 'base-sepolia'}`);
  console.log(`💰 Payment Amount: ${process.env.PAYMENT_AMOUNT || '$0.01'}`);
});

