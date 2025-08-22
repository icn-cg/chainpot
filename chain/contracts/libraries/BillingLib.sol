// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PoolEnums.sol";

/**
 * @title BillingLib
 * @notice Library for handling monthly billing calculations and fee collection
 * @dev Implements the tiered billing system: 0.50%/0.33%/0.25% for months 1-6/7-12/13+
 */
library BillingLib {
    using SafeERC20 for IERC20;
    
    // ============ EVENTS ============
    
    event MonthlyFeeCharged(
        address indexed pool,
        uint16 monthNumber,
        uint256 feeAmount,
        uint16 rateBps
    );
    
    // ============ BILLING CALCULATIONS ============
    
    /**
     * @notice Calculate the fee rate for a given month number
     * @param monthNumber The month number (1-based)
     * @return rateBps The fee rate in basis points
     */
    function calculateFeeRate(uint16 monthNumber) internal pure returns (uint16 rateBps) {
        if (monthNumber <= PoolEnums.TIER_1_MONTHS) {
            return PoolEnums.TIER_1_RATE; // 0.50%
        } else if (monthNumber <= PoolEnums.TIER_2_MONTHS) {
            return PoolEnums.TIER_2_RATE; // 0.33%
        } else {
            return PoolEnums.TIER_3_RATE; // 0.25%
        }
    }
    
    /**
     * @notice Calculate how many billing periods have elapsed since creation
     * @param createdAt Pool creation timestamp
     * @return monthsElapsed Number of 30-day periods elapsed
     */
    function calculateMonthsElapsed(uint64 createdAt) internal view returns (uint16 monthsElapsed) {
        if (block.timestamp <= createdAt) return 0;
        return uint16((block.timestamp - createdAt) / PoolEnums.BILLING_PERIOD);
    }
    
    /**
     * @notice Calculate the timestamp for the next billing charge
     * @param createdAt Pool creation timestamp
     * @param monthsCharged Number of months already charged
     * @return nextChargeAt Timestamp when next charge is due
     */
    function calculateNextChargeTime(
        uint64 createdAt,
        uint16 monthsCharged
    ) internal pure returns (uint256 nextChargeAt) {
        return createdAt + ((monthsCharged + 1) * PoolEnums.BILLING_PERIOD);
    }
    
    /**
     * @notice Get the current billing tier based on month number
     * @param monthNumber The month number (1-based)
     * @return tier Tier number (0=months 1-6, 1=months 7-12, 2=months 13+)
     */
    function getBillingTier(uint16 monthNumber) internal pure returns (uint8 tier) {
        if (monthNumber <= PoolEnums.TIER_1_MONTHS) {
            return 0;
        } else if (monthNumber <= PoolEnums.TIER_2_MONTHS) {
            return 1;
        } else {
            return 2;
        }
    }
    
    // ============ FEE COLLECTION ============
    
    /**
     * @notice Charge a monthly fee from the pool balance
     * @param token The ERC20 token to charge fees in
     * @param feeCollector Address to send fees to
     * @param poolBalance Current pool balance
     * @param rateBps Fee rate in basis points
     * @return feeCharged Actual amount charged
     */
    function chargeFee(
        IERC20 token,
        address feeCollector,
        uint256 poolBalance,
        uint16 rateBps
    ) internal returns (uint256 feeCharged) {
        if (poolBalance == 0 || rateBps == 0) return 0;
        
        feeCharged = (poolBalance * rateBps) / PoolEnums.BPS_DENOMINATOR;
        
        // Only charge if we have sufficient balance
        if (feeCharged > 0 && feeCharged <= poolBalance) {
            token.safeTransfer(feeCollector, feeCharged);
        } else {
            feeCharged = 0;
        }
    }
    
    /**
     * @notice Charge all outstanding monthly fees
     * @param token The ERC20 token to charge fees in
     * @param feeCollector Address to send fees to
     * @param createdAt Pool creation timestamp
     * @param monthsCharged Number of months already charged
     * @return newMonthsCharged Updated number of months charged
     * @return totalFeesCharged Total amount of fees charged
     */
    function chargeOutstandingFees(
        IERC20 token,
        address feeCollector,
        uint64 createdAt,
        uint16 monthsCharged
    ) internal returns (uint16 newMonthsCharged, uint256 totalFeesCharged) {
        uint16 monthsElapsed = calculateMonthsElapsed(createdAt);
        newMonthsCharged = monthsCharged;
        
        // Charge fees for each month that has elapsed but not been charged
        while (newMonthsCharged < monthsElapsed) {
            newMonthsCharged++;
            
            uint256 currentBalance = token.balanceOf(address(this));
            if (currentBalance == 0) break;
            
            uint16 rateBps = calculateFeeRate(newMonthsCharged);
            uint256 feeCharged = chargeFee(token, feeCollector, currentBalance, rateBps);
            
            totalFeesCharged += feeCharged;
            
            emit MonthlyFeeCharged(address(this), newMonthsCharged, feeCharged, rateBps);
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get comprehensive billing status
     * @param createdAt Pool creation timestamp
     * @param monthsCharged Number of months already charged
     * @return monthsElapsed Total months elapsed since creation
     * @return nextChargeAt Timestamp of next charge
     * @return currentTier Current billing tier
     * @return currentRateBps Current monthly rate in basis points
     */
    function getBillingStatus(
        uint64 createdAt,
        uint16 monthsCharged
    ) internal view returns (
        uint16 monthsElapsed,
        uint256 nextChargeAt,
        uint8 currentTier,
        uint16 currentRateBps
    ) {
        monthsElapsed = calculateMonthsElapsed(createdAt);
        nextChargeAt = calculateNextChargeTime(createdAt, monthsCharged);
        
        // Use the next month for tier/rate calculation
        uint16 nextMonth = monthsCharged + 1;
        currentTier = getBillingTier(nextMonth);
        currentRateBps = calculateFeeRate(nextMonth);
    }
}
