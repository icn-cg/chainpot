import { ethers } from 'hardhat';
import 'dotenv/config';

async function deployWithRetry(contractName: string, args: any[] = [], retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const Contract = await ethers.getContractFactory(contractName);

      // Get current gas price and add buffer for testnet
      const feeData = await ethers.provider.getFeeData();
      const gasPrice = feeData.gasPrice
        ? (feeData.gasPrice * 120n) / 100n
        : ethers.parseUnits('60', 'gwei'); // Add 20% buffer

      console.log(`Using gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
      const contract = await Contract.deploy(...args, { gasPrice });

      console.log(`${contractName} deployment tx:`, contract.deploymentTransaction()?.hash);
      console.log('Waiting for confirmation (this may take a few minutes on Amoy)...');

      // Don't wait forever - timeout after 5 minutes
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Deployment timeout')), 300000)
      );

      await Promise.race([contract.waitForDeployment(), timeoutPromise]);

      return await contract.getAddress();
    } catch (e) {
      console.warn(`Deploy attempt ${i} for ${contractName} failed:`, (e as Error).message);
      if (i === retries) throw e;
      console.log(`Retrying in 10 seconds...`);
      await new Promise((r) => setTimeout(r, 10000)); // wait 10s between retries
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', await deployer.getAddress());

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'MATIC');

  // Deploy implementation contracts first
  console.log('Deploying PoolEscrowFixed implementation...');
  const fixedImpl = await deployWithRetry('PoolEscrowFixed');
  console.log('PoolEscrowFixed implementation:', fixedImpl);

  console.log('Deploying PoolEscrowFlexible implementation...');
  const flexibleImpl = await deployWithRetry('PoolEscrowFlexible');
  console.log('PoolEscrowFlexible implementation:', flexibleImpl);

  // Fee collector is the company wallet
  const feeCollector = '0x2B6378c2602665b4D1706977aa66d2396D0482fA';

  // Owner will be the deployer
  const owner = await deployer.getAddress();

  console.log('Deploying PoolFactory...');
  const factoryAddr = await deployWithRetry('PoolFactory', [
    fixedImpl,
    flexibleImpl,
    feeCollector,
    owner,
  ]);

  console.log('\n=== DEPLOYMENT COMPLETE ===');
  console.log('PoolEscrowFixed implementation:', fixedImpl);
  console.log('PoolEscrowFlexible implementation:', flexibleImpl);
  console.log('PoolFactory:', factoryAddr);
  console.log('Fee Collector:', feeCollector);
  console.log('Owner:', owner);

  console.log('\n=== UPDATE YOUR .env.local ===');
  console.log(`POOL_FACTORY_ADDRESS=${factoryAddr}`);
  console.log(`FEE_COLLECTOR_ADDRESS=${feeCollector}`);
}

main().catch((e) => (console.error(e), process.exit(1)));
