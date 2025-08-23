// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;

    constructor(uint256 initialSupply) ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    // Admin faucet function - only owner can mint new tokens
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Public faucet function - anyone can mint small amounts for testing
    function faucet(address to, uint256 amount) external {
        require(amount <= 1000 * 10**DECIMALS, "Faucet limit: 1000 mUSDC");
        _mint(to, amount);
    }
}
