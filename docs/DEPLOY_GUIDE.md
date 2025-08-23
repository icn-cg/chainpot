# Deployment Guide

This guide covers step-by-step instructions to deploy Chainpot contracts to a network (testnet or mainnet). It assumes you have Node.js and pnpm installed.

## Prerequisites

- Node.js (>=18) and pnpm installed
- `DEPLOYER_KEY` (private key) available in the environment or `chain/.env`
- `ETHERSCAN_API_KEY` for contract verification
- Enough native tokens (MATIC) in the deployer account

## Local setup

1) Install dependencies from repository root
```bash
pnpm install
```

2) Copy `.env.example` to `.env` and fill in keys (inside `chain/`)
```bash
cd chain
cp .env.example .env
# Edit .env to add DEPLOYER_KEY, ETHERSCAN_API_KEY, ALCHEMY URLs, etc.
```

## Deploying to testnet (Amoy)

1) Switch environment to testnet
```bash
cd chain
pnpm run network:testnet
```

2) Deploy to testnet
```bash
pnpm run deploy:testnet
```

3) Verify and check
```bash
pnpm run verify:all
pnpm run check:deployment
```

## Deploying to mainnet (Polygon)

> WARNING: Mainnet deployments are irreversible and cost real funds. Double-check keys, balances and owners.

1) Switch to mainnet environment
```bash
cd chain
pnpm run network:mainnet
```

2) Pre-flight checks
```bash
pnpm run check:balance
# Optionally estimate gas
node scripts/checkGasPrices.ts
```

3) Deploy to mainnet (carefully)
```bash
pnpm run deploy:mainnet
```

4) Verify contracts on Polygonscan
```bash
pnpm run verify:all
```

## Post-deploy

- Save deployed addresses, tx hashes, and update frontend env with `NEXT_PUBLIC_POOL_FACTORY_ADDRESS` and token addresses.
- Update monitoring and alerting to cover these contracts.

## Troubleshooting

- If gas is too low or transactions hang, increase buffer using `checkGasPrices.ts` recommendations.
- For contract verification errors, confirm compiler version and settings in `hardhat.config.ts` and use the `--force` verification options if supported.
