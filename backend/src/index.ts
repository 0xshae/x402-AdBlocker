import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { paymentMiddleware } from '@b3dotfun/anyspend-x402-express';
import { Address } from 'viem';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_WALLET = (process.env.ADMIN_WALLET || '0x0000000000000000000000000000000000000000') as Address;
const NETWORK = (process.env.NETWORK || 'base-sepolia') as 'base' | 'base-sepolia';
const PRICE_PER_100_BLOCKS = process.env.PRICE_PER_100_BLOCKS || '$0.01';
const ADMIN_KEY = process.env.ADMIN_KEY;

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
          description: 'AdToll: Pay to block 100 ads'
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
// The x402 middleware intercepts this route:
// - If payment signature is present and valid: Request passes through, top up quota
// - If no payment signature: Return 402, middleware adds x402 headers
app.post('/renew-quota', (req: Request & { paymentReceived?: boolean }, res: Response) => {
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

  // CHECK IF PAYMENT WAS VERIFIED BY MIDDLEWARE
  // When the x402 middleware verifies a valid payment signature,
  // it sets req.paymentReceived = true before passing to this handler
  if (req.paymentReceived) {
    // Payment was successfully verified - top up quota
    const currentQuota = getUserQuota(normalizedAddress);
    const newQuota = currentQuota + 100; // Top up 100 blocks
    setUserQuota(normalizedAddress, newQuota);
    
    console.log(`[${new Date().toISOString()}] ✅ Payment verified! Topped up ${normalizedAddress} to ${newQuota} blocks`);
    
    return res.status(200).json({
      success: true,
      message: 'Payment successful - quota topped up',
      remainingBlocks: newQuota,
      walletAddress: normalizedAddress
    });
  }

  // No payment received - check existing quota
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
    // No quota remaining - return 402 Payment Required
    // The x402 middleware will intercept this 402 response and add the necessary x402 headers
    console.log(`[${new Date().toISOString()}] ⚠️  Payment required for ${normalizedAddress}`);
    
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

  // Secure admin key check
  if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Invalid or missing admin key' 
    });
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
    console.log('║            AdToll x402 Backend Server                 ║');
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
