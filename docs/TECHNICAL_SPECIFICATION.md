# Technical Specification: Current State → Target Architecture

## Overview

This document provides detailed technical specifications for migrating from the current "ChainPots/League" system to the comprehensive "Chainpool" architecture as defined in the master plan.

## Current State Analysis

### Existing Architecture

```
LeagueFactory (Direct Deployment)
└── LeagueEscrowV2 (Single Mode)
    ├── Fixed entry amount only
    ├── No billing system
    ├── No referral system
    ├── No access controls
    └── Basic winner/payout logic
```

### Target Architecture

```
PoolFactory (EIP-1167 Factory)
├── PoolEscrowFixed Implementation
├── PoolEscrowFlexible Implementation
└── Future: Hybrid Implementation

Each Pool Escrow:
├── Monthly Billing System
├── Referral System
├── Access Control (Merkle/EIP-712)
├── Fee Collection to Treasury
└── Enhanced Event System
```

## Detailed Migration Specifications

### 1. Smart Contract Specifications

#### 1.1 PoolFactory.sol

**Purpose**: Replace LeagueFactory with EIP-1167 clone factory

```solidity
contract PoolFactory is Ownable {
    // Storage
    address public implementationFixed;
    address public implementationFlexible;
    address public feeCollector;
    mapping(address => address[]) public poolsByOrganizer;

    // Enums (align with master plan)
    enum Mode { FIXED_ENTRY, FLEXIBLE_AMOUNT }
    enum FeePolicy { ORGANIZER_ABSORB, CONTRIBUTOR_TOPUP }

    // Creation struct
    struct CreateArgs {
        address organizer;
        address token;
        Mode mode;
        uint256 entryUnit;      // required if FIXED_ENTRY
        uint256 endTime;
        bool restricted;
        uint16 referralBps;     // 0-2000, typical 0-1000
        FeePolicy feePolicy;
        bytes32 merkleRoot;     // optional for allowlist
    }

    // Core function
    function createPool(CreateArgs calldata args) external returns (address pool);
}
```

**Key Changes from Current**:

- EIP-1167 clones vs direct deployment
- Support multiple modes
- Include referral and access control parameters
- Fee collector for protocol fees

#### 1.2 PoolEscrowFixed.sol

**Purpose**: Replace LeagueEscrowV2 with enhanced Fixed-Entry pool logic

```solidity
contract PoolEscrowFixed is IPoolEscrow, Ownable, ReentrancyGuard {
    // Enhanced storage (vs current LeagueEscrowV2)
    IERC20 public token;
    uint256 public entryUnit;           // vs entryFee
    uint256 public endTime;             // vs leagueEndTime
    uint64 public createdAt;            // NEW: for billing
    uint16 public monthsCharged;        // NEW: billing tracking
    uint16 public referralBps;          // NEW: referral rate
    FeePolicy public feePolicy;         // NEW: fee handling
    bytes32 public merkleRoot;          // NEW: access control
    address public feeCollector;        // NEW: protocol fees

    // Referral system (NEW)
    mapping(address => uint256) public referralAccrued;
    mapping(address => bytes32) public referralCodeOf;
    address[] public referrersIndex;
    mapping(address => bool) public isIndexedReferrer;

    // Enhanced functions
    function join(
        bytes32[] calldata proof,
        address referrer,
        bytes32 code
    ) external;

    function payout() external onlyOrganizer {
        _chargeMonthlyIfDue();  // NEW: billing before payout
        // ... existing payout logic
        _settleReferrers();     // NEW: pay referrers
    }

    // NEW: Billing functions
    function _chargeMonthlyIfDue() internal;
    function billingStatus() external view returns (uint16, uint256, uint8, uint16);

    // NEW: Referral functions
    function referralOwed(address referrer) external view returns (uint256);
}
```

**Key Enhancements**:

- Monthly billing system with tiered rates
- Referral accrual and settlement
- Access control with Merkle proofs
- Enhanced event system
- Fee collection to protocol treasury

#### 1.3 PoolEscrowFlexible.sol

**Purpose**: New flexible amount pool implementation

```solidity
contract PoolEscrowFlexible is IPoolEscrow, Ownable, ReentrancyGuard {
    // Similar to Fixed but with flexible contributions
    mapping(address => uint256) public contributed;

    function contribute(
        uint256 amount,
        bytes32[] calldata proof,
        address referrer,
        bytes32 code
    ) external;

    // Same billing, referral, and payout logic as Fixed
}
```

### 2. Billing System Specification

#### 2.1 Fee Structure (Master Plan Compliant)

```
Month 1-6:   0.50% per month (50 bps)
Month 7-12:  0.33% per month (33 bps)
Month 13+:   0.25% per month (25 bps)
```

#### 2.2 Billing Implementation

```solidity
library BillingLib {
    function calculateFeeRate(uint16 monthNumber) internal pure returns (uint16) {
        if (monthNumber <= 6) return 50;        // 0.50%
        if (monthNumber <= 12) return 33;       // 0.33%
        return 25;                              // 0.25%
    }

    function calculateMonthsElapsed(uint64 createdAt) internal view returns (uint16) {
        return uint16((block.timestamp - createdAt) / 30 days);
    }

    function chargeFee(IERC20 token, address feeCollector, uint256 balance, uint16 rateBps) internal {
        uint256 fee = (balance * rateBps) / 10000;
        if (fee > 0 && fee <= balance) {
            token.safeTransfer(feeCollector, fee);
        }
    }
}
```

### 3. Referral System Specification

#### 3.1 Accrual Logic

```solidity
// Per contribution accrual
uint256 credit = amount * referralBps / 10000;
referralAccrued[referrer] += credit;

// Index tracking for gas efficiency
if (!isIndexedReferrer[referrer]) {
    referrersIndex.push(referrer);
    isIndexedReferrer[referrer] = true;
}
```

#### 3.2 Settlement at Payout

```solidity
function _settleReferrers() internal {
    for (uint256 i = 0; i < referrersIndex.length; i++) {
        address referrer = referrersIndex[i];
        uint256 owed = referralAccrued[referrer];
        if (owed > 0) {
            referralAccrued[referrer] = 0;
            token.safeTransfer(referrer, owed);
        }
    }
}
```

### 4. Frontend Migration Specification

#### 4.1 Terminology Updates

```typescript
// Current → Target
"League" → "Pool"
"Pot" → "Pool"
"joinLeague" → "join" or "contribute"
"leagueEndTime" → "endTime"
"entryFee" → "entryUnit"
```

#### 4.2 Enhanced Create Pool Interface

```tsx
interface CreatePoolForm {
  mode: 'FIXED_ENTRY' | 'FLEXIBLE_AMOUNT';
  entryUnit?: string; // Required for FIXED_ENTRY
  endTime: string;
  referralBps: number; // 0-1000 range
  restricted: boolean;
  allowlist?: File; // CSV upload for allowlist
  feePolicy: 'ORGANIZER_ABSORB' | 'CONTRIBUTOR_TOPUP';
}
```

#### 4.3 Enhanced Pool View Components

```tsx
// New components to implement
<BillingStatus pool={poolAddress} />
<ReferralTracker pool={poolAddress} />
<AccessControlStatus pool={poolAddress} />
<ContributionInterface mode={poolMode} />
```

### 5. Migration Strategy

#### 5.1 Backward Compatibility

- Keep existing LeagueFactory and LeagueEscrowV2 contracts
- Maintain legacy UI routes and components
- Add "Legacy Pool" indicators in UI
- Provide migration utilities

#### 5.2 Gradual Migration

1. Deploy new contracts alongside existing
2. Add new pool creation with updated UI
3. Maintain legacy pool support
4. Encourage migration through UI prompts
5. Eventually deprecate legacy system

#### 5.3 Data Migration

```typescript
// Legacy pool detection
function isLegacyPool(address: string): boolean {
  // Check if created by old LeagueFactory
}

// Migration helpers
function migrateLegacyPoolData(legacyAddress: string) {
  // Extract participants, amounts, etc.
  // Guide user through new pool creation
}
```

### 6. Testing Strategy

#### 6.1 Contract Testing

```typescript
describe('PoolFactory', () => {
  it('should create Fixed pools with correct parameters');
  it('should create Flexible pools with correct parameters');
  it('should handle referral configuration');
  it('should validate access control setup');
});

describe('BillingSystem', () => {
  it('should charge correct rates for each tier');
  it('should handle month boundary conditions');
  it('should optimize gas for multiple month charges');
});

describe('ReferralSystem', () => {
  it('should accrue referrals correctly');
  it('should settle within gas limits');
  it('should handle large referrer sets');
});
```

#### 6.2 Frontend Testing

```typescript
describe('Pool Creation', () => {
  it('should create Fixed entry pools');
  it('should create Flexible pools');
  it('should handle referral configuration');
  it('should upload and validate allowlists');
});

describe('Billing Integration', () => {
  it('should display billing status correctly');
  it('should show tier progression');
  it('should calculate next charge time');
});
```

### 7. Environment Configuration

#### 7.1 Required Environment Variables

```bash
# New contracts
NEXT_PUBLIC_POOL_FACTORY_ADDRESS=
NEXT_PUBLIC_POOL_FIXED_IMPL=
NEXT_PUBLIC_POOL_FLEXIBLE_IMPL=
NEXT_PUBLIC_FEE_COLLECTOR=

# Legacy contracts (for backward compatibility)
NEXT_PUBLIC_LEGACY_FACTORY=
NEXT_PUBLIC_LEGACY_USDC=

# Protocol configuration
NEXT_PUBLIC_REFERRAL_MAX_BPS=1000
NEXT_PUBLIC_BILLING_ENABLED=true
```

#### 7.2 Configuration Management

```typescript
// apps/web/src/lib/config.ts
export const config = {
  contracts: {
    poolFactory: process.env.NEXT_PUBLIC_POOL_FACTORY_ADDRESS!,
    feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR!,
    legacy: {
      factory: process.env.NEXT_PUBLIC_LEGACY_FACTORY,
      usdc: process.env.NEXT_PUBLIC_LEGACY_USDC,
    },
  },
  features: {
    billingEnabled: process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true',
    referralMaxBps: Number(process.env.NEXT_PUBLIC_REFERRAL_MAX_BPS) || 1000,
  },
};
```

### 8. Performance Considerations

#### 8.1 Gas Optimization

- Use packed structs where possible
- Optimize storage layout for SSTORE efficiency
- Implement batched operations for referral settlement
- Consider proxy patterns for upgradability vs gas costs

#### 8.2 Frontend Optimization

- Implement proper caching for contract reads
- Use SWR/React Query for data fetching
- Optimize bundle size with tree shaking
- Implement progressive loading for large datasets

### 9. Security Considerations

#### 9.1 Contract Security

- Comprehensive test coverage (>95%)
- Reentrancy protection on all state-changing functions
- Integer overflow protection (Solidity 0.8+)
- Access control validation
- Merkle proof validation security

#### 9.2 Frontend Security

- Input validation and sanitization
- Secure contract interaction patterns
- Protection against common web3 attacks
- Secure storage of sensitive data

This specification provides the technical foundation for implementing the migration from the current system to the target Chainpool architecture as defined in the master plan.
