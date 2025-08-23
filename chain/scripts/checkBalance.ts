import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log('Wallet:', await deployer.getAddress());
  console.log('Balance:', ethers.formatEther(balance), 'MATIC');
  console.log('Network:', (await ethers.provider.getNetwork()).name);

  if (balance >= ethers.parseEther('0.5')) {
    console.log('✅ Ready to deploy! You have enough MATIC.');
  } else {
    console.log('⚠️  Need more MATIC for full deployment.');
  }
}

main().catch(console.error);
