import 'dotenv/config';
import { ethers } from 'hardhat';

async function main() {
  console.log('Inspecting pools for deployer on configured network');
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  console.log('Deployer:', deployerAddr);

  const factoryAddr = process.env.FACTORY;
  if (!factoryAddr) {
    console.error('FACTORY not set in .env');
    process.exit(1);
  }
  console.log('Factory:', factoryAddr);

  const Factory = await ethers.getContractAt('PoolFactory', factoryAddr);
  const pools: string[] = await Factory.getPoolsByOrganizer(deployerAddr);
  console.log('Pools by deployer:', pools.length);
  pools.forEach((p, i) => console.log(`  [${i}] ${p}`));

  if (pools.length === 0) return;
  const pool = pools[0];
  console.log('\nInspecting pool', pool);
  try {
    const impl = await ethers.getContractAt('PoolEscrowFixed', pool).catch(() => null as any);
    if (impl) {
      const token = await impl.token();
      const entryUnit = await impl.entryUnit();
      const endTime = await impl.endTime();
      const poolBalance = await impl.getPoolBalance();
      const contributors = await impl.getContributors();
      const joined = await impl.joined(deployerAddr);
      console.log(' token:', token);
      console.log(' entryUnit:', entryUnit.toString());
      console.log(' entryUnit formatted:', ethers.formatUnits(entryUnit, 6));
      console.log(' endTime:', endTime.toString());
      console.log(' poolBalance:', ethers.formatUnits(poolBalance, 6));
      console.log(' contributors count:', contributors.length);
      console.log(' deployer joined:', joined);
    } else {
      console.log(
        'Could not attach PoolEscrowFixed interface; maybe flexible pool or different ABI.'
      );
    }
  } catch (e: any) {
    console.error('Inspect error', e?.message || e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
