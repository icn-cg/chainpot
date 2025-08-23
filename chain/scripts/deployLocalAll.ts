import { ethers } from 'hardhat';
import 'dotenv/config';

async function deploy<T extends object>(name: string, ...args: any[]) {
  const F = await ethers.getContractFactory(name);
  const feeData = await ethers.provider.getFeeData();
  const opts: any = {};
  // On localhost this generally isn't needed, but it's harmless and future-proof
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

  // 1) MockUSDC (10M supply to deployer)
  const initialSupply = ethers.parseUnits('10000000', 6);
  const usdc = await deploy('MockUSDC', initialSupply);
  const usdcAddr = await usdc.getAddress();

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

  // 3) A sample Fixed pool, initialized with MockUSDC
  const pool = await deploy('PoolEscrowFixed');
  const poolAddr = await pool.getAddress();

  const entryUnit = ethers.parseUnits('100', 6); // 100 USDC
  const now = Math.floor(Date.now() / 1000);
  const endTime = BigInt(now + 24 * 3600); // +1 day
  await (await pool.initialize(
    deployerAddr, // organizer
    usdcAddr, // token
    entryUnit, // entryUnit
    endTime, // endTime
    false, // restricted
    500, // referralBps (5%)
    0, // feePolicy
    ethers.ZeroHash, // merkleRoot
    deployerAddr // feeCollector
  )).wait();
  console.log('✅ Fixed pool initialized');

  console.log('\n--- Local deployment complete ---');
  console.log('MOCK_USDC =', usdcAddr);
  console.log('POOL_FACTORY =', factoryAddr);
  console.log('FIXED_POOL =', poolAddr);
  console.log('\nSuggested .env updates:');
  console.log('chain/.env ->');
  console.log(`  MOCK_USDC=${usdcAddr}`);
  console.log('apps/web/.env.local ->');
  console.log('  NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545');
  console.log('  NEXT_PUBLIC_CHAIN_ID=31337');
  console.log(`  NEXT_PUBLIC_USDC_ADDRESS=${usdcAddr}`);
  console.log(`  NEXT_PUBLIC_POOL_FACTORY_ADDRESS=${factoryAddr}`);
  console.log('  NEXT_PUBLIC_DEV_FAUCET=1');
  console.log('\nOpen http://localhost:3000/pool/' + poolAddr + '/admin to use the faucet.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
