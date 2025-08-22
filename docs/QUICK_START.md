# Quick Start Guide: Chainpool Realignment

## 🎯 Project Status

**Current**: Basic "ChainPots/League" prototype  
**Target**: Full Chainpool architecture per master plan  
**Gap**: ~70% of features missing or misaligned

## 🚨 Critical Actions Required

### Immediate Next Steps (This Week)

1. **Review Master Plan Alignment**

   - [ ] Read `/Chainpool Technical Master Plan.md` thoroughly
   - [ ] Review `/IMPLEMENTATION_PLAN.md` for strategy
   - [ ] Study `/TECHNICAL_SPECIFICATION.md` for details
   - [ ] Check `/ENGINEERING_CHECKLIST.md` for daily tasks

2. **Set Up Development Environment**

   ```bash
   cd /Users/izundu/chainpot
   pnpm install
   cd chain
   cp .env.example .env  # Create and configure
   cd ../apps/web
   cp .env.local.example .env.local  # Create and configure
   ```

3. **Start with Smart Contracts (Week 1)**
   - Begin with `ENGINEERING_CHECKLIST.md` - Week 1 tasks
   - Focus on `PoolFactory.sol` and `IPoolEscrow.sol` interface first
   - Implement billing system as separate library

## 📋 Architecture Overview

### Current vs Target

| Component      | Current State      | Target State              | Priority     |
| -------------- | ------------------ | ------------------------- | ------------ |
| Factory        | Direct deployment  | EIP-1167 clones           | 🔴 Critical  |
| Pool Types     | Single fixed-entry | Fixed + Flexible + Hybrid | 🔴 Critical  |
| Billing        | None               | Monthly tiered fees       | 🔴 Critical  |
| Referrals      | None               | Accrual + settlement      | 🔴 Critical  |
| Access Control | None               | Merkle + EIP-712          | 🟡 Important |
| Frontend       | Basic pot UI       | Full pool management      | 🟡 Important |

### Implementation Priority

1. **Week 1-4**: Smart contracts foundation
2. **Week 5-8**: Frontend integration
3. **Week 9-12**: Advanced features

## 🛠 Key Technical Decisions

### Smart Contract Architecture

- **Factory Pattern**: EIP-1167 for gas efficiency
- **Pool Modes**: Separate implementations for Fixed/Flexible
- **Billing**: Library-based system with tiered rates
- **Referrals**: Indexed tracking for gas optimization
- **Access Control**: Merkle trees for allowlists

### Frontend Architecture

- **Backward Compatibility**: Support legacy pools during migration
- **Component Structure**: Mode-aware pool components
- **State Management**: Enhanced contract integration
- **User Experience**: Clear migration paths

## 📁 File Structure Changes

### New Smart Contracts

```
chain/contracts/
├── interfaces/
│   └── IPoolEscrow.sol           # Common interface
├── libraries/
│   ├── BillingLib.sol            # Fee calculation
│   ├── ReferralLib.sol           # Referral logic
│   └── AccessControlLib.sol      # Merkle verification
├── PoolFactory.sol               # EIP-1167 factory
├── PoolEscrowFixed.sol           # Fixed-entry pools
├── PoolEscrowFlexible.sol        # Variable-amount pools
└── [Keep existing for compatibility]
```

### Frontend Enhancements

```
apps/web/src/
├── components/
│   ├── PoolView.tsx              # Renamed from PotView
│   ├── BillingPanel.tsx          # NEW: Billing display
│   ├── ReferralManager.tsx       # NEW: Referral system
│   ├── AccessControlManager.tsx  # NEW: Allowlist management
│   └── PoolModeSelector.tsx      # NEW: Mode selection
├── lib/
│   ├── pool.ts                   # NEW: Pool utilities
│   └── config.ts                 # NEW: Environment config
└── types/
    └── pool.ts                   # NEW: TypeScript interfaces
```

## ⚡ Getting Started Commands

### Development Setup

```bash
# Install dependencies
pnpm install

# Start local development
pnpm -C apps/web dev

# Test smart contracts
pnpm -C chain test

# Deploy to testnet
pnpm -C chain deploy:amoy
```

### Key Environment Variables Needed

```bash
# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology

# Contract Addresses (will be updated as new contracts deploy)
NEXT_PUBLIC_POOL_FACTORY_ADDRESS=
NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS=

# Development
DEPLOYER_KEY=
ALCHEMY_AMOY_URL=
```

## 🎯 Success Metrics

### Week 4 Goals

- [ ] All new smart contracts deployed on Amoy
- [ ] Test coverage >95%
- [ ] Gas optimization completed
- [ ] Security review ready

### Week 8 Goals

- [ ] Frontend integrated with new contracts
- [ ] Legacy compatibility maintained
- [ ] User migration path validated
- [ ] E2E testing complete

### Week 12 Goals

- [ ] Full feature parity with master plan
- [ ] Production deployment successful
- [ ] Documentation complete
- [ ] User training materials ready

## 🚨 Risk Mitigation

### Technical Risks

- **Backward Compatibility**: Keep legacy system running
- **Gas Costs**: Optimize early and often
- **Security**: Comprehensive testing and review
- **Migration**: Clear user paths and support

### Timeline Risks

- **Scope Creep**: Stick to master plan requirements
- **Dependencies**: Parallelize work where possible
- **Testing**: Don't compromise on coverage
- **Documentation**: Keep docs updated throughout

## 📞 Support and Resources

### Documentation

- Master Plan: `/Chainpool Technical Master Plan.md`
- Implementation Strategy: `/IMPLEMENTATION_PLAN.md`
- Technical Details: `/TECHNICAL_SPECIFICATION.md`
- Daily Tasks: `/ENGINEERING_CHECKLIST.md`

### Development Resources

- Hardhat for smart contract development
- Next.js for frontend
- Ethers.js for blockchain interaction
- Tailwind for styling

### Testing Resources

- Hardhat testing framework
- Foundry for advanced testing
- Cypress for E2E testing
- Gas reporter for optimization

## 🎬 Next Actions

1. **Today**: Review all documentation files
2. **This Week**: Start Week 1 of engineering checklist
3. **Daily**: Update progress against checklist
4. **Weekly**: Review progress and adjust timeline

Remember: This is a comprehensive realignment project. The goal is to transform the current prototype into a production-ready system that fully implements the Chainpool vision. Focus on quality, security, and user experience throughout the implementation.
