import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('Chainpool Architecture', function () {
  async function deployChainpoolFixture() {
    const [owner, user1, user2, user3, feeCollector, referrer] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory('MockUSDC');
    const usdc = await MockUSDC.deploy(ethers.parseUnits('1000000', 6)); // 1M USDC initial supply

    // Deploy implementations
    const PoolEscrowFixed = await ethers.getContractFactory('PoolEscrowFixed');
    const fixedImpl = await PoolEscrowFixed.deploy();

    const PoolEscrowFlexible = await ethers.getContractFactory('PoolEscrowFlexible');
    const flexibleImpl = await PoolEscrowFlexible.deploy();

    // Deploy factory
    const PoolFactory = await ethers.getContractFactory('PoolFactory');
    const factory = await PoolFactory.deploy(
      await fixedImpl.getAddress(),
      await flexibleImpl.getAddress(),
      feeCollector.address,
      owner.address
    );

    // Transfer USDC to users (already minted to deployer)
    const mintAmount = ethers.parseUnits('10000', 6); // 10,000 USDC
    await usdc.transfer(user1.address, mintAmount);
    await usdc.transfer(user2.address, mintAmount);
    await usdc.transfer(user3.address, mintAmount);

    return {
      factory,
      fixedImpl,
      flexibleImpl,
      usdc,
      owner,
      user1,
      user2,
      user3,
      feeCollector,
      referrer,
      mintAmount,
    };
  }

  describe('PoolFactory', function () {
    it('Should deploy with correct implementations', async function () {
      const { factory, fixedImpl, flexibleImpl, feeCollector } = await loadFixture(
        deployChainpoolFixture
      );

      expect(await factory.implementationFixed()).to.equal(await fixedImpl.getAddress());
      expect(await factory.implementationFlexible()).to.equal(await flexibleImpl.getAddress());
      expect(await factory.feeCollector()).to.equal(feeCollector.address);
    });
  });

  describe('MockUSDC', function () {
    it('Should have correct properties', async function () {
      const { usdc } = await loadFixture(deployChainpoolFixture);

      expect(await usdc.name()).to.equal('Mock USDC');
      expect(await usdc.symbol()).to.equal('mUSDC');
      expect(await usdc.decimals()).to.equal(6);
    });

    it('Should have distributed tokens to users', async function () {
      const { usdc, user1, mintAmount } = await loadFixture(deployChainpoolFixture);

      expect(await usdc.balanceOf(user1.address)).to.equal(mintAmount);
    });
  });

  describe('PoolEscrowFixed', function () {
    async function deployFixedPoolFixture() {
      const { usdc, owner, user1, user2, user3, feeCollector, referrer } = await loadFixture(
        deployChainpoolFixture
      );

      const PoolEscrowFixed = await ethers.getContractFactory('PoolEscrowFixed');
      const pool = await PoolEscrowFixed.deploy();

      const entryUnit = ethers.parseUnits('100', 6); // 100 USDC
      const endTime = (await time.latest()) + 86400; // 1 day from now

      // Initialize the pool
      await pool.initialize(
        owner.address, // organizer
        await usdc.getAddress(), // token
        entryUnit, // entryUnit
        endTime, // endTime
        false, // restricted
        500, // referralBps (5%)
        0, // feePolicy
        ethers.ZeroHash, // merkleRoot
        feeCollector.address // feeCollector
      );

      return { pool, usdc, owner, user1, user2, user3, feeCollector, referrer, entryUnit, endTime };
    }

    it('Should allow users to join with fixed entry', async function () {
      const { pool, usdc, user1, entryUnit } = await loadFixture(deployFixedPoolFixture);

      // Approve USDC
      await usdc.connect(user1).approve(await pool.getAddress(), entryUnit);

      // Join pool
      await expect(pool.connect(user1).join([], ethers.ZeroAddress, ethers.ZeroHash))
        .to.emit(pool, 'Contributed')
        .withArgs(user1.address, entryUnit, ethers.ZeroAddress, ethers.ZeroHash);

      expect(await pool.joined(user1.address)).to.be.true;
      expect(await pool.getPoolBalance()).to.equal(entryUnit);
    });

    it('Should not allow duplicate joins', async function () {
      const { pool, usdc, user1, entryUnit } = await loadFixture(deployFixedPoolFixture);

      // Approve USDC
      await usdc.connect(user1).approve(await pool.getAddress(), entryUnit * 2n);

      // First join
      await pool.connect(user1).join([], ethers.ZeroAddress, ethers.ZeroHash);

      // Second join should fail
      await expect(
        pool.connect(user1).join([], ethers.ZeroAddress, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(pool, 'AlreadyJoined');
    });

    it('Should handle referrals correctly', async function () {
      const { pool, usdc, user1, referrer, entryUnit } = await loadFixture(deployFixedPoolFixture);

      // Approve USDC
      await usdc.connect(user1).approve(await pool.getAddress(), entryUnit);

      // Join with referral
      const referralCode = ethers.keccak256(ethers.toUtf8Bytes('FRIEND123'));
      await expect(pool.connect(user1).join([], referrer.address, referralCode))
        .to.emit(pool, 'Contributed')
        .withArgs(user1.address, entryUnit, referrer.address, referralCode);

      // Check referral was recorded
      const referralOwed = await pool.referralOwed(referrer.address);
      expect(referralOwed).to.be.gt(0);
    });

    it('Should allow organizer to set recipients and payout', async function () {
      const { pool, usdc, user1, user2, owner, entryUnit, endTime } = await loadFixture(
        deployFixedPoolFixture
      );

      // Users join
      await usdc.connect(user1).approve(await pool.getAddress(), entryUnit);
      await pool.connect(user1).join([], ethers.ZeroAddress, ethers.ZeroHash);

      await usdc.connect(user2).approve(await pool.getAddress(), entryUnit);
      await pool.connect(user2).join([], ethers.ZeroAddress, ethers.ZeroHash);

      // Fast forward past end time
      await time.increaseTo(endTime + 1);

      // Set recipients
      const recipients = [user1.address];
      const recipientBps = [10000]; // 100%

      await expect(pool.connect(owner).setRecipients(recipients, recipientBps))
        .to.emit(pool, 'RecipientsSet')
        .withArgs(recipients, recipientBps);

      // Execute payout
      await expect(pool.connect(owner).payout()).to.emit(pool, 'PaidOut');

      expect(await pool.paidOut()).to.be.true;
    });

    it('Should allow cancellation and refunds', async function () {
      const { pool, usdc, user1, owner, entryUnit } = await loadFixture(deployFixedPoolFixture);

      // User joins
      await usdc.connect(user1).approve(await pool.getAddress(), entryUnit);
      await pool.connect(user1).join([], ethers.ZeroAddress, ethers.ZeroHash);

      const initialBalance = await usdc.balanceOf(user1.address);

      // Organizer cancels
      await expect(pool.connect(owner).cancel()).to.emit(pool, 'Cancelled');

      // User claims refund
      await expect(pool.connect(user1).claimRefund())
        .to.emit(pool, 'Refunded')
        .withArgs(user1.address, entryUnit);

      expect(await usdc.balanceOf(user1.address)).to.equal(initialBalance + entryUnit);
    });
  });

  describe('PoolEscrowFlexible', function () {
    async function deployFlexiblePoolFixture() {
      const { usdc, owner, user1, user2, user3, feeCollector, referrer } = await loadFixture(
        deployChainpoolFixture
      );

      const PoolEscrowFlexible = await ethers.getContractFactory('PoolEscrowFlexible');
      const pool = await PoolEscrowFlexible.deploy();

      const minEntry = ethers.parseUnits('10', 6); // 10 USDC
      const maxEntry = ethers.parseUnits('1000', 6); // 1000 USDC
      const maxPoolSize = ethers.parseUnits('50000', 6); // 50,000 USDC
      const endTime = (await time.latest()) + 86400; // 1 day from now

      // Initialize the pool
      await pool.initialize(
        owner.address, // organizer
        await usdc.getAddress(), // token
        minEntry, // minEntry
        maxEntry, // maxEntry
        maxPoolSize, // maxPoolSize
        endTime, // endTime
        false, // restricted
        300, // referralBps (3%)
        0, // feePolicy
        ethers.ZeroHash, // merkleRoot
        feeCollector.address // feeCollector
      );

      return {
        pool,
        usdc,
        owner,
        user1,
        user2,
        user3,
        feeCollector,
        referrer,
        minEntry,
        maxEntry,
        maxPoolSize,
        endTime,
      };
    }

    it('Should allow flexible contributions', async function () {
      const { pool, usdc, user1, minEntry, maxEntry } = await loadFixture(
        deployFlexiblePoolFixture
      );

      const contribution1 = ethers.parseUnits('50', 6); // 50 USDC
      const contribution2 = ethers.parseUnits('150', 6); // 150 USDC

      // Approve USDC
      await usdc.connect(user1).approve(await pool.getAddress(), contribution1 + contribution2);

      // First contribution
      await expect(
        pool.connect(user1).contribute(contribution1, [], ethers.ZeroAddress, ethers.ZeroHash)
      )
        .to.emit(pool, 'Contributed')
        .withArgs(user1.address, contribution1, ethers.ZeroAddress, ethers.ZeroHash);

      // Second contribution
      await expect(
        pool.connect(user1).contribute(contribution2, [], ethers.ZeroAddress, ethers.ZeroHash)
      )
        .to.emit(pool, 'Contributed')
        .withArgs(user1.address, contribution2, ethers.ZeroAddress, ethers.ZeroHash);

      expect(await pool.getContribution(user1.address)).to.equal(contribution1 + contribution2);
      expect(await pool.totalContributed()).to.equal(contribution1 + contribution2);
    });

    it('Should enforce contribution limits', async function () {
      const { pool, usdc, user1, minEntry, maxEntry } = await loadFixture(
        deployFlexiblePoolFixture
      );

      const tooSmall = minEntry - 1n;
      const tooBig = maxEntry + 1n;

      // Approve USDC
      await usdc.connect(user1).approve(await pool.getAddress(), tooBig);

      // Too small should fail
      await expect(
        pool.connect(user1).contribute(tooSmall, [], ethers.ZeroAddress, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(pool, 'InvalidAmount');

      // Too big should fail
      await expect(
        pool.connect(user1).contribute(tooBig, [], ethers.ZeroAddress, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(pool, 'InvalidAmount');
    });

    it('Should handle pool size limits', async function () {
      const { pool, usdc, user1, maxEntry, maxPoolSize } = await loadFixture(
        deployFlexiblePoolFixture
      );

      // Try to contribute more than pool size
      const oversized = maxPoolSize + 1n;

      await usdc.connect(user1).approve(await pool.getAddress(), oversized);

      await expect(
        pool.connect(user1).contribute(oversized, [], ethers.ZeroAddress, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(pool, 'InvalidAmount');
    });
  });

  describe('Billing System', function () {
    it('Should track billing status correctly', async function () {
      // Use a direct deployment for this test
      const { usdc, owner, feeCollector } = await loadFixture(deployChainpoolFixture);

      const PoolEscrowFixed = await ethers.getContractFactory('PoolEscrowFixed');
      const pool = await PoolEscrowFixed.deploy();

      const entryUnit = ethers.parseUnits('100', 6); // 100 USDC
      const endTime = (await time.latest()) + 86400; // 1 day from now

      // Initialize the pool
      await pool.initialize(
        owner.address, // organizer
        await usdc.getAddress(), // token
        entryUnit, // entryUnit
        endTime, // endTime
        false, // restricted
        500, // referralBps (5%)
        0, // feePolicy
        ethers.ZeroHash, // merkleRoot
        feeCollector.address // feeCollector
      );

      const billingStatus = await pool.billingStatus();
      expect(billingStatus._monthsCharged).to.equal(0);
      expect(billingStatus.currentTier).to.equal(0); // First tier
      expect(billingStatus.currentRateBps).to.equal(50); // 0.50%
    });
  });
});
