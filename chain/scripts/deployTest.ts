import { ethers } from 'hardhat';
import 'dotenv/config';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', await deployer.getAddress());
  console.log(
    'Balance before:',
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    'MATIC'
  );

  try {
    console.log('Deploying PoolEscrowFixed...');
    const Contract = await ethers.getContractFactory('PoolEscrowFixed');

    // Estimate gas first
    const deployTx = await Contract.getDeployTransaction();
    const gasEstimate = await ethers.provider.estimateGas(deployTx);
    const gasPrice = (await ethers.provider.getFeeData()).gasPrice;
    const estimatedCost = gasEstimate * gasPrice!;

    console.log('Estimated gas:', gasEstimate.toString());
    console.log('Gas price:', ethers.formatUnits(gasPrice!, 'gwei'), 'gwei');
    console.log('Estimated cost:', ethers.formatEther(estimatedCost), 'MATIC');

    // Deploy with lower gas price
    const contract = await Contract.deploy({ gasPrice: ethers.parseUnits('20', 'gwei') });
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log('PoolEscrowFixed deployed to:', address);

    console.log(
      'Balance after:',
      ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
      'MATIC'
    );
  } catch (error) {
    console.error('Deployment failed:', (error as Error).message);
  }
}

main().catch((e) => (console.error(e), process.exit(1)));
