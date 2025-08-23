#!/usr/bin/env npx ts-node

import { writeFileSync } from 'fs';
import { join } from 'path';

interface SetupConfig {
  name: string;
  description: string;
  chainConfig: {
    chainId: string;
    rpcUrl: string;
    usdcAddress: string;
    factoryAddress: string;
    devFaucet: string;
  };
  poolDetails: {
    entryAmount: string;
    decimals: number;
    symbol: string;
    poolAddress?: string;
  };
}

const SETUPS: Record<string, SetupConfig> = {
  mainnet: {
    name: 'Polygon Mainnet',
    description: 'Real USDC on Polygon mainnet',
    chainConfig: {
      chainId: '137',
      rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/Ru78J-mEuqo53UlrtvEj-',
      usdcAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      factoryAddress: '0x1066566B2665379a95a442E1694C20Bc9deE2b8e',
      devFaucet: '0',
    },
    poolDetails: {
      entryAmount: '100 USDC',
      decimals: 6,
      symbol: 'USDC',
    },
  },
  mockusdc: {
    name: 'Local MockUSDC',
    description: 'Local testing with 6-decimal MockUSDC (mainnet-like)',
    chainConfig: {
      chainId: '31337',
      rpcUrl: 'http://127.0.0.1:8547',
      usdcAddress: '0xB34f80c178263CCcC95F35e44Fb88132e3797f47',
      factoryAddress: '0x53bF131478eC5211Bf16DFF9b53810Cab54D4AF9',
      devFaucet: '1',
    },
    poolDetails: {
      entryAmount: '100 mUSDC',
      decimals: 6,
      symbol: 'mUSDC',
      poolAddress: '0x79fb36dcfC36B740543977dA41666BF99e2a9dE0',
    },
  },
  mocketh: {
    name: 'Local MockETH',
    description: 'Local testing with 18-decimal MockETH (ETH-like)',
    chainConfig: {
      chainId: '31337',
      rpcUrl: 'http://127.0.0.1:8547',
      usdcAddress: '0x42308B98Bf42F39b32F45755bcf8A31FD7EA1719',
      factoryAddress: '0xa95c778C25e2560f8232Af1121985082AD64EF8f',
      devFaucet: '1',
    },
    poolDetails: {
      entryAmount: '0.1 mETH',
      decimals: 18,
      symbol: 'mETH',
      poolAddress: '0x78e1fF0D4D00A4c708195d29Ba614b30912EB171',
    },
  },
};

function generateWebEnv(setup: SetupConfig): string {
  return `NEXT_PUBLIC_CHAIN_ID=${setup.chainConfig.chainId}
NEXT_PUBLIC_POOL_FACTORY_ADDRESS=${setup.chainConfig.factoryAddress}
NEXT_PUBLIC_USDC_ADDRESS=${setup.chainConfig.usdcAddress}
NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS=0x2B6378c2602665b4D1706977aa66d2396D0482fA
NEXT_PUBLIC_REOWN_PROJECT_ID=b797724655447d3fff341c98b77052f1 # from dashboard.reown.com

# optional, used in metadata fallback
NEXT_PUBLIC_DAPP_URL=http://localhost:3000
NEXT_PUBLIC_RPC_URL=${setup.chainConfig.rpcUrl}
NEXT_PUBLIC_DEV_FAUCET=${setup.chainConfig.devFaucet}
NEXT_DEBUG=true
# NODE_OPTIONS="--trace-uncaught"
`;
}

function switchSetup(setupName: string): void {
  const setup = SETUPS[setupName];
  if (!setup) {
    console.log(`❌ Unknown setup: ${setupName}`);
    console.log(`Available setups: ${Object.keys(SETUPS).join(', ')}`);
    return;
  }

  console.log(`🔄 Switching to ${setup.name}...`);
  console.log(`📝 ${setup.description}`);

  // Update web .env.local
  const webEnvPath = join(__dirname, '../../apps/web/.env.local');
  const webEnvContent = generateWebEnv(setup);
  writeFileSync(webEnvPath, webEnvContent);
  console.log(`✅ Updated apps/web/.env.local`);

  // Display setup info
  console.log(`\n📊 Setup Details:`);
  console.log(`   Chain ID: ${setup.chainConfig.chainId}`);
  console.log(`   RPC URL: ${setup.chainConfig.rpcUrl}`);
  console.log(`   Token: ${setup.poolDetails.symbol} (${setup.poolDetails.decimals} decimals)`);
  console.log(`   Factory: ${setup.chainConfig.factoryAddress}`);
  console.log(`   Entry Amount: ${setup.poolDetails.entryAmount}`);
  console.log(`   Dev Faucet: ${setup.chainConfig.devFaucet === '1' ? 'Enabled' : 'Disabled'}`);

  if (setup.poolDetails.poolAddress) {
    console.log(`   Test Pool: ${setup.poolDetails.poolAddress}`);
    console.log(`\n🔗 AdminPanel URL:`);
    console.log(`   http://localhost:3000/pool/${setup.poolDetails.poolAddress}/admin`);
  }

  console.log(`\n📋 MetaMask Token Import:`);
  console.log(`   Contract: ${setup.chainConfig.usdcAddress}`);
  console.log(`   Symbol: ${setup.poolDetails.symbol}`);
  console.log(`   Decimals: ${setup.poolDetails.decimals}`);

  console.log(`\n✅ Switch complete! Restart the web app if it's running.`);
}

function listSetups(): void {
  console.log('\n🌐 Available Setups:');
  Object.entries(SETUPS).forEach(([key, setup]) => {
    console.log(`   ${key}: ${setup.name} - ${setup.description}`);
  });
}

// CLI Interface
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'mainnet':
      switchSetup('mainnet');
      break;
    case 'mockusdc':
      switchSetup('mockusdc');
      break;
    case 'mocketh':
      switchSetup('mocketh');
      break;
    case 'list':
      listSetups();
      break;
    default:
      console.log('🔧 Chainpot Setup Switcher');
      console.log('\nUsage:');
      console.log('  npx ts-node scripts/switchSetup.ts <setup>');
      console.log('\nSetups:');
      console.log('  mainnet   - Polygon mainnet with real USDC');
      console.log('  mockusdc  - Local with MockUSDC (6 decimals)');
      console.log('  mocketh   - Local with MockETH (18 decimals)');
      console.log('  list      - Show all available setups');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { switchSetup, SETUPS };
