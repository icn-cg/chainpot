'use client';
import { BrowserProvider } from 'ethers';
import {
  poolFactoryWrite,
  poolEscrowReadonly,
  poolEscrowWrite,
  signerAddress,
  toUnits6,
  toUnixTs,
  POOL_USDC,
} from './web3';
import { PoolMode, FeePolicy } from './abi';
import type { PoolMode as PoolModeType, FeePolicy as FeePolicyType } from '../types/pool';

// Pool creation types
export interface CreatePoolArgs {
  mode: keyof typeof PoolMode;
  entryUnit?: string; // Required for FIXED_ENTRY
  endTime: string; // datetime-local string
  referralBps: number; // 0-1000 typical
  restricted: boolean;
  allowlist?: string[]; // Wallet addresses
  feePolicy: FeePolicyType;
}

export interface PoolInfo {
  address: string;
  mode: keyof typeof PoolMode;
  organizer: string;
  token: string;
  endTime: bigint;
  cancelled: boolean;
  paidOut: boolean;
  createdAt: bigint;
  referralBps: number;
  feePolicy: keyof typeof FeePolicy;
  // Mode-specific fields
  entryUnit?: bigint; // Fixed pools
  totalContributed?: bigint; // Flexible pools
}

export interface BillingStatus {
  monthsCharged: number;
  nextChargeAt: bigint;
  currentTier: number;
  currentRateBps: number;
}

// Create a new pool
export async function createPool(provider: BrowserProvider, args: CreatePoolArgs): Promise<string> {
  const factory = await poolFactoryWrite(provider);
  const organizer = await signerAddress(provider);

  // Convert end time to unix timestamp
  const endTimeUnix = toUnixTs(args.endTime);

  // Validate end time is in the future
  const nowUnix = BigInt(Math.floor(Date.now() / 1000));
  if (endTimeUnix <= nowUnix) {
    throw new Error('End time must be in the future');
  }

  // Convert entry unit to wei (6 decimals for USDC)
  const entryUnitWei = args.entryUnit ? toUnits6(args.entryUnit) : 0n;

  // Validate entry unit for Fixed mode
  if (args.mode === 'FIXED_ENTRY' && entryUnitWei === 0n) {
    throw new Error('Entry amount is required for Fixed Entry pools');
  }

  // Validate referral rate (max 20% = 2000 bps)
  if (args.referralBps > 2000) {
    throw new Error('Referral rate cannot exceed 20%');
  }

  console.log('Creating pool with args:', {
    organizer,
    token: POOL_USDC,
    mode: args.mode,
    entryUnit: entryUnitWei.toString(),
    endTime: endTimeUnix.toString(),
    endTimeHuman: new Date(Number(endTimeUnix) * 1000).toISOString(),
    restricted: args.restricted,
    referralBps: args.referralBps,
    feePolicy: args.feePolicy,
  });

  // Create args as an array in the order expected by the contract
  const createArgs = [
    organizer, // address organizer
    POOL_USDC, // address token
    args.mode === 'FIXED_ENTRY' ? 0 : 1, // uint8 mode
    entryUnitWei, // uint256 entryUnit
    endTimeUnix, // uint256 endTime
    args.restricted, // bool restricted
    BigInt(args.referralBps), // uint16 referralBps
    args.feePolicy === 'ORGANIZER_ABSORB' ? 0 : 1, // uint8 feePolicy
    '0x' + '00'.repeat(32), // bytes32 merkleRoot (placeholder)
  ];

  const tx = await factory.createPool(createArgs);
  const receipt = await tx.wait();

  // Parse PoolCreated event to get pool address
  const events = receipt?.logs || [];
  for (const log of events) {
    try {
      const parsed = factory.interface.parseLog(log as any);
      if (parsed?.name === 'PoolCreated') {
        return parsed.args.pool;
      }
    } catch {
      // Ignore parsing errors
    }
  }

  throw new Error('Pool creation failed - no PoolCreated event found');
}

// Get pool information
export async function getPoolInfo(poolAddress: string): Promise<{
  address: string;
  mode: PoolModeType;
  organizer: string;
  token: string;
  entryUnit: string;
  endTime: string;
  referralBps: number;
  restricted: boolean;
  feePolicy: FeePolicyType;
  totalContributions: string;
  contributorCount: number;
  isFinalized: boolean;
  isOrganizer: boolean;
}> {
  const pool = poolEscrowReadonly(poolAddress);

  const [organizer, token, endTime, cancelled, paidOut, createdAt, referralBps, feePolicy] =
    await Promise.all([
      pool.organizer(),
      pool.token(),
      pool.endTime(),
      pool.cancelled(),
      pool.paidOut(),
      pool.createdAt(),
      pool.referralBps(),
      pool.feePolicy(),
    ]);

  // Determine mode by checking if entryUnit exists (Fixed) or not (Flexible)
  let mode: PoolModeType;
  let entryUnit: bigint | undefined;
  let totalContributed: bigint | undefined;
  let contributorCount = 0;

  try {
    entryUnit = await pool.entryUnit();
    mode = 'FIXED_ENTRY';
  } catch {
    // If entryUnit doesn't exist, it's flexible
    mode = 'FLEXIBLE_AMOUNT';
    try {
      totalContributed = await pool.totalContributed();
    } catch {
      totalContributed = 0n;
    }
  }

  // Try to get additional info that might be available
  try {
    contributorCount = Number(await pool.contributorCount());
  } catch {
    contributorCount = 0;
  }

  return {
    address: poolAddress,
    mode,
    organizer,
    token,
    entryUnit: entryUnit ? (Number(entryUnit) / 1e6).toString() : '0',
    endTime: new Date(Number(endTime) * 1000).toISOString(),
    referralBps: Number(referralBps),
    restricted: false, // Default value, would need to be fetched from contract
    feePolicy: feePolicy === 0 ? 'ORGANIZER_ABSORB' : 'CONTRIBUTOR_ABSORB',
    totalContributions: totalContributed ? (Number(totalContributed) / 1e6).toString() : '0',
    contributorCount,
    isFinalized: paidOut,
    isOrganizer: false, // Will be set by the component
  };
}

// Get billing status
export async function getBillingStatus(poolAddress: string): Promise<BillingStatus> {
  const pool = poolEscrowReadonly(poolAddress);
  const [monthsCharged, nextChargeAt, currentTier, currentRateBps] = await pool.billingStatus();

  return {
    monthsCharged: Number(monthsCharged),
    nextChargeAt,
    currentTier: Number(currentTier),
    currentRateBps: Number(currentRateBps),
  };
}

// Get referral amount owed
export async function getReferralOwed(poolAddress: string, referrer: string): Promise<bigint> {
  const pool = poolEscrowReadonly(poolAddress);
  return await pool.referralOwed(referrer);
}

// Pool mode helpers
export function getPoolModeLabel(mode: keyof typeof PoolMode): string {
  switch (mode) {
    case 'FIXED_ENTRY':
      return 'Fixed Entry';
    case 'FLEXIBLE_AMOUNT':
      return 'Flexible Amount';
    case 'HYBRID':
      return 'Hybrid';
    default:
      return 'Unknown';
  }
}

export function getPoolModeDescription(mode: keyof typeof PoolMode): string {
  switch (mode) {
    case 'FIXED_ENTRY':
      return 'Everyone contributes the same fixed amount. One contribution per wallet.';
    case 'FLEXIBLE_AMOUNT':
      return 'Contributors can choose their amount. Multiple contributions allowed.';
    case 'HYBRID':
      return 'Fixed amount per person, unlimited contributors.';
    default:
      return '';
  }
}

// Billing tier helpers
export function getBillingTierLabel(tier: number): string {
  switch (tier) {
    case 0:
      return 'Tier 1 (Months 1-6)';
    case 1:
      return 'Tier 2 (Months 7-12)';
    case 2:
      return 'Tier 3 (Months 13+)';
    default:
      return 'Unknown Tier';
  }
}

export function getBillingRate(tier: number): string {
  switch (tier) {
    case 0:
      return '0.50%';
    case 1:
      return '0.33%';
    case 2:
      return '0.25%';
    default:
      return '0.00%';
  }
}

// Contribute to a pool
export async function contribute(
  provider: BrowserProvider,
  poolAddress: string,
  amount: string,
  referrer?: string
): Promise<void> {
  const pool = await poolEscrowWrite(poolAddress, provider);
  const amountWei = toUnits6(amount);

  const tx = referrer
    ? await pool.contributeWithReferral(amountWei, referrer)
    : await pool.contribute(amountWei);

  await tx.wait();
}

// Withdraw payout (organizer only)
export async function withdrawPayout(
  provider: BrowserProvider,
  poolAddress: string
): Promise<void> {
  const pool = await poolEscrowWrite(poolAddress, provider);
  const tx = await pool.withdrawPayout();
  await tx.wait();
}

// Get all contributions to a pool
export async function getContributions(
  provider: BrowserProvider,
  poolAddress: string
): Promise<
  Array<{
    contributor: string;
    amount: string;
    timestamp: string;
    referrer?: string;
  }>
> {
  const pool = poolEscrowReadonly(poolAddress);

  // Get events using ethers event filtering
  const filter = pool.filters.Contributed();
  const events = await pool.queryFilter(filter);

  return events
    .map((event) => {
      // Type guard to ensure we have an EventLog
      if ('args' in event && event.args) {
        return {
          contributor: event.args.contributor || '',
          amount: (Number(event.args.amount || 0n) / 1e6).toString(), // Convert from 6 decimals
          timestamp: new Date().toISOString(), // Would need block timestamp in real implementation
          referrer: event.args.referrer || undefined,
        };
      }
      return {
        contributor: '',
        amount: '0',
        timestamp: new Date().toISOString(),
      };
    })
    .filter((contrib) => contrib.contributor !== '');
}
