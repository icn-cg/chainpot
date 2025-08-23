# Mainnet Deployment Plan

This document describes the safe, repeatable steps for deploying Chainpot contracts to Polygon mainnet and validating the deployment. It assumes the repository has been tested on Amoy (testnet) and that deployer keys and environment variables are available.

## Goals

- Deploy PoolEscrowFixed, PoolEscrowFlexible, and PoolFactory to Polygon mainnet.
- Integrate with real USDC token address.
- Verify contracts on Polygonscan and run basic sanity checks.

## Pre-flight checklist

- Ensure the deployer machine has `DEPLOYER_KEY` and `ETHERSCAN_API_KEY` set in the environment or `chain/.env`.
- Confirm deployer wallet has sufficient MATIC (recommended ≥ 5 MATIC for safety; see `scripts/checkBalance.ts`).
- Run the full test suite locally and deploy to Amoy for validation.
- Confirm `chain/package.json` scripts are correct and `networkSwitch.ts` / `.env` are configured for `polygon`.

## High-level steps

1) Prepare environment
- Set `CURRENT_NETWORK=polygon` and `CHAIN_ID=137` in `chain/.env`
- Set `USDC` to the mainnet USDC address (e.g. `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`).

2) Sanity checks (from `chain/`)
- pnpm run check:balance
- node scripts/checkGasPrices.ts (optional)

3) Deploy contracts (from `chain/`)
- pnpm run deploy:mainnet
  - This runs `npx hardhat run scripts/deployMainnet.ts --network polygon` under the hood.

4) Post-deploy verification
- pnpm run check:deployment
- pnpm run verify:all (or run `npx hardhat verify ...` directly)

5) Frontend update
- Update `apps/web/.env.production` or Vercel env with new `NEXT_PUBLIC_POOL_FACTORY_ADDRESS` (and confirm `NEXT_PUBLIC_USDC_ADDRESS`).
- Deploy the web app.

6) Monitoring & alerts
- Add contract addresses to production monitoring/observability.

## Rollback & safety

- If a production deployment is faulty, avoid reusing the same implementation addresses without review — prefer redeploying replacements and updating the factory if applicable.
- Ensure owner multisig/timelock and custody procedures are documented and accessible.

## Acceptance criteria

- Contracts deployed and verified on Polygonscan.
- `checkDeployment.ts` reports expected owners, implementations, and token addresses.
- Frontend updated and can create and interact with pools using real USDC.

## Appendix: quick commands (from `chain/`)

```bash
# Ensure .env points to mainnet
pnpm run network:mainnet

# Check deployer balance
pnpm run check:balance

# Estimate gas and costs (optional)
node scripts/checkGasPrices.ts

# Deploy to mainnet (careful)
pnpm run deploy:mainnet

# Verify and inspect
pnpm run check:deployment
pnpm run verify:all
```
