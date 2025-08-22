// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PoolEnums
 * @notice Shared enums and constants for the Chainpool system
 */
library PoolEnums {
    // ============ POOL MODES ============
    
    enum Mode {
        FIXED_ENTRY,    // Fixed amount per contributor, one contribution per wallet
        FLEXIBLE_AMOUNT, // Variable amounts, multiple contributions allowed
        HYBRID          // Fixed amount per wallet, unlimited contributors (V2)
    }
    
    // ============ FEE POLICIES ============
    
    enum FeePolicy {
        ORGANIZER_ABSORB,   // Organizer pays referral fees (default)
        CONTRIBUTOR_TOPUP   // Contributors pay extra for referrals (V1.1)
    }
    
    // ============ ACCESS CONTROL ============
    
    enum AccessControl {
        PUBLIC,     // Anyone can join
        ALLOWLIST,  // Merkle tree allowlist required
        VOUCHER     // EIP-712 voucher required (V1.1)
    }
    
    // ============ BILLING CONSTANTS ============
    
    /// @notice Billing tier rates in basis points (1 bps = 0.01%)
    uint16 constant TIER_1_RATE = 50;  // 0.50% for months 1-6
    uint16 constant TIER_2_RATE = 33;  // 0.33% for months 7-12
    uint16 constant TIER_3_RATE = 25;  // 0.25% for months 13+
    
    /// @notice Tier boundaries in months
    uint16 constant TIER_1_MONTHS = 6;
    uint16 constant TIER_2_MONTHS = 12;
    
    /// @notice Billing period in seconds (30 days)
    uint256 constant BILLING_PERIOD = 30 days;
    
    // ============ REFERRAL CONSTANTS ============
    
    /// @notice Maximum referral rate in basis points (20% = 2000 bps)
    uint16 constant MAX_REFERRAL_BPS = 2000;
    
    /// @notice Typical referral rate cap for UI (10% = 1000 bps)
    uint16 constant TYPICAL_REFERRAL_CAP = 1000;
    
    // ============ GAS LIMITS ============
    
    /// @notice Maximum number of referrers to settle in one transaction
    uint256 constant MAX_REFERRERS_PER_PAYOUT = 100;
    
    /// @notice Maximum number of recipients allowed
    uint256 constant MAX_RECIPIENTS = 50;
    
    // ============ BASIS POINTS ============
    
    /// @notice 100% in basis points
    uint16 constant BPS_DENOMINATOR = 10000;
}
