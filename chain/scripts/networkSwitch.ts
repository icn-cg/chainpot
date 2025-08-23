#!/usr/bin/env npx ts-node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface NetworkConfig {
  name: string;
  displayName: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: string;
  testnet: boolean;
  contracts: {
    usdc?: string;
    factory?: string;
    mockUsdc?: string;
  };
  deploymentChecks: string[];
}

const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    name: 'amoy',
    displayName: 'Polygon Amoy (Testnet)',
    chainId: 80002,
    rpcUrl: process.env.ALCHEMY_AMOY_URL || 'https://rpc-amoy.polygon.technology/',
    explorerUrl: 'https://amoy.polygonscan.com',
    nativeCurrency: 'MATIC',
    testnet: true,
    contracts: {
      usdc: '0x81FACaee4e8FA9b984cd63cAB1cC175cd79AFB50', // Mock USDC on testnet
      factory: process.env.FACTORY || '',
      mockUsdc: '0x81FACaee4e8FA9b984cd63cAB1cC175cd79AFB50',
    },
    deploymentChecks: [
      'MockUSDC deployed and verified',
      'PoolFactory deployed and verified',
      'PoolEscrowFixed implementation deployed',
      'PoolEscrowFlexible implementation deployed',
      'Factory owner permissions verified',
      'USDC token balance checks working',
    ],
  },
  mainnet: {
    name: 'polygon',
    displayName: 'Polygon Mainnet',
    chainId: 137,
    rpcUrl: process.env.ALCHEMY_POLYGON_URL || '',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: 'MATIC',
    testnet: false,
    contracts: {
      usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Real USDC on mainnet
      factory: '', // Will be set after deployment
    },
    deploymentChecks: [
      'PoolFactory deployed and verified',
      'PoolEscrowFixed implementation deployed',
      'PoolEscrowFlexible implementation deployed',
      'Factory owner permissions verified',
      'Real USDC integration verified',
      'Gas price optimization configured',
    ],
  },
};

class NetworkSwitcher {
  private currentNetwork: string;
  private envPath: string;
  private envBackupPath: string;

  constructor() {
    this.envPath = join(__dirname, '../.env');
    this.envBackupPath = join(__dirname, '../.env.backup');
    this.currentNetwork = this.detectCurrentNetwork();
  }

  private detectCurrentNetwork(): string {
    if (!existsSync(this.envPath)) {
      console.log('⚠️  No .env file found. Will create one.');
      return 'testnet';
    }

    const envContent = readFileSync(this.envPath, 'utf8');
    const factoryLine = envContent.match(/^FACTORY=(.*)$/m);
    const usdcLine = envContent.match(/^USDC=(.*)$/m);

    if (usdcLine && usdcLine[1] === NETWORKS.mainnet.contracts.usdc) {
      return 'mainnet';
    }
    return 'testnet';
  }

  private backupEnv(): void {
    if (existsSync(this.envPath)) {
      writeFileSync(this.envBackupPath, readFileSync(this.envPath));
      console.log('📁 Backed up current .env to .env.backup');
    }
  }

  private updateEnvFile(network: NetworkConfig): void {
    let envContent = '';

    if (existsSync(this.envPath)) {
      envContent = readFileSync(this.envPath, 'utf8');
    }

    // Update or add network-specific variables
    const updates: Record<string, string> = {
      USDC: network.contracts.usdc || '',
      FACTORY: network.contracts.factory || '',
      CURRENT_NETWORK: network.name,
      CHAIN_ID: network.chainId.toString(),
    };

    // If switching to testnet, ensure we have MockUSDC
    if (network.testnet && network.contracts.mockUsdc) {
      updates['MOCK_USDC'] = network.contracts.mockUsdc;
    }

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }

    writeFileSync(this.envPath, envContent);
    console.log(`📝 Updated .env for ${network.displayName}`);
  }

  private async checkDeploymentStatus(networkName: string): Promise<void> {
    const network = NETWORKS[networkName];
    console.log(`\n🔍 Checking deployment status on ${network.displayName}...`);

    try {
      // Check balance
      const balanceResult = execSync(
        `npx hardhat run scripts/checkBalance.ts --network ${network.name}`,
        { cwd: __dirname + '/..', encoding: 'utf8' }
      );
      console.log('✅ Balance check passed');

      // Check factory if deployed
      if (network.contracts.factory) {
        const factoryResult = execSync(
          `npx hardhat run scripts/checkFactory.ts --network ${network.name}`,
          { cwd: __dirname + '/..', encoding: 'utf8' }
        );
        console.log('✅ Factory check passed');
      } else {
        console.log('⚠️  Factory not deployed yet');
      }
    } catch (error) {
      console.log('❌ Some deployment checks failed:', (error as Error).message);
    }
  }

  private printNetworkStatus(networkName: string): void {
    const network = NETWORKS[networkName];
    console.log(`\n📊 ${network.displayName} Status:`);
    console.log(`├─ Chain ID: ${network.chainId}`);
    console.log(`├─ Explorer: ${network.explorerUrl}`);
    console.log(`├─ USDC: ${network.contracts.usdc || 'Not set'}`);
    console.log(`├─ Factory: ${network.contracts.factory || 'Not deployed'}`);
    console.log(`└─ Native Currency: ${network.nativeCurrency}`);

    console.log('\n📋 Deployment Checklist:');
    network.deploymentChecks.forEach((check, i) => {
      console.log(`   ${i + 1}. ${check}`);
    });
  }

  public async switch(targetNetwork: string): Promise<void> {
    if (!NETWORKS[targetNetwork]) {
      console.log(`❌ Unknown network: ${targetNetwork}`);
      console.log(`Available networks: ${Object.keys(NETWORKS).join(', ')}`);
      return;
    }

    const network = NETWORKS[targetNetwork];

    console.log(
      `🔄 Switching from ${NETWORKS[this.currentNetwork].displayName} to ${network.displayName}...`
    );

    // Backup current env
    this.backupEnv();

    // Update environment
    this.updateEnvFile(network);

    // Check deployment status
    await this.checkDeploymentStatus(targetNetwork);

    // Show network status
    this.printNetworkStatus(targetNetwork);

    this.currentNetwork = targetNetwork;
    console.log(`\n✅ Successfully switched to ${network.displayName}!`);

    // Provide next steps
    this.suggestNextSteps(targetNetwork);
  }

  private suggestNextSteps(networkName: string): void {
    const network = NETWORKS[networkName];

    console.log('\n🚀 Suggested next steps:');

    if (!network.contracts.factory) {
      if (network.testnet) {
        console.log('1. Deploy complete testnet setup:');
        console.log('   npx hardhat run scripts/deployComplete.ts --network amoy');
      } else {
        console.log('1. Deploy to mainnet (CAREFUL!):');
        console.log('   npx hardhat run scripts/deployMainnet.ts --network polygon');
      }
    } else {
      console.log('1. Test current deployment:');
      console.log(`   npx hardhat run scripts/checkDeployment.ts --network ${network.name}`);
    }

    console.log('2. Verify contracts on explorer');
    console.log('3. Update frontend environment variables');

    if (network.testnet) {
      console.log('4. Test pool creation and deposits');
      console.log('5. Switch to mainnet when ready: npm run network:mainnet');
    } else {
      console.log('4. Monitor gas prices and optimize');
      console.log('5. Set up monitoring and alerts');
    }
  }

  public status(): void {
    console.log(`\n📍 Current Network: ${NETWORKS[this.currentNetwork].displayName}`);
    this.printNetworkStatus(this.currentNetwork);
  }

  public list(): void {
    console.log('\n🌐 Available Networks:');
    Object.entries(NETWORKS).forEach(([key, network]) => {
      const current = key === this.currentNetwork ? ' (current)' : '';
      console.log(`├─ ${key}: ${network.displayName}${current}`);
    });
  }
}

// CLI Interface
async function main() {
  const switcher = new NetworkSwitcher();
  const command = process.argv[2];

  switch (command) {
    case 'testnet':
      await switcher.switch('testnet');
      break;
    case 'mainnet':
      await switcher.switch('mainnet');
      break;
    case 'status':
      switcher.status();
      break;
    case 'list':
      switcher.list();
      break;
    default:
      console.log('🔧 Chainpot Network Switcher');
      console.log('\nUsage:');
      console.log('  npx ts-node scripts/networkSwitch.ts <command>');
      console.log('\nCommands:');
      console.log('  testnet  - Switch to Polygon Amoy testnet');
      console.log('  mainnet  - Switch to Polygon mainnet');
      console.log('  status   - Show current network status');
      console.log('  list     - List all available networks');
      console.log('\nQuick commands:');
      console.log('  npm run network:testnet  - Switch to testnet');
      console.log('  npm run network:mainnet  - Switch to mainnet');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { NetworkSwitcher, NETWORKS };
