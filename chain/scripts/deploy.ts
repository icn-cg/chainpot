import { ethers } from "hardhat";

async function main() {
  const LeagueEscrow = await ethers.getContractFactory("LeagueEscrowV2");
  const leagueEscrow = await LeagueEscrow.deploy();
  await leagueEscrow.waitForDeployment();
  console.log("LeagueEscrowV2 deployed to:", await leagueEscrow.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
