import { ethers } from 'hardhat';
import 'dotenv/config';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', await deployer.getAddress());

  const balanceBefore = await ethers.provider.getBalance(deployer.address);
  console.log('Balance before:', ethers.formatEther(balanceBefore), 'MATIC');

  try {
    console.log('Deploying MockUSDC (simple ERC20)...');
    const MockUSDC = await ethers.getContractFactory('MockUSDC');

    // Deploy with initial supply of 1M USDC (6 decimals)
    const initialSupply = ethers.parseUnits('1000000', 6);
    const mockUSDC = await MockUSDC.deploy(initialSupply);
    await mockUSDC.waitForDeployment();

    const address = await mockUSDC.getAddress();
    console.log('MockUSDC deployed to:', address);

    const balanceAfter = await ethers.provider.getBalance(deployer.address);
    console.log('Balance after:', ethers.formatEther(balanceAfter), 'MATIC');
    console.log('Gas cost:', ethers.formatEther(balanceBefore - balanceAfter), 'MATIC');
  } catch (error) {
    console.error('Deployment failed:', (error as Error).message);
  }
}

main().catch((e) => (console.error(e), process.exit(1)));
