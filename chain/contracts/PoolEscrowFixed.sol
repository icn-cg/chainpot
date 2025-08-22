// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IPoolEscrow.sol";
import "./libraries/PoolEnums.sol";
import "./libraries/BillingLib.sol";
import "./libraries/ReferralLib.sol";
import "./libraries/AccessControlLib.sol";

/**
 * @title PoolEscrowFixed
 * @notice Fixed-entry pool escrow with monthly billing, referrals, and access control
 * @dev One contribution per wallet, fixed amount per contribution
 */
contract PoolEscrowFixed is IPoolEscrow, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using BillingLib for *;
    using ReferralLib for ReferralLib.ReferralData;
    using AccessControlLib for AccessControlLib.AccessData;
    
    // ============ STATE VARIABLES ============
    
    /// @notice Pool token (e.g., USDC)
    IERC20 private _token;
    
    /// @notice Fixed entry amount per contributor
    uint256 public entryUnit;
    
    /// @notice Pool end time (unix timestamp)
    uint256 public endTime;
    
    /// @notice When the pool was created (for billing)
    uint64 public createdAt;
    
    /// @notice Number of months already charged for billing
    uint16 public monthsCharged;
    
    /// @notice Referral rate in basis points
    uint16 public referralBps;
    
    /// @notice Fee policy for referrals
    IPoolEscrow.FeePolicy public feePolicy;
    
    /// @notice Address that receives protocol fees
    address public feeCollector;
    
    /// @notice Whether parameters are frozen (after first join)
    bool public paramsFrozen;
    
    /// @notice Whether pool has been cancelled
    bool public cancelled;
    
    /// @notice Whether pool has been paid out
    bool public paidOut;
    
    /// @notice Mapping of contributor => joined status
    mapping(address => bool) public joined;
    
    /// @notice Mapping of contributor => refunded status
    mapping(address => bool) public refunded;
    
    /// @notice Array of all contributors
    address[] public contributors;
    
    /// @notice Array of recipient addresses
    address[] public recipients;
    
    /// @notice Array of recipient basis points (must sum to 10000)
    uint16[] public recipientBps;
    
    // ============ LIBRARY STORAGE ============
    
    /// @notice Referral system data
    ReferralLib.ReferralData private referralData;
    
    /// @notice Access control data
    AccessControlLib.AccessData private accessData;
    
    // ============ ERRORS ============
    
    error PoolClosed();
    error PoolNotEnded();
    error PoolEnded();
    error AlreadyJoined();
    error NotJoined();
    error AlreadyRefunded();
    error NotCancelled();
    error ParamsFrozen();
    error InvalidRecipients();
    error RecipientsNotSet();
    error InvalidAmount();
    error Unauthorized();
    
    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Constructor for implementation contract
     * @dev This will be called once when deploying the implementation
     */
    constructor() Ownable(msg.sender) {
        // Implementation constructor - pools are initialized via initialize()
    }
    
    // ============ MODIFIERS ============
    
    modifier onlyBeforeEnd() {
        if (block.timestamp >= endTime) revert PoolEnded();
        _;
    }
    
    modifier onlyAfterEnd() {
        if (block.timestamp < endTime) revert PoolNotEnded();
        _;
    }
    
    modifier onlyActive() {
        if (cancelled || paidOut) revert PoolClosed();
        _;
    }
    
    modifier onlyBeforeFreeze() {
        if (paramsFrozen) revert ParamsFrozen();
        _;
    }
    
    // ============ INTERFACE IMPLEMENTATION ============
    
    function token() external view returns (address) {
        return address(_token);
    }
    
    // ============ INITIALIZATION ============
    
    /**
     * @notice Initialize the pool (called by factory)
     * @dev This replaces the constructor for clones
     */
    function initialize(
        address _organizer,
        address tokenAddr,
        uint256 _entryUnit,
        uint256 _endTime,
        bool _restricted,
        uint16 _referralBps,
        uint8 _feePolicy,
        bytes32 _merkleRoot,
        address _feeCollector
    ) external {
        // Ensure this is only called once
        require(createdAt == 0, "Already initialized");
        require(tokenAddr != address(0), "Invalid token");
        require(_entryUnit > 0, "Invalid entry unit");
        require(_endTime > block.timestamp, "Invalid end time");
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_referralBps <= PoolEnums.MAX_REFERRAL_BPS, "Invalid referral rate");
        
        // Initialize Ownable
        _transferOwnership(_organizer);
        
        // Set basic parameters
        _token = IERC20(tokenAddr);
        entryUnit = _entryUnit;
        endTime = _endTime;
        createdAt = uint64(block.timestamp);
        referralBps = _referralBps;
        feePolicy = IPoolEscrow.FeePolicy(_feePolicy);
        feeCollector = _feeCollector;
        
        // Set up access control if restricted
        if (_restricted) {
            accessData.updateMerkleRoot(_merkleRoot);
        }
    }
    
    // ============ CORE FUNCTIONS ============
    
    /**
     * @notice Join the pool with referral support
     * @param proof Merkle proof for allowlist (empty if public)
     * @param referrer Address of referrer (zero if none)
     * @param referralCode Referral code for tracking
     */
    function join(
        bytes32[] calldata proof,
        address referrer,
        bytes32 referralCode
    ) external nonReentrant onlyBeforeEnd onlyActive {
        // Check if already joined
        if (joined[msg.sender]) revert AlreadyJoined();
        
        // Check access control
        accessData.grantMerkleAccess(msg.sender, proof);
        
        // Freeze parameters on first join
        if (!paramsFrozen) {
            paramsFrozen = true;
        }
        
        // Transfer tokens
        _token.safeTransferFrom(msg.sender, address(this), entryUnit);
        
        // Record join
        joined[msg.sender] = true;
        contributors.push(msg.sender);
        
        // Handle referral
        referralData.accrueReferral(
            msg.sender,
            entryUnit,
            referrer,
            referralCode,
            referralBps
        );
        
        emit Contributed(msg.sender, entryUnit, referrer, referralCode);
    }
    
    /**
     * @notice Cancel the pool (organizer only)
     */
    function cancel() external onlyOwner onlyActive {
        cancelled = true;
        emit Cancelled();
    }
    
    /**
     * @notice Claim refund after cancellation
     */
    function claimRefund() external nonReentrant {
        if (!cancelled) revert NotCancelled();
        if (!joined[msg.sender]) revert NotJoined();
        if (refunded[msg.sender]) revert AlreadyRefunded();
        
        refunded[msg.sender] = true;
        _token.safeTransfer(msg.sender, entryUnit);
        
        emit Refunded(msg.sender, entryUnit);
    }
    
    /**
     * @notice Set recipients for payout (organizer only)
     * @param _recipients Array of recipient addresses
     * @param _recipientBps Array of recipient basis points (must sum to 10000)
     */
    function setRecipients(
        address[] calldata _recipients,
        uint16[] calldata _recipientBps
    ) external onlyOwner onlyAfterEnd onlyActive {
        if (_recipients.length == 0 || _recipients.length != _recipientBps.length) {
            revert InvalidRecipients();
        }
        
        if (_recipients.length > PoolEnums.MAX_RECIPIENTS) {
            revert InvalidRecipients();
        }
        
        // Validate that BPS sum to 10000
        uint256 totalBps;
        for (uint256 i = 0; i < _recipientBps.length; i++) {
            totalBps += _recipientBps[i];
        }
        if (totalBps != PoolEnums.BPS_DENOMINATOR) {
            revert InvalidRecipients();
        }
        
        // Clear existing recipients
        delete recipients;
        delete recipientBps;
        
        // Set new recipients
        for (uint256 i = 0; i < _recipients.length; i++) {
            recipients.push(_recipients[i]);
            recipientBps.push(_recipientBps[i]);
        }
        
        emit RecipientsSet(_recipients, _recipientBps);
    }
    
    /**
     * @notice Execute payout to recipients (organizer only)
     */
    function payout() external onlyOwner onlyAfterEnd onlyActive nonReentrant {
        if (recipients.length == 0) revert RecipientsNotSet();
        
        // Charge any outstanding monthly fees first
        (monthsCharged, ) = BillingLib.chargeOutstandingFees(
            _token,
            feeCollector,
            createdAt,
            monthsCharged
        );
        
        // Get current balance after fees
        uint256 balance = _token.balanceOf(address(this));
        if (balance == 0) revert InvalidAmount();
        
        // Calculate referral total
        uint256 referralTotal = referralData.getTotalReferralOwed();
        
        // Calculate distributable amount (balance - referrals)
        uint256 distributable = balance > referralTotal ? balance - referralTotal : 0;
        
        // Distribute to recipients
        uint256[] memory amounts = new uint256[](recipients.length);
        for (uint256 i = 0; i < recipients.length; i++) {
            amounts[i] = (distributable * recipientBps[i]) / PoolEnums.BPS_DENOMINATOR;
            if (amounts[i] > 0) {
                _token.safeTransfer(recipients[i], amounts[i]);
            }
        }
        
        // Settle referrals
        referralData.settleAllReferrals(_token);
        
        // Mark as paid out
        paidOut = true;
        
        emit PaidOut(recipients, amounts, 0, referralTotal);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Update entry unit (organizer only, before freeze)
     * @param newEntryUnit New entry amount
     */
    function updateEntryUnit(uint256 newEntryUnit) external onlyOwner onlyBeforeFreeze {
        require(newEntryUnit > 0, "Invalid entry unit");
        entryUnit = newEntryUnit;
        
        emit ParamsUpdated(entryUnit, endTime, accessData.merkleRoot, referralBps, feePolicy);
    }
    
    /**
     * @notice Update end time (organizer only, before freeze)
     * @param newEndTime New end time
     */
    function updateEndTime(uint256 newEndTime) external onlyOwner onlyBeforeFreeze {
        require(newEndTime > block.timestamp, "Invalid end time");
        endTime = newEndTime;
        
        emit ParamsUpdated(entryUnit, endTime, accessData.merkleRoot, referralBps, feePolicy);
    }
    
    /**
     * @notice Update Merkle root (organizer only, before freeze)
     * @param newMerkleRoot New Merkle root
     */
    function updateMerkleRoot(bytes32 newMerkleRoot) external onlyOwner onlyBeforeFreeze {
        accessData.updateMerkleRoot(newMerkleRoot);
        
        emit ParamsUpdated(entryUnit, endTime, newMerkleRoot, referralBps, feePolicy);
    }
    
    /**
     * @notice Update referral rate (organizer only, before freeze)
     * @param newReferralBps New referral rate in basis points
     */
    function updateReferralBps(uint16 newReferralBps) external onlyOwner onlyBeforeFreeze {
        require(newReferralBps <= PoolEnums.MAX_REFERRAL_BPS, "Invalid referral rate");
        referralBps = newReferralBps;
        
        emit ParamsUpdated(entryUnit, endTime, accessData.merkleRoot, referralBps, feePolicy);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function organizer() external view returns (address) {
        return owner();
    }
    
    function billingStatus() external view returns (
        uint16 _monthsCharged,
        uint256 nextChargeAt,
        uint8 currentTier,
        uint16 currentRateBps
    ) {
        uint16 monthsElapsed;
        (monthsElapsed, nextChargeAt, currentTier, currentRateBps) = BillingLib.getBillingStatus(
            createdAt,
            monthsCharged
        );
        return (monthsCharged, nextChargeAt, currentTier, currentRateBps);
    }
    
    function referralOwed(address referrer) external view returns (uint256) {
        return referralData.getReferralOwed(referrer);
    }
    
    function getContributors() external view returns (address[] memory) {
        return contributors;
    }
    
    function getPoolBalance() external view returns (uint256) {
        return _token.balanceOf(address(this));
    }
    
    function getRecipients() external view returns (address[] memory, uint16[] memory) {
        return (recipients, recipientBps);
    }
    
    function isRestricted() external view returns (bool) {
        return accessData.isAccessControlled();
    }
    
    function merkleRoot() external view returns (bytes32) {
        return accessData.merkleRoot;
    }
}
