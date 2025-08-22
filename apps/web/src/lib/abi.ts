// Minimal ABIs used by the UI (ethers v6)

// New Pool Factory ABI
export const poolFactoryAbi = [
  'struct CreateArgs { address organizer; address token; uint8 mode; uint256 entryUnit; uint256 endTime; bool restricted; uint16 referralBps; uint8 feePolicy; bytes32 merkleRoot }',
  'event PoolCreated(address indexed organizer, address indexed pool, address indexed token, uint8 mode, uint256 entryUnit, uint256 endTime, bool restricted, uint16 referralBps, uint8 feePolicy, bytes32 merkleRoot)',
  'function createPool((address,address,uint8,uint256,uint256,bool,uint16,uint8,bytes32) args) external returns (address pool)',
  'function getPoolsByOrganizer(address organizer) external view returns (address[] memory)',
  'function getAllPoolsCount() external view returns (uint256)',
  'function getPoolByIndex(uint256 index) external view returns (address)',
  'function implementationFixed() external view returns (address)',
  'function implementationFlexible() external view returns (address)',
  'function feeCollector() external view returns (address)',
];

// New Pool Escrow ABI
export const poolEscrowAbi = [
  'event Contributed(address indexed contributor, uint256 amount, address indexed referrer, bytes32 referralCode)',
  'event Refunded(address indexed contributor, uint256 amount)',
  'event Cancelled()',
  'event RecipientsSet(address[] recipients, uint16[] bps)',
  'event PaidOut(address[] recipients, uint256[] amounts, uint256 platformFee, uint256 referralTotal)',
  'event MonthlyFeeCharged(uint16 monthNumber, uint256 feeAmount, uint16 rateBps)',

  // Core state functions
  'function token() external view returns (address)',
  'function organizer() external view returns (address)',
  'function endTime() external view returns (uint256)',
  'function cancelled() external view returns (bool)',
  'function paidOut() external view returns (bool)',
  'function createdAt() external view returns (uint64)',
  'function monthsCharged() external view returns (uint16)',
  'function referralBps() external view returns (uint16)',
  'function feePolicy() external view returns (uint8)',

  // Pool specific functions
  'function entryUnit() external view returns (uint256)', // Fixed pools
  'function joined(address) external view returns (bool)', // Fixed pools
  'function getContribution(address) external view returns (uint256)', // Flexible pools
  'function totalContributed() external view returns (uint256)', // Flexible pools

  // Actions
  'function join(bytes32[] proof, address referrer, bytes32 code) external', // Fixed pools
  'function contribute(uint256 amount, bytes32[] proof, address referrer, bytes32 code) external', // Flexible pools
  'function cancel() external',
  'function claimRefund() external',
  'function setRecipients(address[] recipients, uint16[] bps) external',
  'function payout() external',

  // View functions
  'function billingStatus() external view returns (uint16 monthsCharged, uint256 nextChargeAt, uint8 currentTier, uint16 currentRateBps)',
  'function referralOwed(address referrer) external view returns (uint256)',
  'function getContributors() external view returns (address[] memory)',
  'function getPoolBalance() external view returns (uint256)',
];

export const erc20Abi = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function transfer(address to, uint256 value) returns (bool)',
];

// Pool mode enums
export const PoolMode = {
  FIXED_ENTRY: 0,
  FLEXIBLE_AMOUNT: 1,
  HYBRID: 2,
} as const;

export const FeePolicy = {
  ORGANIZER_ABSORB: 0,
  CONTRIBUTOR_TOPUP: 1,
} as const;
