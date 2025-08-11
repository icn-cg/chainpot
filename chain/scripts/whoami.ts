import { ethers } from "hardhat";
import { toNumberSafe } from "../../apps/web/src/lib/numeric";

async function main() {
  const [deployer] = await ethers.getSigners();
  const addr = await deployer.getAddress();
  const bal  = await ethers.provider.getBalance(addr);
  const net  = await ethers.provider.getNetwork();
  console.log("Network:", net.name, toNumberSafe(net.chainId));
  console.log("Deployer:", addr);
  console.log("Balance:", ethers.formatEther(bal), "MATIC");
}
main().catch((e)=>{console.error(e);process.exit(1);});
