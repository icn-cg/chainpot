// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PoolEnums.sol";

/**
 * @title ReferralLib
 * @notice Library for handling referral accrual, tracking, and settlement
 * @dev Gas-optimized referral system with indexed tracking for efficient settlement
 */
library ReferralLib {
    using SafeERC20 for IERC20;
    
    // ============ STRUCTS ============
    
    struct ReferralData {
        mapping(address => uint256) referralAccrued;        // Amount owed to each referrer
        mapping(address => bytes32) referralCodeOf;         // Referral code used by each contributor
        address[] referrersIndex;                           // Enumerable list of unique referrers
        mapping(address => bool) isIndexedReferrer;         // Track if referrer is in index
        mapping(address => uint256) referrerIndexPosition;  // Position in referrersIndex for gas-efficient removal
    }
    
    // ============ EVENTS ============
    
    event ReferralAccrued(
        address indexed referrer,
        address indexed contributor,
        uint256 amount,
        bytes32 referralCode
    );
    
    event ReferralPaid(
        address indexed referrer,
        uint256 amount
    );
    
    // ============ REFERRAL ACCRUAL ============
    
    /**
     * @notice Accrue referral credit for a contribution
     * @param self The referral data storage
     * @param contributor Address making the contribution
     * @param amount Contribution amount
     * @param referrer Address of the referrer (can be zero)
     * @param referralCode Referral code used
     * @param referralBps Referral rate in basis points
     * @return referralCredit Amount credited to referrer
     */
    function accrueReferral(
        ReferralData storage self,
        address contributor,
        uint256 amount,
        address referrer,
        bytes32 referralCode,
        uint16 referralBps
    ) internal returns (uint256 referralCredit) {
        // Skip if no referrer or no referral rate
        if (referrer == address(0) || referralBps == 0 || amount == 0) {
            return 0;
        }
        
        // Validate referral rate
        require(referralBps <= PoolEnums.MAX_REFERRAL_BPS, "Referral rate too high");
        
        // Calculate referral credit
        referralCredit = (amount * referralBps) / PoolEnums.BPS_DENOMINATOR;
        
        if (referralCredit > 0) {
            // Add to referrer's accrued amount
            self.referralAccrued[referrer] += referralCredit;
            
            // Track referral code for contributor
            self.referralCodeOf[contributor] = referralCode;
            
            // Add to index if not already present
            if (!self.isIndexedReferrer[referrer]) {
                self.referrerIndexPosition[referrer] = self.referrersIndex.length;
                self.referrersIndex.push(referrer);
                self.isIndexedReferrer[referrer] = true;
            }
            
            emit ReferralAccrued(referrer, contributor, referralCredit, referralCode);
        }
    }
    
    // ============ REFERRAL SETTLEMENT ============
    
    /**
     * @notice Settle all outstanding referral payments
     * @param self The referral data storage
     * @param token The ERC20 token to pay referrals in
     * @return totalPaid Total amount paid to all referrers
     */
    function settleAllReferrals(
        ReferralData storage self,
        IERC20 token
    ) internal returns (uint256 totalPaid) {
        uint256 referrerCount = self.referrersIndex.length;
        
        // Gas safety check
        require(referrerCount <= PoolEnums.MAX_REFERRERS_PER_PAYOUT, "Too many referrers");
        
        for (uint256 i = 0; i < referrerCount; i++) {
            address referrer = self.referrersIndex[i];
            uint256 owed = self.referralAccrued[referrer];
            
            if (owed > 0) {
                self.referralAccrued[referrer] = 0;
                token.safeTransfer(referrer, owed);
                totalPaid += owed;
                
                emit ReferralPaid(referrer, owed);
            }
        }
    }
    
    /**
     * @notice Settle referrals in batches to avoid gas limits
     * @param self The referral data storage
     * @param token The ERC20 token to pay referrals in
     * @param startIndex Starting index in referrersIndex
     * @param maxCount Maximum number of referrers to process
     * @return totalPaid Total amount paid in this batch
     * @return nextIndex Next index to start from (0 if all done)
     */
    function settleBatchReferrals(
        ReferralData storage self,
        IERC20 token,
        uint256 startIndex,
        uint256 maxCount
    ) internal returns (uint256 totalPaid, uint256 nextIndex) {
        uint256 referrerCount = self.referrersIndex.length;
        uint256 endIndex = startIndex + maxCount;
        
        if (endIndex > referrerCount) {
            endIndex = referrerCount;
        }
        
        for (uint256 i = startIndex; i < endIndex; i++) {
            address referrer = self.referrersIndex[i];
            uint256 owed = self.referralAccrued[referrer];
            
            if (owed > 0) {
                self.referralAccrued[referrer] = 0;
                token.safeTransfer(referrer, owed);
                totalPaid += owed;
                
                emit ReferralPaid(referrer, owed);
            }
        }
        
        // Return next index (0 if all done)
        nextIndex = endIndex >= referrerCount ? 0 : endIndex;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get total amount owed to all referrers
     * @param self The referral data storage
     * @return totalOwed Total amount owed across all referrers
     */
    function getTotalReferralOwed(ReferralData storage self) internal view returns (uint256 totalOwed) {
        uint256 referrerCount = self.referrersIndex.length;
        
        for (uint256 i = 0; i < referrerCount; i++) {
            totalOwed += self.referralAccrued[self.referrersIndex[i]];
        }
    }
    
    /**
     * @notice Get amount owed to a specific referrer
     * @param self The referral data storage
     * @param referrer Address of the referrer
     * @return owed Amount owed to the referrer
     */
    function getReferralOwed(
        ReferralData storage self,
        address referrer
    ) internal view returns (uint256 owed) {
        return self.referralAccrued[referrer];
    }
    
    /**
     * @notice Get the referral code used by a contributor
     * @param self The referral data storage
     * @param contributor Address of the contributor
     * @return code Referral code used by the contributor
     */
    function getReferralCode(
        ReferralData storage self,
        address contributor
    ) internal view returns (bytes32 code) {
        return self.referralCodeOf[contributor];
    }
    
    /**
     * @notice Get number of unique referrers
     * @param self The referral data storage
     * @return count Number of unique referrers
     */
    function getReferrerCount(ReferralData storage self) internal view returns (uint256 count) {
        return self.referrersIndex.length;
    }
    
    /**
     * @notice Get all referrers (for external queries)
     * @param self The referral data storage
     * @return referrers Array of all unique referrer addresses
     */
    function getAllReferrers(ReferralData storage self) internal view returns (address[] memory referrers) {
        return self.referrersIndex;
    }
}
