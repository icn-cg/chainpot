import { expect } from "chai";
import { ethers } from "hardhat";

describe("LeagueEscrowV2", function () {
  it("Should accept deposits", async function () {
    const [owner] = await ethers.getSigners();
    const LeagueEscrow = await ethers.getContractFactory("LeagueEscrowV2");
    const leagueEscrow = await LeagueEscrow.deploy();
    await leagueEscrow.waitForDeployment();

    await owner.sendTransaction({
      to: await leagueEscrow.getAddress(),
      value: ethers.parseEther("1")
    });

    expect(await leagueEscrow.potAmount()).to.equal(ethers.parseEther("1"));
  });
});
