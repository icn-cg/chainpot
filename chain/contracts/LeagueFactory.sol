// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LeagueEscrowV2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LeagueFactory {
    event LeagueCreated(
        address indexed owner,
        address indexed league,
        address token,
        uint256 entryFee,
        uint256 endTime
    );

    address[] public allLeagues;
    mapping(address => address[]) public leaguesByOwner;

    /// @notice Deploy a new per-league escrow (pot)
    /// @param owner Admin wallet for this league (usually msg.sender)
    /// @param token ERC20 used for entry fees (e.g., USDC)
    /// @param entryFee Fee in smallest units (USDC has 6 decimals)
    /// @param leagueEndTime Unix timestamp when league ends
    function createLeague(
        address owner,
        address token,
        uint256 entryFee,
        uint256 leagueEndTime
    ) external returns (address league) {
        league = address(
            new LeagueEscrowV2(owner, IERC20(token), entryFee, leagueEndTime)
        );
        allLeagues.push(league);
        leaguesByOwner[owner].push(league);
        emit LeagueCreated(owner, league, token, entryFee, leagueEndTime);
    }

    function allLeaguesCount() external view returns (uint256) {
        return allLeagues.length;
    }

    function leaguesOf(address owner) external view returns (address[] memory) {
        return leaguesByOwner[owner];
    }
}
