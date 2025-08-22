// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IPoolEscrow.sol";
import "./libraries/PoolEnums.sol";

/**
 * @title PoolFactory
 * @notice Factory contract for creating pool escrows using EIP-1167 minimal clones
 * @dev Supports Fixed, Flexible, and Hybrid pool modes with governance over implementations
 */
contract PoolFactory is Ownable {
    using Clones for address;
    
    // ============ STATE VARIABLES ============
    
    /// @notice Implementation contract for Fixed-Entry pools
    address public implementationFixed;
    
    /// @notice Implementation contract for Flexible-Amount pools  
    address public implementationFlexible;
    
    /// @notice Implementation contract for Hybrid pools (V2)
    address public implementationHybrid;
    
    /// @notice Address that receives protocol fees
    address public feeCollector;
    
    /// @notice Mapping of organizer => array of their pools
    mapping(address => address[]) public poolsByOrganizer;
    
    /// @notice Array of all pools ever created
    address[] public allPools;
    
    // ============ STRUCTS ============
    
    struct CreateArgs {
        address organizer;          // Pool organizer/owner
        address token;             // ERC20 token for pool (e.g., USDC)
        PoolEnums.Mode mode;       // Pool mode (Fixed/Flexible/Hybrid)
        uint256 entryUnit;         // Entry amount for Fixed mode (ignored for Flexible)
        uint256 endTime;           // Pool end time (unix timestamp)
        bool restricted;           // Enable access control
        uint16 referralBps;        // Referral rate in basis points (0-2000)
        PoolEnums.FeePolicy feePolicy; // Who pays referral fees
        bytes32 merkleRoot;        // Merkle root for allowlist (optional)
    }
    
    // ============ EVENTS ============
    
    event PoolCreated(
        address indexed organizer,
        address indexed pool,
        address indexed token,
        PoolEnums.Mode mode,
        uint256 entryUnit,
        uint256 endTime,
        bool restricted,
        uint16 referralBps,
        PoolEnums.FeePolicy feePolicy,
        bytes32 merkleRoot
    );
    
    event ImplementationUpdated(
        PoolEnums.Mode mode,
        address oldImplementation,
        address newImplementation
    );
    
    event FeeCollectorUpdated(
        address oldFeeCollector,
        address newFeeCollector
    );
    
    // ============ ERRORS ============
    
    error InvalidEndTime();
    error InvalidEntryUnit();
    error InvalidReferralRate();
    error InvalidImplementation();
    error UnsupportedMode();
    
    // ============ CONSTRUCTOR ============
    
    constructor(
        address _implementationFixed,
        address _implementationFlexible,
        address _feeCollector,
        address _owner
    ) Ownable(_owner) {
        require(_implementationFixed != address(0), "Invalid fixed implementation");
        require(_implementationFlexible != address(0), "Invalid flexible implementation");
        require(_feeCollector != address(0), "Invalid fee collector");
        
        implementationFixed = _implementationFixed;
        implementationFlexible = _implementationFlexible;
        feeCollector = _feeCollector;
    }
    
    // ============ POOL CREATION ============
    
    /**
     * @notice Create a new pool escrow
     * @param args Pool creation parameters
     * @return pool Address of the created pool
     */
    function createPool(CreateArgs calldata args) external returns (address pool) {
        // Validate parameters
        _validateCreateArgs(args);
        
        // Get implementation based on mode
        address implementation = _getImplementation(args.mode);
        if (implementation == address(0)) {
            revert UnsupportedMode();
        }
        
        // Create clone
        pool = implementation.clone();
        
        // Initialize the pool
        _initializePool(pool, args);
        
        // Track the pool
        poolsByOrganizer[args.organizer].push(pool);
        allPools.push(pool);
        
        // Emit event
        emit PoolCreated(
            args.organizer,
            pool,
            args.token,
            args.mode,
            args.entryUnit,
            args.endTime,
            args.restricted,
            args.referralBps,
            args.feePolicy,
            args.merkleRoot
        );
    }
    
    // ============ GOVERNANCE ============
    
    /**
     * @notice Update implementation for a specific mode (owner only)
     * @param mode Pool mode to update
     * @param newImplementation New implementation address
     */
    function setImplementation(
        PoolEnums.Mode mode,
        address newImplementation
    ) external onlyOwner {
        require(newImplementation != address(0), "Invalid implementation");
        
        address oldImplementation;
        
        if (mode == PoolEnums.Mode.FIXED_ENTRY) {
            oldImplementation = implementationFixed;
            implementationFixed = newImplementation;
        } else if (mode == PoolEnums.Mode.FLEXIBLE_AMOUNT) {
            oldImplementation = implementationFlexible;
            implementationFlexible = newImplementation;
        } else if (mode == PoolEnums.Mode.HYBRID) {
            oldImplementation = implementationHybrid;
            implementationHybrid = newImplementation;
        } else {
            revert UnsupportedMode();
        }
        
        emit ImplementationUpdated(mode, oldImplementation, newImplementation);
    }
    
    /**
     * @notice Update fee collector address (owner only)
     * @param newFeeCollector New fee collector address
     */
    function setFeeCollector(address newFeeCollector) external onlyOwner {
        require(newFeeCollector != address(0), "Invalid fee collector");
        
        address oldFeeCollector = feeCollector;
        feeCollector = newFeeCollector;
        
        emit FeeCollectorUpdated(oldFeeCollector, newFeeCollector);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get all pools created by an organizer
     * @param organizer Address of the organizer
     * @return pools Array of pool addresses
     */
    function getPoolsByOrganizer(address organizer) external view returns (address[] memory pools) {
        return poolsByOrganizer[organizer];
    }
    
    /**
     * @notice Get total number of pools created
     * @return count Total pool count
     */
    function getAllPoolsCount() external view returns (uint256 count) {
        return allPools.length;
    }
    
    /**
     * @notice Get pool address by index
     * @param index Pool index
     * @return pool Pool address
     */
    function getPoolByIndex(uint256 index) external view returns (address pool) {
        require(index < allPools.length, "Index out of bounds");
        return allPools[index];
    }
    
    /**
     * @notice Get implementation address for a mode
     * @param mode Pool mode
     * @return implementation Implementation address
     */
    function getImplementation(PoolEnums.Mode mode) external view returns (address implementation) {
        return _getImplementation(mode);
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @notice Validate pool creation arguments
     * @param args Pool creation parameters
     */
    function _validateCreateArgs(CreateArgs calldata args) private view {
        // Validate end time
        if (args.endTime <= block.timestamp) {
            revert InvalidEndTime();
        }
        
        // Validate entry unit for Fixed mode
        if (args.mode == PoolEnums.Mode.FIXED_ENTRY && args.entryUnit == 0) {
            revert InvalidEntryUnit();
        }
        
        // Validate referral rate
        if (args.referralBps > PoolEnums.MAX_REFERRAL_BPS) {
            revert InvalidReferralRate();
        }
    }
    
    /**
     * @notice Get implementation address for a mode
     * @param mode Pool mode
     * @return implementation Implementation address
     */
    function _getImplementation(PoolEnums.Mode mode) private view returns (address implementation) {
        if (mode == PoolEnums.Mode.FIXED_ENTRY) {
            return implementationFixed;
        } else if (mode == PoolEnums.Mode.FLEXIBLE_AMOUNT) {
            return implementationFlexible;
        } else if (mode == PoolEnums.Mode.HYBRID) {
            return implementationHybrid;
        }
        return address(0);
    }
    
    /**
     * @notice Initialize a newly created pool
     * @param pool Pool address
     * @param args Pool creation parameters
     */
    function _initializePool(address pool, CreateArgs calldata args) private {
        // Call initialize function on the pool
        // The exact interface will depend on the pool implementation
        // For now, we'll use a low-level call to maintain flexibility
        
        bytes memory initData = abi.encodeWithSignature(
            "initialize(address,address,uint256,uint256,bool,uint16,uint8,bytes32,address)",
            args.organizer,
            args.token,
            args.entryUnit,
            args.endTime,
            args.restricted,
            args.referralBps,
            uint8(args.feePolicy),
            args.merkleRoot,
            feeCollector
        );
        
        (bool success, ) = pool.call(initData);
        require(success, "Pool initialization failed");
    }
}
