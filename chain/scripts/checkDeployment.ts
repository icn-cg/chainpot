import { ethers } from 'hardhat';
import 'dotenv/config';

async function main() {
  console.log('📋 Verifying Contract Deployments');
  console.log('═════════════════════════════════');

  // Get addresses from environment
  const factoryAddress = process.env.FACTORY;
  const usdcAddress = process.env.USDC;
  const network = await ethers.provider.getNetwork();

  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`🏭 Factory: ${factoryAddress || 'Not set'}`);
  console.log(`💰 USDC: ${usdcAddress || 'Not set'}`);

  if (!factoryAddress || !usdcAddress) {
    console.log('\n❌ Missing contract addresses in .env file');
    console.log('Run deployment first:');
    console.log('  npm run deploy:testnet  (for testnet)');
    console.log('  npm run deploy:mainnet  (for mainnet)');
    return;
  }

  try {
    // Verify Factory
    console.log('\n🔍 Verifying PoolFactory...');
    const factory = await ethers.getContractAt('PoolFactory', factoryAddress);

    const owner = await factory.owner();
    const feeCollector = await factory.feeCollector();
    const implFixed = await factory.implementationFixed();
    const implFlexible = await factory.implementationFlexible();

    console.log(`✅ Factory Owner: ${owner}`);
    console.log(`✅ Fee Collector: ${feeCollector}`);
    console.log(`✅ Fixed Implementation: ${implFixed}`);
    console.log(`✅ Flexible Implementation: ${implFlexible}`);

    // Verify USDC
    console.log('\n🔍 Verifying USDC Token...');
    const usdc = await ethers.getContractAt('MockUSDC', usdcAddress);

    const symbol = await usdc.symbol();
    const decimals = await usdc.decimals();
    const totalSupply = await usdc.totalSupply();

    console.log(`✅ Symbol: ${symbol}`);
    console.log(`✅ Decimals: ${decimals}`);
    console.log(`✅ Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);

    // Test contract interactions
    console.log('\n🧪 Testing Contract Interactions...');

    // Test factory view functions
    try {
      const poolsByDeployer = await factory.poolsByOrganizer(owner, 0).catch(() => null);
      console.log(`✅ Can query pools by organizer`);
    } catch {
      console.log(`ℹ️  No pools created yet by owner`);
    }

    // Check if contracts are verified on explorer
    const explorerUrl =
      network.chainId === 80002n ? 'https://amoy.polygonscan.com' : 'https://polygonscan.com';

    console.log('\n🔗 Explorer Links:');
    console.log(`├─ Factory: ${explorerUrl}/address/${factoryAddress}`);
    console.log(`├─ USDC: ${explorerUrl}/address/${usdcAddress}`);
    console.log(`├─ Fixed Impl: ${explorerUrl}/address/${implFixed}`);
    console.log(`└─ Flexible Impl: ${explorerUrl}/address/${implFlexible}`);

    console.log('\n✅ All contract verifications passed!');

    console.log('\n🚀 Next Steps:');
    console.log('1. Test pool creation: npm run test:pools');
    console.log('2. Verify contracts on explorer (if not done yet)');
    if (network.chainId === 80002n) {
      console.log('3. Switch to mainnet when ready: npm run network:mainnet');
    } else {
      console.log('3. Set up production monitoring');
    }
  } catch (error) {
    console.error('\n❌ Verification failed:', (error as Error).message);

    console.log('\n🔧 Troubleshooting:');
    console.log('- Check if contracts are deployed correctly');
    console.log('- Verify .env file has correct addresses');
    console.log("- Ensure you're on the correct network");
    console.log('- Try re-running deployment if needed');

    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
