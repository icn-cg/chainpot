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
 * @title PoolEscrowFlexible
 * @notice Flexible-entry pool escrow with monthly billing, referrals, and access control
 * @dev Multiple contributions per wallet, flexible amounts
 */
contract PoolEscrowFlexible is IPoolEscrow, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using BillingLib for *;
    using ReferralLib for ReferralLib.ReferralData;
    using AccessControlLib for AccessControlLib.AccessData;
    
    // ============ STATE VARIABLES ============
    
    /// @notice Pool token (e.g., USDC)
    IERC20 private _token;
    
    /// @notice Minimum contribution amount
    uint256 public minEntry;
    
    /// @notice Maximum contribution amount per tx
    uint256 public maxEntry;
    
    /// @notice Maximum total pool size
    uint256 public maxPoolSize;
    
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
    
    /// @notice Total amount contributed to the pool
    uint256 public totalContributed;
    
    /// @notice Mapping of contributor => total amount contributed
    mapping(address => uint256) public contributed;
    
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
    error NotContributor();
    error AlreadyRefunded();
    error NotCancelled();
    error ParamsFrozen();
    error InvalidRecipients();
    error RecipientsNotSet();
    error InvalidAmount();
    error Unauthorized();
    error PoolSizeExceeded();
    
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
        uint256 _minEntry,
        uint256 _maxEntry,
        uint256 _maxPoolSize,
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
        require(_minEntry > 0, "Invalid min entry");
        require(_maxEntry >= _minEntry, "Max entry must be >= min entry");
        require(_maxPoolSize > 0, "Invalid max pool size");
        require(_endTime > block.timestamp, "Invalid end time");
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_referralBps <= PoolEnums.MAX_REFERRAL_BPS, "Invalid referral rate");
        
        // Initialize Ownable
        _transferOwnership(_organizer);
        
        // Set basic parameters
        _token = IERC20(tokenAddr);
        minEntry = _minEntry;
        maxEntry = _maxEntry;
        maxPoolSize = _maxPoolSize;
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
     * @param amount Amount to contribute
     * @param proof Merkle proof for allowlist (empty if public)
     * @param referrer Address of referrer (zero if none)
     * @param referralCode Referral code for tracking
     */
    function contribute(
        uint256 amount,
        bytes32[] calldata proof,
        address referrer,
        bytes32 referralCode
    ) external nonReentrant onlyBeforeEnd onlyActive {
        // Validate amount
        if (amount < minEntry || amount > maxEntry) revert InvalidAmount();
        if (totalContributed + amount > maxPoolSize) revert PoolSizeExceeded();
        
        // Check access control
        accessData.grantMerkleAccess(msg.sender, proof);
        
        // Freeze parameters on first join
        if (!paramsFrozen) {
            paramsFrozen = true;
        }
        
        // Transfer tokens
        _token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Record contribution
        bool firstContribution = contributed[msg.sender] == 0;
        contributed[msg.sender] += amount;
        totalContributed += amount;
        
        // Add to contributors array on first contribution
        if (firstContribution) {
            contributors.push(msg.sender);
        }
        
        // Handle referral
        referralData.accrueReferral(
            msg.sender,
            amount,
            referrer,
            referralCode,
            referralBps
        );
        
        emit Contributed(msg.sender, amount, referrer, referralCode);
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
        if (contributed[msg.sender] == 0) revert NotContributor();
        if (refunded[msg.sender]) revert AlreadyRefunded();
        
        uint256 amount = contributed[msg.sender];
        refunded[msg.sender] = true;
        _token.safeTransfer(msg.sender, amount);
        
        emit Refunded(msg.sender, amount);
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
     * @notice Update entry limits (organizer only, before freeze)
     * @param newMinEntry New minimum entry amount
     * @param newMaxEntry New maximum entry amount
     */
    function updateEntryLimits(uint256 newMinEntry, uint256 newMaxEntry) external onlyOwner onlyBeforeFreeze {
        require(newMinEntry > 0, "Invalid min entry");
        require(newMaxEntry >= newMinEntry, "Max entry must be >= min entry");
        minEntry = newMinEntry;
        maxEntry = newMaxEntry;
        
        emit ParamsUpdated(minEntry, endTime, accessData.merkleRoot, referralBps, feePolicy);
    }
    
    /**
     * @notice Update max pool size (organizer only, before freeze)
     * @param newMaxPoolSize New maximum pool size
     */
    function updateMaxPoolSize(uint256 newMaxPoolSize) external onlyOwner onlyBeforeFreeze {
        require(newMaxPoolSize > 0, "Invalid max pool size");
        maxPoolSize = newMaxPoolSize;
        
        emit ParamsUpdated(minEntry, endTime, accessData.merkleRoot, referralBps, feePolicy);
    }
    
    /**
     * @notice Update end time (organizer only, before freeze)
     * @param newEndTime New end time
     */
    function updateEndTime(uint256 newEndTime) external onlyOwner onlyBeforeFreeze {
        require(newEndTime > block.timestamp, "Invalid end time");
        endTime = newEndTime;
        
        emit ParamsUpdated(minEntry, endTime, accessData.merkleRoot, referralBps, feePolicy);
    }
    
    /**
     * @notice Update Merkle root (organizer only, before freeze)
     * @param newMerkleRoot New Merkle root
     */
    function updateMerkleRoot(bytes32 newMerkleRoot) external onlyOwner onlyBeforeFreeze {
        accessData.updateMerkleRoot(newMerkleRoot);
        
        emit ParamsUpdated(minEntry, endTime, newMerkleRoot, referralBps, feePolicy);
    }
    
    /**
     * @notice Update referral rate (organizer only, before freeze)
     * @param newReferralBps New referral rate in basis points
     */
    function updateReferralBps(uint16 newReferralBps) external onlyOwner onlyBeforeFreeze {
        require(newReferralBps <= PoolEnums.MAX_REFERRAL_BPS, "Invalid referral rate");
        referralBps = newReferralBps;
        
        emit ParamsUpdated(minEntry, endTime, accessData.merkleRoot, referralBps, feePolicy);
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
    
    function getContribution(address contributor) external view returns (uint256) {
        return contributed[contributor];
    }
    
    function getRemainingPoolSize() external view returns (uint256) {
        return maxPoolSize > totalContributed ? maxPoolSize - totalContributed : 0;
    }
}
