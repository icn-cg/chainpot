# Chainpot DevOps Quick Reference

## 🚀 Quick Start Commands

### Full Development Environment (Blockchain + Web)
```bash
# Start MockUSDC environment (6 decimals, 100 mUSDC entry fees)
pnpm run dev:mockusdc

# Start MockETH environment (18 decimals, 0.1 mETH entry fees)
pnpm run dev:mocketh

# Check current environment status
pnpm run dev:status
```

### Quick Environment Switching (if blockchain running)
```bash
pnpm run switch:mockusdc   # Switch to MockUSDC setup
pnpm run switch:mocketh    # Switch to MockETH setup
pnpm run switch:mainnet    # Switch to mainnet USDC setup
pnpm run switch:list       # List all available setups
```

### Blockchain Management
```bash
pnpm run chain:start              # Start Hardhat node (port 8547)
pnpm run chain:deploy:mockusdc    # Deploy MockUSDC contracts
pnpm run chain:deploy:mocketh     # Deploy MockETH contracts
pnpm run chain:test               # Run contract tests
pnpm run chain:compile            # Compile contracts
```

### Web App Commands
```bash
pnpm run web:dev      # Start Next.js dev server
pnpm run web:build    # Build for production
pnpm run web:start    # Start production server
```

## 🌍 Environment Overview

### 1. Mainnet Production (Chain ID: 137)
- Token: Real USDC on Polygon
- Network: Polygon Mainnet
- Deployment: Vercel production
- Factory: `0x40ec018CDa28e11c3BfF23487dcE6102459A25B9`

### 2. MockUSDC Development (Chain ID: 31337)
- Token: MockUSDC (6 decimals)
- Network: Local Hardhat fork of Polygon
- Entry Fees: 100 mUSDC
- Port: 8547
- Factory: Deployed locally

### 3. MockETH Development (Chain ID: 31337)
- Token: MockETH (18 decimals)
- Network: Local Hardhat fork of Polygon
- Entry Fees: 0.1 mETH
- Port: 8547
- Factory: Deployed locally

## 🔧 MetaMask Setup

### Add Local Network
```
Network Name: Hardhat Local
RPC URL: http://127.0.0.1:8547
Chain ID: 31337
Currency Symbol: ETH
```

### Import Tokens
- MockUSDC: `0xe5bB50Cf598eC6c6D635938bF814ad25c2ea68Fb` (6 decimals)
- MockETH: `0x42308B98Bf42F39b32F45755bcf8A31FD7EA1719` (18 decimals)

## 🛝 Development Workflow

### Option 1: Full Startup (Recommended)
```bash
# Starts everything: blockchain + contracts + web app
pnpm run dev:mockusdc
```

### Option 2: Manual Control
```bash
# Start blockchain
pnpm run chain:start

# Deploy contracts (in another terminal)
pnpm run chain:deploy:mockusdc

# Switch environment
pnpm run switch:mockusdc

# Start web app (in another terminal)
pnpm run web:dev
```

## 🚢 Production Deployment

### Vercel Deployment
```bash
pnpm run deploy:vercel    # Deploy to production
pnpm run deploy:preview   # Deploy preview
pnpm run env:prod-check   # Check environment variables
```

### Environment Isolation
- Production: Uses mainnet USDC (Chain ID 137)
- Development: Uses local mocks (Chain ID 31337)
- No crossover: Impossible to accidentally deploy mocks to mainnet

## 📦 Useful URLs

### Development (MockUSDC)
- Web App: http://localhost:3000
- AdminPanel: http://localhost:3000/pool/0xABb5cd949730f4f0d00a0E2b9abDD6727632ddF9/admin
- Blockchain RPC: http://127.0.0.1:8547

### Development (MockETH)
- Web App: http://localhost:3000
- AdminPanel: http://localhost:3000/pool/0x78e1fF0D4D00A4c708195d29Ba614b30912EB171/admin
- Blockchain RPC: http://127.0.0.1:8547

## 🧩 Troubleshooting

### Port Conflicts
```bash
# Check what's using port 8547
lsof -i:8547

# Kill hardhat processes
pkill -f "hardhat node"
```

### Reset Environment
```bash
# Clean everything
pnpm run clean
pnpm run install:all

# Restart development
pnpm run dev:mockusdc
```

### Wrong Network Error
```bash
# Check current setup
pnpm run dev:status

# Switch to correct environment
pnpm run switch:mockusdc
```

## 📄 Environment Files

### chain/.env
- Contains all environment variables for all setups
- Organized by: MAINNET_, LOCAL_MOCKUSDC_, LOCAL_MOCKETH_

### apps/web/.env.local
- Automatically managed by switch commands
- Contains only active environment variables
- Never commit this file

## 🔒 Production Safety

- Mainnet variables isolated from development
- Local chain ID (31337) prevents mainnet accidents
- Mock tokens cannot be deployed to mainnet
- Environment switching validates configurations
- Vercel deployment uses only mainnet variables
