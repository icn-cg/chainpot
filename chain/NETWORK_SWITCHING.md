# 🔄 Chainpot Network Switching System

A smooth, bulletproof system for switching between testnet and mainnet deployments.

## 🚀 Quick Start

```bash
# Switch to testnet and deploy everything
npm run deploy:testnet

# Test the deployment
npm run test:pools

# When ready, switch to mainnet
npm run deploy:mainnet
```

## 📋 Available Commands

### Network Management

```bash
npm run network:testnet    # Switch to Polygon Amoy testnet
npm run network:mainnet    # Switch to Polygon mainnet
npm run network:status     # Show current network status
npm run network:list       # List all available networks
```

### Deployment

```bash
npm run deploy:testnet     # Complete testnet deployment
npm run deploy:mainnet     # Production mainnet deployment
```

### Verification & Testing

```bash
npm run check:deployment   # Verify deployed contracts
npm run check:balance      # Check deployer balance
npm run test:pools         # Test pool creation and functionality
```

## 🏗️ What Gets Deployed

### Testnet (Polygon Amoy)

- ✅ MockUSDC (10M initial supply)
- ✅ PoolEscrowFixed implementation
- ✅ PoolEscrowFlexible implementation
- ✅ PoolFactory (with implementations set)
- ✅ All contracts verified on PolygonScan

### Mainnet (Polygon)

- ✅ PoolEscrowFixed implementation
- ✅ PoolEscrowFlexible implementation
- ✅ PoolFactory (with real USDC integration)
- ✅ Gas-optimized deployment
- ✅ Production monitoring ready

## 🔧 Environment Setup

The system automatically manages your `.env` file:

### Testnet Configuration

```bash
USDC=0x81FACaee4e8FA9b984cd63cAB1cC175cd79AFB50  # MockUSDC
FACTORY=[deployed-factory-address]
CURRENT_NETWORK=amoy
CHAIN_ID=80002
```

### Mainnet Configuration

```bash
USDC=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174  # Real USDC
FACTORY=[deployed-factory-address]
CURRENT_NETWORK=polygon
CHAIN_ID=137
```

## 🧪 Testing Flow

1. **Deploy to testnet**: `npm run deploy:testnet`
2. **Verify deployment**: `npm run check:deployment`
3. **Test pool creation**: `npm run test:pools`
4. **Switch to mainnet**: `npm run network:mainnet`
5. **Deploy to mainnet**: `npm run deploy:mainnet`

## 🛡️ Safety Features

### Testnet Safeguards

- Automatic MockUSDC deployment with test funds
- Low gas prices (30 gwei)
- Comprehensive testing before mainnet

### Mainnet Safeguards

- Balance checks before deployment
- Gas price optimization
- Real USDC integration
- Production-ready configurations

## 📊 Status Checking

Check your current setup anytime:

```bash
npm run network:status
```

Output:

```
📍 Current Network: Polygon Amoy (Testnet)
├─ Chain ID: 80002
├─ Explorer: https://amoy.polygonscan.com
├─ USDC: 0x81FACaee4e8FA9b984cd63cAB1cC175cd79AFB50
├─ Factory: 0x[your-factory-address]
└─ Native Currency: MATIC

📋 Deployment Checklist:
   1. MockUSDC deployed and verified
   2. PoolFactory deployed and verified
   3. PoolEscrowFixed implementation deployed
   4. PoolEscrowFlexible implementation deployed
   5. Factory owner permissions verified
   6. USDC token balance checks working
```

## 🚨 Troubleshooting

### Common Issues

**"Insufficient balance"**

```bash
# Get testnet MATIC
curl https://faucet.polygon.technology/

# Check balance
npm run check:balance
```

**"Contract not found"**

```bash
# Re-run deployment
npm run deploy:testnet

# Verify deployment
npm run check:deployment
```

**"Wrong network"**

```bash
# Check current network
npm run network:status

# Switch networks
npm run network:testnet  # or mainnet
```

## 📁 File Structure

```
scripts/
├── networkSwitch.ts      # Main network switching logic
├── deployComplete.ts     # Complete testnet deployment
├── deployMainnet.ts      # Production mainnet deployment
├── testPool.ts          # Pool creation testing
├── checkDeployment.ts   # Contract verification
└── checkBalance.ts      # Balance checking
```

## 🎯 Next Steps After Deployment

1. **Verify contracts** on PolygonScan
2. **Update frontend** environment variables
3. **Test pool creation** thoroughly
4. **Set up monitoring** (mainnet only)
5. **Configure alerts** for production

---

**Ready to switch networks smoothly!** 🌟
