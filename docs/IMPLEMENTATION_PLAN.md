# Chainpool Implementation Roadmap

## Phase 1: Foundation Realignment (Weeks 1-4)

### 1.1 Smart Contract Restructure

#### A. Create New Contract Architecture

**File: `chain/contracts/PoolFactory.sol`**

- Implement EIP-1167 factory pattern
- Support multiple pool modes (Fixed/Flexible/Hybrid)
- Include fee collector and governance
- Add CreateArgs struct and enums

**File: `chain/contracts/PoolEscrowFixed.sol`**

- Fixed-entry pool logic
- Monthly billing system
- Referral system
- Access controls (Merkle)
- Events aligned with master plan

**File: `chain/contracts/PoolEscrowFlexible.sol`**

- Flexible contribution logic
- Same billing/referral systems as Fixed
- Support for multiple contributions per wallet

**File: `chain/contracts/interfaces/IPoolEscrow.sol`**

- Common interface for both pool types
- Standardized view functions and events

#### B. Billing System Implementation

- Monthly charging logic (0.50%/0.33%/0.25% rates)
- Time-based tier calculation
- Fee collection to treasury address

#### C. Referral System Implementation

- Referral accrual per contribution
- Indexed referrer tracking for gas efficiency
- Settlement at payout with proper accounting

#### D. Access Control System

- Merkle tree allowlist verification
- Optional EIP-712 voucher system (V1.1)
- Restricted pool functionality

### 1.2 Update Existing Contracts

**File: `chain/contracts/LeagueEscrowV2.sol`**

- Mark as deprecated
- Keep for backward compatibility

**File: `chain/contracts/LeagueFactory.sol`**

- Mark as deprecated
- Keep for backward compatibility

### 1.3 Contract Testing

**File: `chain/test/PoolFactory.test.ts`**

- Factory deployment and clone creation
- Pool mode validation
- Fee collector functionality

**File: `chain/test/PoolEscrowFixed.test.ts`**

- Join/cancel/refund flows
- Monthly billing edge cases
- Referral accrual and settlement
- Access control validation
- Winner selection and payout

**File: `chain/test/PoolEscrowFlexible.test.ts`**

- Multi-contribution logic
- Variable amount handling
- Same billing/referral tests as Fixed

**File: `chain/test/BillingSystem.test.ts`**

- Time-based fee calculation
- Multi-month charge scenarios
- Edge cases and gas optimization

**File: `chain/test/ReferralSystem.test.ts`**

- Accrual accuracy
- Settlement gas limits
- Large referrer set handling

### 1.4 Deployment Scripts

**File: `chain/scripts/deployNewArchitecture.ts`**

- Deploy PoolFactory with implementations
- Set fee collector address
- Verify contracts on explorer

**File: `chain/scripts/migrateFromLegacy.ts`**

- Migration utilities (if needed)
- Data export from old contracts

## Phase 2: Frontend Realignment (Weeks 5-8)

### 2.1 Terminology and Branding Update

**Files to Update:**

- `apps/web/src/app/layout.tsx` - Change "ChainPots" to "Chainpool"
- `apps/web/src/components/*` - Replace "League/Pot" with "Pool" terminology
- `apps/web/src/lib/abi.ts` - Add new ABIs for Pool contracts
- All JSX/TSX files with user-facing text

### 2.2 New Contract Integration

**File: `apps/web/src/lib/web3.ts`**

- Add Pool factory and escrow contract helpers
- Update environment variables for new addresses
- Maintain backward compatibility with legacy contracts

**File: `apps/web/src/lib/pool.ts`** (New)

- Pool creation utilities
- Mode selection logic
- Parameter validation

### 2.3 Enhanced Create Pool Flow

**File: `apps/web/src/app/create/page.tsx`**

- Pool mode selection (Fixed/Flexible/Hybrid)
- Referral rate configuration
- Access control options
- Fee policy selection
- Enhanced validation and UX

### 2.4 Advanced Pool View

**File: `apps/web/src/components/PoolView.tsx`** (Rename from PotView)

- Billing status display
- Referral tracking
- Access control status
- Mode-specific contribution logic

### 2.5 Enhanced Admin Panel

**File: `apps/web/src/components/AdminPanel.tsx`**

- Billing management panel
- Referral settlement UI
- Access control management
- CSV export functionality
- Advanced winner selection

### 2.6 New Components

**File: `apps/web/src/components/BillingPanel.tsx`** (New)

- Monthly fee display
- Tier progression
- Fee collection history

**File: `apps/web/src/components/ReferralManager.tsx`** (New)

- Referral link generation
- Referral tracking
- Settlement interface

**File: `apps/web/src/components/AccessControlManager.tsx`** (New)

- Allowlist upload/management
- Merkle proof generation
- Voucher system (V1.1)

**File: `apps/web/src/components/PoolModeSelector.tsx`** (New)

- Mode selection with explanations
- Parameter configuration per mode

## Phase 3: Advanced Features (Weeks 9-12)

### 3.1 Subgraph Integration

**File: `packages/subgraph/` (New Package)**

- Pool indexing
- Contribution tracking
- Event aggregation
- Analytics queries

### 3.2 Privacy Features

**File: `apps/web/src/components/PrivacyControls.tsx`** (New)

- Hide contributor lists option
- Privacy-lite implementation

### 3.3 Enhanced Analytics

**File: `apps/web/src/components/PoolAnalytics.tsx`** (New)

- Contribution patterns
- Referral metrics
- Billing analytics

### 3.4 Export and Integrations

**File: `apps/web/src/lib/export.ts`** (New)

- CSV export utilities
- Data formatting
- Historical data extraction

## Environment Configuration

### Required Environment Variables

```env
# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology

# Contract Addresses (New Architecture)
NEXT_PUBLIC_POOL_FACTORY_ADDRESS=
NEXT_PUBLIC_POOL_ESCROW_FIXED_IMPL=
NEXT_PUBLIC_POOL_ESCROW_FLEXIBLE_IMPL=
NEXT_PUBLIC_USDC_ADDRESS=

# Legacy Support
NEXT_PUBLIC_LEGACY_FACTORY_ADDRESS=
NEXT_PUBLIC_LEGACY_USDC_ADDRESS=

# Subgraph (V1.1)
NEXT_PUBLIC_SUBGRAPH_URL=

# Fee Collection
NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS=

# Development
DEPLOYER_KEY=
ALCHEMY_AMOY_URL=
ETHERSCAN_API_KEY=
```

## Migration Strategy

### Backward Compatibility

- Keep legacy contracts and UI for existing pools
- Add migration notices for users
- Gradual feature deprecation

### Data Migration

- Event scanning for historical data
- User notification system
- Migration incentives

## Risk Mitigation

### Security Considerations

- Comprehensive test coverage (>95%)
- External audit preparation
- Bug bounty program setup
- Gradual rollout strategy

### Gas Optimization

- Batch operations where possible
- Efficient data structures
- Optional keeper patterns for billing

### User Experience

- Clear migration paths
- Feature education
- Support documentation

## Success Metrics

### Technical

- [ ] All new contracts deployed and verified
- [ ] Test coverage >95%
- [ ] No critical security findings
- [ ] Gas costs within budget (<200k per operation)

### Product

- [ ] Feature parity with master plan
- [ ] User migration >80%
- [ ] Zero critical bugs in production
- [ ] Performance metrics improved

### Timeline

- [ ] Phase 1: Week 4 completion
- [ ] Phase 2: Week 8 completion
- [ ] Phase 3: Week 12 completion
- [ ] Production deployment: Week 13
