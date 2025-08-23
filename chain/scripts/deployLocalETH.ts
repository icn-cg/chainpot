import { ethers } from 'hardhat';
import 'dotenv/config';

async function deploy<T extends object>(name: string, ...args: any[]) {
  const F = await ethers.getContractFactory(name);
  const feeData = await ethers.provider.getFeeData();
  const opts: any = {};
  if (feeData.maxFeePerGas) opts.maxFeePerGas = feeData.maxFeePerGas;
  if (feeData.maxPriorityFeePerGas) opts.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

  const c = await F.deploy(...args, opts);
  const hash = c.deploymentTransaction()?.hash;
  if (hash) console.log(`${name} tx: ${hash}`);
  await c.waitForDeployment();
  const addr = await (c as any).getAddress();
  console.log(`✅ ${name} deployed at ${addr}`);
  return c as any;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  console.log('Deployer:', deployerAddr);

  const bal = await ethers.provider.getBalance(deployerAddr);
  console.log('Balance:', ethers.formatEther(bal), 'ETH');

  // Deploy MockETH - an ERC20 token that behaves like ETH for testing
  const ethToken = await deploy('MockETH', ethers.parseUnits('1000000', 18)); // 1M tokens with 18 decimals
  const ethTokenAddr = await ethToken.getAddress();

  // 2) Implementations + Factory
  const fixedImpl = await deploy('PoolEscrowFixed');
  const flexibleImpl = await deploy('PoolEscrowFlexible');
  const factory = await deploy(
    'PoolFactory',
    await fixedImpl.getAddress(),
    await flexibleImpl.getAddress(),
    deployerAddr, // feeCollector
    deployerAddr // owner
  );
  const factoryAddr = await factory.getAddress();

  // 3) A sample Fixed pool using the ETH-like token (18 decimals)
  const pool = await deploy('PoolEscrowFixed');
  const poolAddr = await pool.getAddress();

  const entryUnit = ethers.parseUnits('0.1', 18); // 0.1 ETH equivalent
  const now = Math.floor(Date.now() / 1000);
  const endTime = BigInt(now + 24 * 3600); // +1 day
  await (await pool.initialize(
    deployerAddr, // organizer
    ethTokenAddr, // token (our mock ETH)
    entryUnit, // entryUnit
    endTime, // endTime
    false, // restricted
    500, // referralBps (5%)
    0, // feePolicy
    ethers.ZeroHash, // merkleRoot
    deployerAddr // feeCollector
  )).wait();
  console.log('✅ Fixed pool initialized with ETH-like token');

  console.log('\n--- Local ETH deployment complete ---');
  console.log('MOCK_ETH_TOKEN =', ethTokenAddr);
  console.log('POOL_FACTORY =', factoryAddr);
  console.log('FIXED_POOL =', poolAddr);
  console.log('\nSuggested .env updates:');
  console.log('chain/.env ->');
  console.log(`  MOCK_ETH=${ethTokenAddr}`);
  console.log('apps/web/.env.local ->');
  console.log('  NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8547');
  console.log('  NEXT_PUBLIC_CHAIN_ID=31337');
  console.log(`  NEXT_PUBLIC_USDC_ADDRESS=${ethTokenAddr}  # Using as pool token`);
  console.log(`  NEXT_PUBLIC_POOL_FACTORY_ADDRESS=${factoryAddr}`);
  console.log('  NEXT_PUBLIC_DEV_FAUCET=1');
  console.log('\nOpen http://localhost:3000/pool/' + poolAddr + '/admin to use the faucet.');
  console.log('\n💡 Note: This uses a mock ERC20 token instead of native ETH for easier testing.');
  console.log('The faucet will transfer mock tokens (18 decimals) that behave like ETH amounts.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
