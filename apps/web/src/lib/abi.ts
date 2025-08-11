// Minimal ABIs used by the UI (ethers v6)
export const factoryAbi = [
    "event LeagueCreated(address indexed owner, address indexed league)",
    "function createLeague(address owner, address token, uint256 entryFee, uint256 leagueEndTime) external returns (address)",
    "function leaguesOf(address owner) external view returns (address[])",
  ];
  
  export const escrowAbi = [
    "event Joined(address indexed account, uint256 amount)",
    "event PaidOut(address indexed to, uint256 amount)",
    "event Refunded(address indexed to, uint256 amount)",
    "function token() view returns (address)",
    "function entryFee() view returns (uint256)",
    "function leagueEndTime() view returns (uint256)",
    "function paramsFrozen() view returns (bool)",
    "function owner() view returns (address)",
    "function getPotBalance() view returns (uint256)",
    "function joined(address) view returns (bool)",
    "function updateEntryFee(uint256 newFee) external",
    "function updateLeagueEndTime(uint256 newEnd) external",
    "function joinLeague() external",
    // winners are set as arrays (addresses, bps)
    "function setWinners(address[] winners, uint256[] bps) external",
    "function payout() external",
    "function cancelLeague() external",
    "function claimRefund() external"
  ];
  
  export const erc20Abi = [
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function transfer(address to, uint256 value) returns (bool)"
  ];
  