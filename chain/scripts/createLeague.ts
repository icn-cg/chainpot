import { ethers } from "hardhat";

async function main() {
  const [admin] = await ethers.getSigners();

  const factoryAddress = process.env.FACTORY!;
  const tokenAddress   = process.env.USDC!;
  const entryFee       = BigInt(process.env.FEE6!);   // e.g., 50000000n
  const endTs          = BigInt(process.env.END_TS!); // e.g., 1733126400n

  const factory = await ethers.getContractAt("LeagueFactory", factoryAddress);

  const tx = await factory.createLeague(
    await admin.getAddress(),
    tokenAddress,
    entryFee,
    endTs
  );
  const rc = await tx.wait();
  console.log("createLeague tx:", rc?.hash);

  // Option A: read from event
  try {
    const parsed = rc?.logs
      .map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } })
      .find((e) => e?.name === "LeagueCreated");
    if (parsed) console.log("New league (escrow):", parsed.args.league);
  } catch {}

  // Option B: read from view
  const mine: string[] = await factory.leaguesOf(await admin.getAddress());
  console.log("Latest league (escrow):", mine[mine.length - 1]);
}

main().catch((e) => (console.error(e), process.exit(1)));
