# chainpot

## Quick Start

Prereqs: pnpm, Node 18+.

1) Install deps at repo root
	pnpm install

2) Start local fork (optional, recommended for testing)
	# ensure ALCHEMY_POLYGON_URL is set in chain/.env to enable forking
	pnpm run chain:start

3) Deploy local mock + factory (optional)
	pnpm run chain:deploy:mockusdc
	# copy printed addresses to apps/web/.env.local (switch scripts handle this for you)

4) Run the web app
	pnpm run web:dev

Open http://localhost:3000

## Documentation

- DevOps Quick Reference: ./docs/DEVOPS_QUICK_REFERENCE.md
- DevOps Strategy: ./docs/DEVOPS_STRATEGY.md
- Environment Organization: ./docs/ENV_ORGANIZATION.md
- Network Switching (chain): ./chain/NETWORK_SWITCHING.md
- Deployment Guide: ./docs/DEPLOY_GUIDE.md
- Mainnet Deployment Plan: ./docs/MAINNET_DEPLOYMENT_PLAN.md
- MetaMask Setup: ./docs/METAMASK_SETUP.md
