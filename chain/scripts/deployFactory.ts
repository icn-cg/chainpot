import { ethers } from "hardhat";
import "dotenv/config";

async function deployWithRetry(retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const Factory = await ethers.getContractFactory("LeagueFactory");
      const factory = await Factory.deploy();
      await factory.waitForDeployment();
      return await factory.getAddress();
    } catch (e) {
      console.warn(`Deploy attempt ${i} failed:`, (e as Error).message);
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 5000)); // wait 5s
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());

  const addr = await deployWithRetry(3);
  console.log("LeagueFactory:", addr);
}
main().catch((e) => (console.error(e), process.exit(1)));
