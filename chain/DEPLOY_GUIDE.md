# Deployment Guide

This guide covers step-by-step instructions to deploy Chainpot contracts to a network (testnet or mainnet). It assumes you have Node.js, pnpm/npm and the repository checked out.

Prerequisites
- Node.js (>=18) and pnpm or npm installed.
- `DEPLOYER_KEY` (private key) available in the environment or `.env`.
- `ETHERSCAN_API_KEY` for contract verification.
- Enough native tokens (MATIC) in the deployer account.

Local setup
1. Install dependencies from repository root:

```bash
pnpm install
# or
npm install
```

2. Copy `.env.example` to `.env` and fill in keys:

```bash
cp .env.example .env
# Edit .env to add DEPLOYER_KEY, ETHERSCAN_API_KEY, ALCHEMY URLs, etc.
```

Deploying to testnet (Amoy)
1. Switch environment to testnet (optional helper):

```bash
npm run network:testnet
```

2. Deploy to testnet:

```bash
npx hardhat run scripts/deployComplete.ts --network amoy
```

3. Verify contracts (if the script supports verification):

```bash
npm run verify:all
```

4. Run checks:

```bash
npm run check:deployment
npm run test:pools
```

Deploying to mainnet (Polygon)
> WARNING: Mainnet deployments are irreversible and cost real funds. Double-check keys, balances and owners.

1. Switch to mainnet environment:

```bash
npm run network:mainnet
```

2. Pre-flight checks:

```bash
npm run check:balance
# Optionally estimate gas
node scripts/checkGasPrices.ts
```

3. Deploy to mainnet (carefully):

```bash
npx hardhat run scripts/deployMainnet.ts --network polygon
```

4. Verify contracts on Polygonscan:

```bash
npm run verify:all
```

Post-deploy
- Save deployed addresses, tx hashes, and update frontend `.env` with `FACTORY` and `USDC` values.
- Update monitoring and alerting to cover these contracts.

Troubleshooting
- If gas is too low or transactions hang, increase buffer using `checkGasPrices.ts` recommendations.
- For contract verification errors, confirm compiler version and settings in `hardhat.config.ts` and use the `--force` verification options if supported.

Support
- For live help, reach out to the deployment owner or check internal runbooks.
