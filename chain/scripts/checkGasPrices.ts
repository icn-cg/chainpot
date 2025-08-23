import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 Checking current gas prices on Amoy...\n');

  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const maxFee = feeData.maxFeePerGas || 0n;
  const priorityFee = feeData.maxPriorityFeePerGas || 0n;

  console.log('Current Gas Prices:');
  console.log('- Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');
  console.log('- Max Fee:', ethers.formatUnits(maxFee, 'gwei'), 'gwei');
  console.log('- Priority Fee:', ethers.formatUnits(priorityFee, 'gwei'), 'gwei');

  // Estimate deployment costs with different gas prices
  const PoolEscrowFixed = await ethers.getContractFactory('PoolEscrowFixed');
  const estimatedGas = await ethers.provider.estimateGas({
    data: (await PoolEscrowFixed.getDeployTransaction()).data,
  });

  console.log('\n💰 Estimated Costs per Contract:');
  console.log('- Gas needed:', estimatedGas.toString());

  const costs = [
    { name: 'Current Price', price: gasPrice },
    { name: 'Conservative (+10%)', price: (gasPrice * 110n) / 100n },
    { name: 'Aggressive (+50%)', price: (gasPrice * 150n) / 100n },
    { name: 'Max (100 gwei)', price: ethers.parseUnits('100', 'gwei') },
  ];

  costs.forEach(({ name, price }) => {
    const cost = estimatedGas * price;
    const costInMatic = ethers.formatEther(cost);
    const priceInGwei = ethers.formatUnits(price, 'gwei');
    console.log(`- ${name}: ${costInMatic} MATIC (${priceInGwei} gwei)`);
  });

  console.log('\n📊 Total for 3 contracts (PoolEscrowFixed + PoolEscrowFlexible + PoolFactory):');
  costs.forEach(({ name, price }) => {
    const totalCost = estimatedGas * price * 3n; // Estimate for 3 contracts
    const totalInMatic = ethers.formatEther(totalCost);
    console.log(`- ${name}: ~${totalInMatic} MATIC total`);
  });

  // Recommend gas price
  const recommendedGas = (gasPrice * 115n) / 100n; // 15% buffer
  console.log(`\n💡 Recommended gas price: ${ethers.formatUnits(recommendedGas, 'gwei')} gwei`);
  console.log(`   (Current + 15% buffer to ensure fast confirmation)`);
}

main().catch(console.error);
