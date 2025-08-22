// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AccessControlLib
 * @notice Library for handling access control mechanisms (Merkle proofs, EIP-712 vouchers)
 * @dev Gas-optimized access control with support for allowlists and voucher systems
 */
library AccessControlLib {
    
    // ============ STRUCTS ============
    
    struct AccessData {
        bytes32 merkleRoot;                    // Merkle root for allowlist (zero = public)
        mapping(address => bool) hasAccess;    // Track who has been granted access
        mapping(bytes32 => bool) usedNonces;   // Track used nonces for voucher system
    }
    
    // ============ EVENTS ============
    
    event AccessGranted(
        address indexed user,
        bytes32 indexed merkleRoot,
        bool isVoucher
    );
    
    // ============ ERRORS ============
    
    error InvalidMerkleProof();
    error InvalidVoucher();
    error VoucherExpired();
    error VoucherAlreadyUsed();
    error AlreadyJoined();
    
    // ============ MERKLE ALLOWLIST ============
    
    /**
     * @notice Verify a Merkle proof for allowlist access
     * @param self The access control data storage
     * @param user Address to verify
     * @param proof Merkle proof array
     * @return isValid True if proof is valid
     */
    function verifyMerkleProof(
        AccessData storage self,
        address user,
        bytes32[] calldata proof
    ) internal view returns (bool isValid) {
        // If no merkle root set, access is public
        if (self.merkleRoot == bytes32(0)) {
            return true;
        }
        
        // Verify the merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(user));
        return _verifyProof(proof, self.merkleRoot, leaf);
    }
    
    /**
     * @notice Grant access after verifying Merkle proof
     * @param self The access control data storage
     * @param user Address requesting access
     * @param proof Merkle proof array
     */
    function grantMerkleAccess(
        AccessData storage self,
        address user,
        bytes32[] calldata proof
    ) internal {
        // If access control is not enabled, allow everyone
        if (!isAccessControlled(self)) {
            return;
        }
        
        // Check if user has valid access (first time or already granted)
        if (self.hasAccess[user]) {
            return; // Already verified
        }
        
        // Verify merkle proof
        if (!verifyMerkleProof(self, user, proof)) {
            revert InvalidMerkleProof();
        }
        
        // Grant access
        self.hasAccess[user] = true;
        // Grant access
        self.hasAccess[user] = true;
        
        emit AccessGranted(user, self.merkleRoot, false);
    }
    
    // ============ EIP-712 VOUCHER SYSTEM (V1.1) ============
    
    struct Voucher {
        address user;       // Address allowed to join
        address pool;       // Pool address (prevents replay across pools)
        uint256 deadline;   // Expiration timestamp
        bytes32 nonce;      // Unique nonce (prevents replay)
    }
    
    // EIP-712 domain separator
    bytes32 constant VOUCHER_TYPEHASH = keccak256(
        "Voucher(address user,address pool,uint256 deadline,bytes32 nonce)"
    );
    
    /**
     * @notice Verify and consume an EIP-712 voucher
     * @param self The access control data storage
     * @param voucher The voucher struct
     * @param signature The organizer's signature
     * @param organizer Address of the pool organizer
     * @param domainSeparator EIP-712 domain separator for this pool
     */
    function grantVoucherAccess(
        AccessData storage self,
        Voucher calldata voucher,
        bytes calldata signature,
        address organizer,
        bytes32 domainSeparator
    ) internal {
                // Check if user already has access (vouchers can't be reused but access persists)
        if (self.hasAccess[voucher.user]) {
            return; // Already has access, no need to process voucher again
        }
        
        // Check expiration
        if (block.timestamp > voucher.deadline) {
            revert VoucherExpired();
        }
        
        // Check nonce hasn't been used
        if (self.usedNonces[voucher.nonce]) {
            revert VoucherAlreadyUsed();
        }
        
        // Verify signature
        bytes32 structHash = keccak256(abi.encode(
            VOUCHER_TYPEHASH,
            voucher.user,
            voucher.pool,
            voucher.deadline,
            voucher.nonce
        ));
        
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            domainSeparator,
            structHash
        ));
        
        address signer = _recoverSigner(digest, signature);
        if (signer != organizer) {
            revert InvalidVoucher();
        }
        
        // Mark nonce as used and grant access
        self.usedNonces[voucher.nonce] = true;
        self.hasAccess[voucher.user] = true;
        
        emit AccessGranted(voucher.user, bytes32(0), true);
    }
    
    // ============ ADMINISTRATIVE ============
    
    /**
     * @notice Update the Merkle root (organizer only, before params frozen)
     * @param self The access control data storage
     * @param newRoot New Merkle root (zero = make public)
     */
    function updateMerkleRoot(AccessData storage self, bytes32 newRoot) internal {
        self.merkleRoot = newRoot;
    }
    
    /**
     * @notice Check if access control is enabled
     * @param self The access control data storage
     * @return enabled True if access control is enabled
     */
    function isAccessControlled(AccessData storage self) internal view returns (bool enabled) {
        return self.merkleRoot != bytes32(0);
    }
    
    // ============ INTERNAL HELPERS ============
    
    /**
     * @notice Verify a Merkle proof
     * @param proof Merkle proof array
     * @param root Merkle root
     * @param leaf Leaf to verify
     * @return True if proof is valid
     */
    function _verifyProof(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) private pure returns (bool) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash == root;
    }
    
    /**
     * @notice Recover signer from EIP-712 signature
     * @param digest Message digest
     * @param signature Signature bytes
     * @return signer Recovered signer address
     */
    function _recoverSigner(
        bytes32 digest,
        bytes memory signature
    ) private pure returns (address signer) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        return ecrecover(digest, v, r, s);
    }
}
