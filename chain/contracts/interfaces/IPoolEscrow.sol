// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPoolEscrow
 * @notice Common interface for all pool escrow types (Fixed, Flexible, Hybrid)
 * @dev Standardizes the core functionality and events across all pool implementations
 */
interface IPoolEscrow {
    // ============ ENUMS ============
    
    enum Mode { FIXED_ENTRY, FLEXIBLE_AMOUNT, HYBRID }
    enum FeePolicy { ORGANIZER_ABSORB, CONTRIBUTOR_TOPUP }
    
    // ============ EVENTS ============
    
    /// @notice Emitted when a user contributes to the pool
    event Contributed(
        address indexed contributor,
        uint256 amount,
        address indexed referrer,
        bytes32 referralCode
    );
    
    /// @notice Emitted when a user claims a refund after cancellation
    event Refunded(address indexed contributor, uint256 amount);
    
    /// @notice Emitted when the pool is cancelled by organizer
    event Cancelled();
    
    /// @notice Emitted when recipients are set by organizer
    event RecipientsSet(address[] recipients, uint16[] bps);
    
    /// @notice Emitted when the pool is paid out
    event PaidOut(
        address[] recipients,
        uint256[] amounts,
        uint256 platformFee,
        uint256 referralTotal
    );
    
    /// @notice Emitted when pool parameters are updated (before first contribution)
    event ParamsUpdated(
        uint256 entryUnit,
        uint256 endTime,
        bytes32 merkleRoot,
        uint16 referralBps,
        FeePolicy feePolicy
    );
    
    /// @notice Emitted when monthly fees are charged
    event MonthlyFeeCharged(uint16 monthNumber, uint256 feeAmount, uint16 rateBps);
    
    // ============ CORE STATE FUNCTIONS ============
    
    /// @notice Get the ERC20 token used for this pool (e.g., USDC)
    function token() external view returns (address);
    
    /// @notice Get the organizer (owner) of this pool
    function organizer() external view returns (address);
    
    /// @notice Get the pool end time (unix timestamp)
    function endTime() external view returns (uint256);
    
    /// @notice Check if the pool has been cancelled
    function cancelled() external view returns (bool);
    
    /// @notice Check if the pool has been paid out
    function paidOut() external view returns (bool);
    
    /// @notice Get when the pool was created (for billing calculation)
    function createdAt() external view returns (uint64);
    
    /// @notice Get how many months have been charged for billing
    function monthsCharged() external view returns (uint16);
    
    /// @notice Get the referral rate in basis points (e.g., 100 = 1%)
    function referralBps() external view returns (uint16);
    
    /// @notice Get the fee policy (who pays referrals)
    function feePolicy() external view returns (FeePolicy);
    
    // ============ CORE ACTIONS ============
    
    /// @notice Trigger payout to recipients (organizer only, after endTime)
    function payout() external;
    
    /// @notice Cancel the pool (organizer only)
    function cancel() external;
    
    // ============ VIEW FUNCTIONS ============
    
    /// @notice Get current billing status
    /// @return monthsCharged Number of months already charged
    /// @return nextChargeAt Timestamp of next charge
    /// @return currentTier Current billing tier (0=months 1-6, 1=months 7-12, 2=months 13+)
    /// @return currentRateBps Current monthly rate in basis points
    function billingStatus() external view returns (
        uint16 monthsCharged,
        uint256 nextChargeAt,
        uint8 currentTier,
        uint16 currentRateBps
    );
    
    /// @notice Get amount owed to a specific referrer
    /// @param referrer The referrer address
    /// @return amount Amount owed in pool token units
    function referralOwed(address referrer) external view returns (uint256);
    
    /// @notice Get list of all contributors
    /// @return contributors Array of contributor addresses
    function getContributors() external view returns (address[] memory);
    
    /// @notice Get current pool balance
    /// @return balance Current balance in pool token units
    function getPoolBalance() external view returns (uint256);
}
