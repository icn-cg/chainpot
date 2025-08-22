export interface PoolContributor {
  address: string;
  amount: bigint;
  referrer?: string;
  referralCode?: string;
  timestamp: number;
}

export interface PoolRecipient {
  address: string;
  bps: number; // Basis points (0-10000)
}

export interface PoolPayout {
  recipients: PoolRecipient[];
  totalAmount: bigint;
  platformFee: bigint;
  referralTotal: bigint;
  timestamp: number;
}

export interface ReferralInfo {
  referrer: string;
  owed: bigint;
  code: string;
}

export interface ContributionResult {
  txHash: string;
  amount: bigint;
  referralCredit?: bigint;
}

export interface PoolMetrics {
  totalContributors: number;
  totalContributed: bigint;
  averageContribution: bigint;
  uniqueReferrers: number;
  totalReferralOwed: bigint;
}

export interface PoolSettings {
  canEditBeforeFirstContribution: boolean;
  allowRefunds: boolean;
  endTimeReached: boolean;
  payoutEligible: boolean;
}

// Form interfaces
export type PoolMode = 'FIXED_ENTRY' | 'FLEXIBLE_AMOUNT';
export type FeePolicy = 'ORGANIZER_ABSORB' | 'CONTRIBUTOR_ABSORB';

export interface CreatePoolFormData {
  mode: PoolMode;
  entryUnit: string;
  endTime: string;
  referralBps: number;
  restricted: boolean;
  feePolicy: FeePolicy;
}

export interface PoolInfo {
  address: string;
  mode: PoolMode;
  organizer: string;
  token: string;
  entryUnit: string;
  endTime: string;
  referralBps: number;
  restricted: boolean;
  feePolicy: FeePolicy;
  totalContributions: string;
  contributorCount: number;
  isFinalized: boolean;
  isOrganizer: boolean;
}

export interface ContributionInfo {
  contributor: string;
  amount: string;
  timestamp: string;
  referrer?: string;
}

export interface BillingStatus {
  totalContributions: string;
  protocolFees: string;
  referralFees: string;
  organizerPayout: string;
}

export interface ContributionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface ContributionFormData {
  amount: string;
  referralCode?: string;
}

export interface SetRecipientsFormData {
  recipients: Array<{
    address: string;
    percentage: number;
  }>;
}

// Pool state enums
export enum PoolState {
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
  PAID_OUT = 'paid_out',
}

// Error types
export class PoolError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'PoolError';
  }
}

export class ContributionError extends PoolError {
  constructor(message: string, details?: any) {
    super(message, 'CONTRIBUTION_ERROR', details);
  }
}

export class PayoutError extends PoolError {
  constructor(message: string, details?: any) {
    super(message, 'PAYOUT_ERROR', details);
  }
}

export class BillingError extends PoolError {
  constructor(message: string, details?: any) {
    super(message, 'BILLING_ERROR', details);
  }
}
