// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockETH
 * @dev A simple ERC20 token that mimics ETH behavior for testing
 */
contract MockETH is ERC20 {
    uint8 private _decimals;

    constructor(uint256 _initialSupply) ERC20("Mock ETH", "mETH") {
        _decimals = 18; // Same as ETH
        _mint(msg.sender, _initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // Allow anyone to mint for testing (don't do this in production!)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // Faucet function - gives 1 ETH worth to caller
    function faucet() external {
        _mint(msg.sender, 1 ether);
    }
}
