import { ethers } from "hardhat";

async function main() {
  const initialSupply = ethers.parseUnits("1000000", 6); // 1,000,000 mUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const token = await MockUSDC.deploy(initialSupply);
  await token.waitForDeployment();
  console.log("MockUSDC deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
