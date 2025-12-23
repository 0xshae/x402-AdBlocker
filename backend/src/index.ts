import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { paymentMiddleware } from '@b3dotfun/anyspend-x402-express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_WALLET = process.env.ADMIN_WALLET || '0x0000000000000000000000000000000000000000';
const NETWORK = (process.env.NETWORK || 'base-sepolia') as 'base' | 'base-sepolia';
const PRICE_PER_100_BLOCKS = process.env.PRICE_PER_100_BLOCKS || '$0.01';

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database to track user quotas (User Address -> Remaining Blocks)
const userQuotas = new Map<string, number>();

// Helper function to get or initialize user quota
function getUserQuota(walletAddress: string): number {
  if (!userQuotas.has(walletAddress)) {
    userQuotas.set(walletAddress, 0); // Start with 0 quota
  }
  return userQuotas.get(walletAddress)!;
}

// Helper function to set user quota
function setUserQuota(walletAddress: string, quota: number): void {
  userQuotas.set(walletAddress, quota);
}

// Configure x402 payment middleware
// This middleware will intercept requests and check for payment signatures
app.use(
  paymentMiddleware(
    ADMIN_WALLET, // payTo address - where payments will be sent
    {
      '/renew-quota': {
        price: PRICE_PER_100_BLOCKS, // Cost for 100 blocks
        network: NETWORK,
        config: {
          description: 'AdPayBlock: Pay to block 100 ads'
        }
      }
    }
    // Using default facilitator (x402.org) for testnet
  )
);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    network: NETWORK,
    pricePerBlock: PRICE_PER_100_BLOCKS
  });
});

// Main x402 endpoint: POST /renew-quota
app.post('/renew-quota', (req: Request, res: Response) => {
  const { walletAddress } = req.body;

  // Validate wallet address
  if (!walletAddress) {
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'walletAddress is required in request body'
    });
  }

  // Normalize wallet address (lowercase)
  const normalizedAddress = walletAddress.toLowerCase();

  // Check current quota
  const currentQuota = getUserQuota(normalizedAddress);

  console.log(`[${new Date().toISOString()}] Quota check for ${normalizedAddress}: ${currentQuota} blocks remaining`);

  if (currentQuota > 0) {
    // User has quota remaining - decrement and allow
    setUserQuota(normalizedAddress, currentQuota - 1);
    
    return res.status(200).json({
      success: true,
      message: 'Quota renewed',
      remainingBlocks: currentQuota - 1,
      walletAddress: normalizedAddress
    });
  } else {
    // No quota remaining - payment required
    // The x402 middleware will handle this and add the necessary headers
    console.log(`[${new Date().toISOString()}] Payment required for ${normalizedAddress}`);
    
    return res.status(402).json({
      error: 'Payment Required',
      message: 'Your ad blocking quota has expired. Please pay to continue.',
      remainingBlocks: 0,
      priceFor100Blocks: PRICE_PER_100_BLOCKS
    });
  }
});

// Endpoint to check quota (without decrementing)
app.get('/check-quota/:walletAddress', (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  
  if (!walletAddress) {
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'walletAddress is required'
    });
  }

  const normalizedAddress = walletAddress.toLowerCase();
  const quota = getUserQuota(normalizedAddress);

  res.status(200).json({
    walletAddress: normalizedAddress,
    remainingBlocks: quota
  });
});

// Admin endpoint to manually add quota (for testing)
app.post('/admin/add-quota', (req: Request, res: Response) => {
  const { walletAddress, blocks } = req.body;
  const adminKey = req.headers['x-admin-key'];

  // Simple admin key check (in production, use proper authentication)
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden', message: 'Invalid admin key' });
  }

  if (!walletAddress || typeof blocks !== 'number') {
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'walletAddress and blocks (number) are required'
    });
  }

  const normalizedAddress = walletAddress.toLowerCase();
  const currentQuota = getUserQuota(normalizedAddress);
  setUserQuota(normalizedAddress, currentQuota + blocks);

  res.status(200).json({
    success: true,
    message: 'Quota added',
    walletAddress: normalizedAddress,
    remainingBlocks: currentQuota + blocks
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          AdPayBlock x402 Backend Server               ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Network: ${NETWORK}`);
  console.log(`💰 Price per 100 blocks: ${PRICE_PER_100_BLOCKS}`);
  console.log(`📍 Admin wallet: ${ADMIN_WALLET}`);
  console.log('\n📡 Endpoints:');
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /renew-quota - Renew ad blocking quota`);
  console.log(`   GET  /check-quota/:walletAddress - Check quota`);
  console.log(`   POST /admin/add-quota - Add quota (admin only)`);
  console.log('\n✨ Ready to accept payments via x402 protocol\n');
});

// Note: The x402 middleware automatically handles payment verification.
// When a valid PAYMENT-SIGNATURE header is present:
// 1. The middleware verifies it using AnySpend
// 2. If valid, the request continues to the endpoint
// 3. The endpoint should then grant the quota
//
// We need to detect successful payment and top up quota.
// The middleware will set req.locals or similar to indicate successful payment.
// Since the middleware documentation doesn't show this clearly, we may need to
// adjust this logic after testing with the actual middleware behavior.
