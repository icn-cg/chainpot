import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Chainpool Basic Test', function () {
  async function deployBasicFixture() {
    const [owner, user1, feeCollector] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory('MockUSDC');
    const usdc = await MockUSDC.deploy(ethers.parseUnits('1000000', 6)); // 1M USDC initial supply

    // Deploy implementations
    const PoolEscrowFlexible = await ethers.getContractFactory('PoolEscrowFlexible');
    const flexibleImpl = await PoolEscrowFlexible.deploy();

    // Deploy factory with basic setup (only flexible for now)
    const PoolFactory = await ethers.getContractFactory('PoolFactory');
    const factory = await PoolFactory.deploy(
      await flexibleImpl.getAddress(), // fixed implementation (use flexible for now)
      await flexibleImpl.getAddress(), // flexible implementation
      feeCollector.address,
      owner.address
    );

    return { factory, usdc, owner, user1, feeCollector };
  }

  describe('Basic Setup', function () {
    it('Should deploy factory', async function () {
      const { factory } = await loadFixture(deployBasicFixture);
      expect(await factory.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it('Should deploy USDC', async function () {
      const { usdc } = await loadFixture(deployBasicFixture);
      expect(await usdc.name()).to.equal('Mock USDC');
      expect(await usdc.symbol()).to.equal('mUSDC');
    });
  });
});
