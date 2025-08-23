import { ethers } from 'hardhat';

async function main() {
  console.log('🔌 Testing network connection...');

  try {
    const [deployer] = await ethers.getSigners();
    console.log('✅ Got signer:', await deployer.getAddress());

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log('✅ Got balance:', ethers.formatEther(balance), 'MATIC');

    const network = await ethers.provider.getNetwork();
    console.log('✅ Connected to network:', network.name, 'chain', network.chainId);

    const blockNumber = await ethers.provider.getBlockNumber();
    console.log('✅ Current block:', blockNumber);

    console.log('🎉 Network connection is working!');
  } catch (error) {
    console.log('❌ Network connection failed:', (error as Error).message);
  }
}

main();
