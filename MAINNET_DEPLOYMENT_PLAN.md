# Mainnet Deployment Plan

This document describes the safe, repeatable steps for deploying Chainpot contracts to Polygon mainnet and validating the deployment. It assumes the repository has been tested on Amoy (testnet) and that CI/deployer keys and environment variables are available.

Goals
- Deploy PoolEscrowFixed, PoolEscrowFlexible, and PoolFactory to Polygon mainnet.
- Integrate with real USDC token address.
- Verify contracts on Polygonscan and run basic sanity checks.

Pre-flight checklist
- Ensure CI or deployer machine has the `DEPLOYER_KEY` and `ETHERSCAN_API_KEY` set in the environment or `.env`.
- Confirm deployer wallet has sufficient MATIC (recommended >= 5 MATIC for safety; check `checkBalance.ts`).
- Run the full test suite and testnet deploy, verify behavior on Amoy.
- Confirm `chain/package.json` scripts are correct and `networkSwitch.ts` / `.env` are configured for `polygon`.

High-level steps
1. Prepare environment
	- Set `CURRENT_NETWORK=polygon` and `CHAIN_ID=137` in `.env`
	- Set `USDC` to the mainnet USDC address (e.g. `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`).
2. Sanity checks
	- Run `npm run check:balance` (in `chain`) to confirm deployer balance.
	- Run `npm run check:gas` (or `checkGasPrices.ts`) to estimate gas recommendations.
3. Deploy contracts
	- Run the production deploy script (this repo: `npx hardhat run scripts/deployMainnet.ts --network polygon` via `npm run deploy:mainnet`).
	- Capture all deployed addresses and transaction hashes in a deployment log.
4. Post-deploy verification
	- Verify implementations and factory on Polygonscan using `npx hardhat verify` or `verify:all` script.
	- Run `npx hardhat run scripts/checkDeployment.ts --network polygon` to confirm contracts and expected owners/parameters.
5. Frontend update
	- Update the frontend `.env` with new `FACTORY` and `USDC` addresses and deploy the web app.
6. Monitoring & alerts
	- Add contract addresses to any production monitoring, observability, and alerting tools.

Rollback & safety
- If a production deployment is faulty, do NOT reuse the same proxy/implementation addresses without careful review — prefer to deploy replacement implementations and update factory config if possible.
- Keep a recovery plan (owner multisig, timelock) and required private key custody documented.

Acceptance criteria
- All contracts are deployed and verified on Polygonscan.
- `checkDeployment.ts` reports the expected owners, implementations, and token addresses.
- Frontend is updated and can create and interact with pools using real USDC.

Appendix: quick commands
```bash
# From the `chain` folder
# Ensure .env points to mainnet
npm run network:mainnet

# Check deployer balance
npm run check:balance

# Estimate gas and costs
node scripts/checkGasPrices.ts

# Deploy to mainnet (careful)
npm run deploy:mainnet

# Verify and inspect
npm run check:deployment
```

