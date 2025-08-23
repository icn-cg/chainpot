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

# 🔄 Chainpot Network Switching System

A compact, reliable guide for switching deployments between testnet and mainnet.

## 🚀 Quick start

```bash
# Switch to testnet and run a full test deployment
npm run deploy:testnet

# Run pool tests
npm run test:pools

# When ready, deploy to mainnet
npm run deploy:mainnet
```

## 📋 Available commands

### Network management

```bash
npm run network:testnet    # Switch to Polygon Amoy (testnet)
npm run network:mainnet    # Switch to Polygon mainnet
npm run network:status     # Show current network status
npm run network:list       # List configured networks
```

### Deployment

```bash
npm run deploy:testnet     # Complete testnet deployment
npm run deploy:mainnet     # Production mainnet deployment (use with caution)
```

### Verification & testing

```bash
npm run check:deployment   # Verify deployed contracts
npm run check:balance      # Check deployer / CI balance
npm run test:pools         # Test pool creation and behaviour
```

## 🏗️ What gets deployed

### Testnet (Polygon Amoy)

- MockUSDC (10M initial supply)
- PoolEscrowFixed implementation
- PoolEscrowFlexible implementation
- PoolFactory (with implementations set)
- Contracts verified on Amoy Polygonscan when possible

### Mainnet (Polygon)

- PoolEscrowFixed implementation
- PoolEscrowFlexible implementation
- PoolFactory (integrated with real USDC)
- Gas-optimized deployment process
- Production monitoring and alerting

## 🔧 Environment setup

The repository scripts will update `.env` when switching networks. Key values:

### Testnet

```bash
USDC=0x81FACaee4e8FA9b984cd63cAB1cC175cd79AFB50  # MockUSDC
FACTORY=[deployed-factory-address]
CURRENT_NETWORK=amoy
CHAIN_ID=80002
```

### Mainnet

```bash
USDC=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174  # Real USDC
FACTORY=[deployed-factory-address]
CURRENT_NETWORK=polygon
CHAIN_ID=137
```

## 🧪 Testing flow

1. Deploy to testnet: `npm run deploy:testnet`
2. Verify deployment: `npm run check:deployment`
3. Test pool creation: `npm run test:pools`
4. Switch to mainnet: `npm run network:mainnet`
5. Deploy to mainnet: `npm run deploy:mainnet`

## 🛡️ Safety features

### Testnet safeguards

- Automatic MockUSDC deployment for tests
- Encouraged low gas settings for CI/debugging
- Full test suite run before mainnet

### Mainnet safeguards

- Balance checks before any production deployment
- Gas-price recommendations based on `checkGasPrices.ts`
- Real USDC integration verification
- Monitoring and alerting hooks suggested

## 📊 Status checking

Run:

```bash
npm run network:status
```

Example output:

```
📍 Current Network: Polygon Amoy (Testnet)
├─ Chain ID: 80002
├─ Explorer: https://amoy.polygonscan.com
├─ USDC: 0x81FACaee4e8FA9b984cd63cAB1cC175cd79AFB50
├─ Factory: 0x[your-factory-address]
└─ Native Currency: MATIC

Deployment checklist:
 1. MockUSDC deployed and verified
 2. PoolFactory deployed and verified
 3. PoolEscrowFixed implementation deployed
 4. PoolEscrowFlexible implementation deployed
 5. Factory owner permissions verified
 6. USDC token balance checks working
```

## 🚨 Troubleshooting

Common issues and quick commands:

**Insufficient balance**

```bash
# Get testnet MATIC
curl https://faucet.polygon.technology/

# Check balance
npm run check:balance
```

**Contract not found**

```bash
# Re-run deployment
npm run deploy:testnet

# Verify deployment
npm run check:deployment
```

**Wrong network**

```bash
# Check current network
npm run network:status

# Switch networks
npm run network:testnet  # or mainnet
```

## 📁 Relevant scripts

```
scripts/
├── networkSwitch.ts      # Main network switching logic
├── deployComplete.ts     # Complete testnet deployment
├── deployMainnet.ts      # Production mainnet deployment
├── testPool.ts           # Pool creation testing
├── checkDeployment.ts    # Contract verification
└── checkBalance.ts       # Balance checking
```

## 🎯 Next steps after deployment

1. Verify contracts on Polygonscan
2. Update frontend `.env` and redeploy web when addresses change
3. Exercise pool creation end-to-end on testnet
4. Set up monitoring and alerts for mainnet
5. Perform a dry-run mainnet deploy in a gated environment

---

Ready to switch networks smoothly! 🌟
