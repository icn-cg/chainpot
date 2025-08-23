# DevOps Environment Management

## Overview
- Production (Vercel): Always uses mainnet USDC (Chain ID 137)
- Local Development: Choose between MockUSDC or MockETH (Chain ID 31337)
- Git Safety: Prod configs are never committed to avoid accidents

## Environment Strategy

### 1. Production (Vercel Deploy)
```bash
# Vercel Environment Variables (set in Vercel dashboard)
NEXT_PUBLIC_CHAIN_ID=137
NEXT_PUBLIC_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_USDC_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
NEXT_PUBLIC_POOL_FACTORY_ADDRESS=0x1066566B2665379a95a442E1694C20Bc9deE2b8e
NEXT_PUBLIC_DEV_FAUCET=0  # DISABLED in production
```

### 2. Local Development
```bash
# apps/web/.env.local (gitignored, safe to modify)
# Switched automatically by pnpm scripts
```

## Simple Commands

### Production Deployment
```bash
# Deploy to Vercel (automatically uses mainnet)
pnpm run deploy:vercel
```

### Local Development
```bash
# Start local blockchain + MockUSDC setup
pnpm run dev:mockusdc

# Start local blockchain + MockETH setup
pnpm run dev:mocketh

# Quick switch without restarting (if blockchain already running)
pnpm run switch:mockusdc
pnpm run switch:mocketh
pnpm run switch:mainnet  # for testing mainnet config locally
```

### Blockchain Management
```bash
# Start fresh local blockchain
pnpm run chain:start

# Deploy contracts to running chain
pnpm run chain:deploy:mockusdc
pnpm run chain:deploy:mocketh

# Run tests against local chain
pnpm run chain:test
```

## File Structure
```
├── apps/web/
│   ├── .env.local          # Local dev (gitignored)
│   ├── .env.example        # Template for local dev
│   └── .env.production     # Template for Vercel
├── chain/
│   ├── .env                # Chain dev settings (gitignored)
│   └── .env.example        # Template for chain dev
└── scripts/
    ├── dev-start.sh        # Unified dev startup
    ├── switch-env.sh       # Environment switcher
    └── deploy-vercel.sh    # Production deployment
```

## Git Safety
- All `.env` files are gitignored
- Only `.env.example` templates are committed
- Production configs never leak to development
- Development configs never leak to production
