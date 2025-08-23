# chainpot

## Quick Start

Prereqs: pnpm, Node 18+.

1) Install deps at repo root
	pnpm install

2) Start local fork (optional, recommended for testing)
	cd chain
	# ensure ALCHEMY_POLYGON_URL is set in chain/.env to enable forking
	npx hardhat node

3) Deploy local mock + factory (optional)
	cd chain
	npx hardhat run scripts/deployLocalAll.ts --network localhost
	# copy printed addresses to apps/web/.env.local

4) Run the web app
	pnpm --filter ./apps/web dev

Open http://localhost:3000
