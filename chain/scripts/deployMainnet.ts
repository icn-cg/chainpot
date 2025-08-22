import { ethers } from 'hardhat';
import 'dotenv/config';

async function deployContract(contractName: string, args: any[] = []) {
  const Contract = await ethers.getContractFactory(contractName);

  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice
    ? (feeData.gasPrice * 110n) / 100n
    : ethers.parseUnits('35', 'gwei');

  console.log(`Deploying ${contractName}...`);
  const contract = await Contract.deploy(...args, { gasPrice });

  console.log(`Transaction: https://polygonscan.com/tx/${contract.deploymentTransaction()?.hash}`);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ ${contractName}: ${address}\n`);
  return address;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', await deployer.getAddress());

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'MATIC');

  if (balance < ethers.parseEther('0.1')) {
    console.log('❌ Need at least 0.1 MATIC. Get MATIC first!');
    return;
  }

  // Deploy contracts
  const fixedImpl = await deployContract('PoolEscrowFixed');
  const flexibleImpl = await deployContract('PoolEscrowFlexible');

  const feeCollector = await deployer.getAddress(); // Use deployer as fee collector
  const factoryAddr = await deployContract('PoolFactory', [
    fixedImpl,
    flexibleImpl,
    feeCollector,
    feeCollector, // owner
  ]);

  console.log('🎉 DEPLOYMENT COMPLETE');
  console.log(`PoolFactory: ${factoryAddr}`);
  console.log(`\nAdd to your .env.local:`);
  console.log(`NEXT_PUBLIC_POOL_FACTORY_ADDRESS=${factoryAddr}`);
}

main().catch(console.error);
