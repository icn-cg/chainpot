# Chainpool Engineering Checklist

## CRITICAL PATH: Phase 1 - Smart Contract Foundation (Weeks 1-4)

### Week 1: Core Contract Architecture

#### Day 1-2: Create New Contract Structure

- [ ] **Create `chain/contracts/interfaces/IPoolEscrow.sol`**

  ```solidity
  // Define common interface for all pool types
  // Include all view functions, events, and core methods
  ```

- [ ] **Create `chain/contracts/PoolFactory.sol`**

  ```solidity
  // EIP-1167 factory with implementation addresses
  // CreateArgs struct with Mode enum
  // Fee collector governance
  // Pool creation logic with proper event emission
  ```

- [ ] **Create `chain/contracts/libraries/PoolEnums.sol`**
  ```solidity
  // Mode enum (FIXED_ENTRY, FLEXIBLE_AMOUNT, HYBRID)
  // FeePolicy enum (ORGANIZER_ABSORB, CONTRIBUTOR_TOPUP)
  // Access control enums
  ```

#### Day 3-5: Billing System Implementation

- [ ] **Create `chain/contracts/libraries/BillingLib.sol`**

  ```solidity
  // Monthly fee calculation logic
  // Tier-based rate calculation (0.50%/0.33%/0.25%)
  // Time window calculation (30-day periods)
  // Gas-efficient charging logic
  ```

- [ ] **Add billing functions to base escrow logic**
  ```solidity
  // _chargeMonthlyIfDue() internal function
  // billingStatus() view function
  // monthsCharged tracking
  // createdAt timestamp handling
  ```

#### Day 6-7: Referral System Foundation

- [ ] **Create `chain/contracts/libraries/ReferralLib.sol`**
  ```solidity
  // Referral accrual calculation
  // Indexed referrer tracking
  // Settlement gas optimization
  // Referral code handling
  ```

### Week 2: Pool Implementation

#### Day 1-3: PoolEscrowFixed Implementation

- [ ] **Create `chain/contracts/PoolEscrowFixed.sol`**

  ```solidity
  // Fixed entry amount logic
  // One join per wallet restriction
  // Integration with billing system
  // Integration with referral system
  // Access control integration
  // Event emission aligned with master plan
  ```

- [ ] **Implement core functions:**
  ```solidity
  // initialize() - one-time setup
  // join() - with proof, referrer, code parameters
  // cancel() - organizer only
  // claimRefund() - after cancel
  // setWinners() - with BPS validation
  // payout() - with billing and referral settlement
  ```

#### Day 4-5: PoolEscrowFlexible Implementation

- [ ] **Create `chain/contracts/PoolEscrowFlexible.sol`**
  ```solidity
  // Variable contribution amounts
  // Multiple contributions per wallet
  // Same billing/referral logic as Fixed
  // contribute() function vs join()
  ```

#### Day 6-7: Access Control System

- [ ] **Create `chain/contracts/libraries/AccessControlLib.sol`**
  ```solidity
  // Merkle tree proof verification
  // Allowlist management
  // Gas-efficient proof checking
  ```

### Week 3: Testing Infrastructure

#### Day 1-2: Factory and Base Tests

- [ ] **Create `chain/test/PoolFactory.test.ts`**
  ```typescript
  // Factory deployment
  // Implementation setting
  // Pool creation for each mode
  // Event emission validation
  // Access control on factory functions
  ```

#### Day 3-4: Billing System Tests

- [ ] **Create `chain/test/BillingSystem.test.ts`**
  ```typescript
  // Month calculation accuracy
  // Tier transitions (6mo, 12mo, 13mo+)
  // Fee calculation precision
  // Multiple month charging
  // Edge cases (creation at month boundary)
  // Gas usage optimization
  ```

#### Day 5-7: Pool Escrow Tests

- [ ] **Create `chain/test/PoolEscrowFixed.test.ts`**

  ```typescript
  // Join flow with referrals
  // Billing integration
  // Cancel and refund flows
  // Winner selection and payout
  // Access control validation
  // Gas usage tracking
  ```

- [ ] **Create `chain/test/PoolEscrowFlexible.test.ts`**
  ```typescript
  // Multiple contribution logic
  // Variable amounts
  // Refund calculation
  // Same core tests as Fixed
  ```

### Week 4: Deployment and Integration

#### Day 1-3: Deployment Scripts

- [ ] **Create `chain/scripts/deployPoolFactory.ts`**

  ```typescript
  // Deploy implementations first
  // Deploy factory with implementations
  // Set fee collector address
  // Verify all contracts
  // Output addresses for frontend integration
  ```

- [ ] **Create `chain/scripts/setupTestEnvironment.ts`**
  ```typescript
  // Deploy MockUSDC
  // Create test pools
  // Fund test accounts
  // Generate test data
  ```

#### Day 4-5: Gas Optimization

- [ ] **Optimize contract gas usage**
  ```solidity
  // Optimize storage layouts
  // Minimize SSTORE operations
  // Efficient loop patterns for referral settlement
  // Pack structs efficiently
  ```

#### Day 6-7: Security Review Prep

- [ ] **Prepare audit package**
  ```
  // Complete test coverage report
  // Gas usage analysis
  // Security considerations document
  // Known issues and mitigations
  ```

---

## PHASE 2: Frontend Integration (Weeks 5-8)

### Week 5: Contract Integration

#### Day 1-2: Update Web3 Infrastructure

- [ ] **Update `apps/web/src/lib/web3.ts`**

  ```typescript
  // Add new contract addresses
  // Pool factory integration
  // Backward compatibility with legacy contracts
  // Enhanced error handling
  ```

- [ ] **Update `apps/web/src/lib/abi.ts`**
  ```typescript
  // Add PoolFactory ABI
  // Add PoolEscrowFixed ABI
  // Add PoolEscrowFlexible ABI
  // Keep legacy ABIs for compatibility
  ```

#### Day 3-5: Create Pool Infrastructure

- [ ] **Create `apps/web/src/lib/pool.ts`**

  ```typescript
  // Pool creation utilities
  // Mode selection helpers
  // Parameter validation
  // Error handling and user messaging
  ```

- [ ] **Create `apps/web/src/types/pool.ts`**
  ```typescript
  // TypeScript interfaces for all pool types
  // Enums matching contract enums
  // Event type definitions
  ```

### Week 6: Enhanced UI Components

#### Day 1-3: Pool Creation Redesign

- [ ] **Update `apps/web/src/app/create/page.tsx`**

  ```tsx
  // Pool mode selection UI
  // Dynamic parameter fields based on mode
  // Referral rate configuration
  // Access control options
  // Enhanced validation and error display
  ```

- [ ] **Create `apps/web/src/components/PoolModeSelector.tsx`**
  ```tsx
  // Mode selection with explanations
  // Parameter configuration per mode
  // Visual mode differences
  ```

#### Day 4-5: Advanced Pool View

- [ ] **Rename and update `apps/web/src/components/PotView.tsx` → `PoolView.tsx`**
  ```tsx
  // Mode-aware contribution logic
  // Billing status display
  // Referral information
  // Access control status
  // Enhanced error handling
  ```

#### Day 6-7: Billing Integration

- [ ] **Create `apps/web/src/components/BillingPanel.tsx`**
  ```tsx
  // Current tier display
  // Next charge countdown
  // Billing history
  // Fee collection transparency
  ```

### Week 7: Admin and Referral Features

#### Day 1-3: Enhanced Admin Panel

- [ ] **Update `apps/web/src/components/AdminPanel.tsx`**
  ```tsx
  // Billing management section
  // Referral settlement interface
  // Access control management
  // Mode-specific admin features
  ```

#### Day 4-5: Referral System UI

- [ ] **Create `apps/web/src/components/ReferralManager.tsx`**
  ```tsx
  // Referral link generation
  // Referral code tracking
  // Earnings display
  // Settlement interface
  ```

#### Day 6-7: Access Control UI

- [ ] **Create `apps/web/src/components/AccessControlManager.tsx`**
  ```tsx
  // Allowlist upload interface
  // Merkle tree generation
  // Proof validation UI
  // Access status display
  ```

### Week 8: Testing and Polish

#### Day 1-3: Frontend Testing

- [ ] **Create comprehensive E2E tests**
  ```typescript
  // Pool creation flows for each mode
  // Contribution and referral flows
  // Admin management flows
  // Billing interaction tests
  ```

#### Day 4-5: UX Polish

- [ ] **Enhanced error handling and messaging**
  ```tsx
  // User-friendly error messages
  // Loading states
  // Success confirmations
  // Gas estimation and warnings
  ```

#### Day 6-7: Documentation and Migration

- [ ] **Update user documentation**
  ```markdown
  // Pool creation guides
  // Feature comparison (old vs new)
  // Migration instructions
  // FAQ updates
  ```

---

## PHASE 3: Advanced Features (Weeks 9-12)

### Week 9-10: Privacy and Analytics

#### Privacy Features Implementation

- [ ] **Create `apps/web/src/components/PrivacyControls.tsx`**
  ```tsx
  // Hide contributor list toggle
  // Privacy mode selection
  // Data visibility controls
  ```

#### Analytics Dashboard

- [ ] **Create `apps/web/src/components/PoolAnalytics.tsx`**
  ```tsx
  // Contribution patterns
  // Referral effectiveness
  // Billing analytics
  // Performance metrics
  ```

### Week 11-12: Export and Integration

#### CSV Export System

- [ ] **Create `apps/web/src/lib/export.ts`**
  ```typescript
  // Pool data export utilities
  // Contributor data formatting
  // Financial reports
  // Compliance exports
  ```

#### Subgraph Preparation

- [ ] **Create `packages/subgraph/` structure**
  ```graphql
  // Schema definition
  // Event handlers
  // Query optimizations
  // Deployment configuration
  ```

---

## ENVIRONMENT SETUP CHECKLIST

### Development Environment

- [ ] **Create `.env.example` files**

  ```bash
  # In apps/web/.env.example
  # In chain/.env.example
  ```

- [ ] **Update package.json scripts**
  ```json
  // Add deployment scripts
  // Add testing scripts
  // Add development utilities
  ```

### Production Deployment

- [ ] **Deploy to Amoy testnet**

  ```bash
  # Factory and implementations
  # Verify on block explorer
  # Update frontend configs
  ```

- [ ] **Production checklist**
  ```
  # Security audit completion
  # Gas optimization verification
  # Frontend testing completion
  # User acceptance testing
  # Performance benchmarking
  ```

---

## QUALITY GATES

### Week 4 Completion Criteria

- [ ] All new contracts deployed and verified on Amoy
- [ ] Test coverage >95% for all new contracts
- [ ] Gas usage analysis completed and optimized
- [ ] No critical security findings

### Week 8 Completion Criteria

- [ ] Frontend fully integrated with new contracts
- [ ] All legacy functionality preserved
- [ ] E2E tests passing
- [ ] User migration path validated

### Week 12 Completion Criteria

- [ ] All master plan features implemented
- [ ] Production deployment successful
- [ ] User acceptance testing completed
- [ ] Performance benchmarks met

---

## RISK MITIGATION

### Technical Risks

- [ ] Maintain backward compatibility throughout migration
- [ ] Implement feature flags for gradual rollout
- [ ] Create rollback procedures for each deployment
- [ ] Monitor gas costs and optimize continuously

### User Experience Risks

- [ ] Provide clear migration instructions
- [ ] Maintain legacy UI during transition period
- [ ] Implement user notification system
- [ ] Create comprehensive help documentation

This checklist provides a day-by-day breakdown of tasks required to realign the current codebase with the Chainpool Technical Master Plan. Each task includes specific deliverables and acceptance criteria.
