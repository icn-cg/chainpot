// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Per-league escrow with ERC20 (e.g., USDC), editable fee/end until first join.
///         After end: set winners (bps sum to 10000) and payout once. Cancel -> self refunds.
contract LeagueEscrowV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---- Storage (no underscores) ----
    IERC20 public token; // e.g., USDC (6 decimals)
    uint256 public entryFee; // smallest units (50 USDC => 50_000_000 for 6-dec tokens)
    uint256 public leagueEndTime; // unix timestamp

    bool public paramsFrozen; // flips true on first join
    uint256 public startTime; // set at first join

    bool public paidOut;
    bool public canceled;

    uint256 public playerCount;
    uint256 public pot; // cosmetic tally; token.balanceOf(this) is the source of truth

    mapping(address => bool) public joined;
    mapping(address => bool) public refunded;
    address[] public participants;

    address[] public winners;
    uint16[] public winnerBps; // 10000 = 100%

    // ---- Events ----
    event Joined(address indexed player, uint256 amount);
    event ParamsUpdated(uint256 entryFee, uint256 leagueEndTime);
    event WinnersSet(address[] winners, uint16[] bps);
    event PaidOut(address[] winners, uint256[] amounts);
    event Canceled();
    event Refunded(address indexed player, uint256 amount);

    // ---- Constructor: params use suffix "_" to avoid shadowing ----
    constructor(
        address owner_,
        IERC20 token_,
        uint256 entryFee_,
        uint256 leagueEndTime_
    ) Ownable(owner_) {
        require(address(token_) != address(0), "token req");
        require(entryFee_ > 0, "fee > 0");
        require(leagueEndTime_ > block.timestamp, "end future");
        token = token_;
        entryFee = entryFee_;
        leagueEndTime = leagueEndTime_;
    }

    // ---- Views ----
    function participantsCount() external view returns (uint256) {
        return participants.length;
    }

    function winnersCount() external view returns (uint256) {
        return winners.length;
    }

    function getPotBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    // ---- Admin edits (only before first join) ----
    function updateEntryFee(uint256 newFee) external onlyOwner {
        require(!paramsFrozen, "params frozen");
        require(newFee > 0, "fee>0");
        entryFee = newFee;
        emit ParamsUpdated(entryFee, leagueEndTime);
    }

    function updateLeagueEndTime(uint256 newEnd) external onlyOwner {
        require(!paramsFrozen, "params frozen");
        require(newEnd > block.timestamp, "end future");
        leagueEndTime = newEnd;
        emit ParamsUpdated(entryFee, leagueEndTime);
    }

    // ---- Join / Cancel / Refund ----
    function joinLeague() external nonReentrant {
        require(!paidOut && !canceled, "closed");
        require(block.timestamp < leagueEndTime, "join closed");
        require(!joined[msg.sender], "already");

        if (!paramsFrozen) {
            paramsFrozen = true;
            startTime = block.timestamp;
        }

        joined[msg.sender] = true;
        participants.push(msg.sender);
        playerCount += 1;

        token.safeTransferFrom(msg.sender, address(this), entryFee);
        pot += entryFee; // cosmetic
        emit Joined(msg.sender, entryFee);
    }

    function cancelLeague() external onlyOwner {
        require(!paidOut && !canceled, "closed");
        canceled = true;
        emit Canceled();
    }

    function claimRefund() external nonReentrant {
        require(canceled, "not canceled");
        require(joined[msg.sender], "not joined");
        require(!refunded[msg.sender], "refunded");
        refunded[msg.sender] = true;
        token.safeTransfer(msg.sender, entryFee);
        if (pot >= entryFee) pot -= entryFee; // keep non-negative cosmetic pot
        emit Refunded(msg.sender, entryFee);
    }

    // ---- Payout ----
    function setWinners(
        address[] calldata winners_,
        uint16[] calldata bps_
    ) external onlyOwner {
        require(!paidOut && !canceled, "closed");
        require(block.timestamp >= leagueEndTime, "not ended");
        require(
            winners_.length > 0 && winners_.length == bps_.length,
            "bad arrays"
        );

        uint256 total;
        for (uint256 i = 0; i < bps_.length; i++) total += bps_[i];
        require(total == 10000, "bps=10000");

        winners = winners_;
        winnerBps = bps_;
        emit WinnersSet(winners_, bps_);
    }

    function payout() external onlyOwner nonReentrant {
        require(!paidOut && !canceled, "closed");
        require(block.timestamp >= leagueEndTime, "not ended");
        require(
            winners.length > 0 && winners.length == winnerBps.length,
            "set winners"
        );

        uint256 bal = token.balanceOf(address(this));
        require(bal > 0, "empty");

        uint256[] memory amounts = new uint256[](winners.length);
        for (uint256 i = 0; i < winners.length; i++) {
            uint256 amt = (bal * uint256(winnerBps[i])) / 10000;
            amounts[i] = amt;
            token.safeTransfer(winners[i], amt);
        }
        paidOut = true;
        pot = 0;
        emit PaidOut(winners, amounts);
    }
}
