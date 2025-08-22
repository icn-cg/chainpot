# Chainpool Technical Master Plan (Two-Year Roadmap)

Version: 1.0 • Audience: Engineering, Security, PM • File: Chainpool_Technical_Master_Plan.md

SUMMARY

- Purpose: Trust-minimized contribution pools on Polygon (USDC). Clear payout/refund rules, deterministic monthly holding fees, built-in referrals, optional access controls.
- Pillars: Non-custodial contracts, predictable billing, perpetual refunds after cancel, simple UX, auditability.

A) CANONICAL NAMING, CONCEPTS & INVARIANTS

- Organizer: Wallet that creates/configures a pool and triggers payout/cancel (aka “Host” in marketing copy).
- Contributor: Wallet that sends USDC to a pool.
- Pool: On-chain escrow instance enforcing rules for contributions, access, and disbursements.
- Modes:
  1. Fixed-Entry: Exactly one contribution per wallet, amount = entryUnit.
  2. Flexible-Amount: Any amount, multiple contributions allowed.
  3. Hybrid (Fixed-Entry + Flexible Pot): Fixed amount per wallet, unlimited contributors, no on-chain “target”.
- Refund policy (final): Perpetual claims after cancel (no expiry). Optional long-tail sweep to a Claims Registry in V2.
- Fees (final v1):
  • 0–6 months: 0.50%/mo • 7–12: 0.33%/mo • 13+: 0.25%/mo
  • Charged at pool level, not contributor-level. Not pro-rated. “Month” = 30d windows anchored to createdAt.
  • Optional short-term payout fee flag (1% for pools <30 days) exists but is OFF by default (economic lever).
- Referral policy:
  • MVP default: Organizer absorbs referral (contributors see full credited amount).
  • Accrual per contribution; paid to referrers at payout.
  • Future: Contributor-pays-on-top toggle (adds fee to transfer; off by default).
- Access & privacy:
  • Restricted pools: Merkle allowlist or organizer-signed EIP-712 voucher.
  • Privacy-lite: Hide contributor list in UI (on-chain remains public).
- Billing month: 30-day interval anchored to createdAt (n ∈ N: createdAt + n\*30d).

B) ARCHITECTURE OVERVIEW

- Contracts (Solidity):
  • PoolFactory (EIP-1167 clones; deploys Fixed/Flexible escrows)
  • PoolEscrowFixed (Fixed-Entry semantics)
  • PoolEscrowFlexible (Flexible-Amount semantics)
  • MockUSDC (dev/test only)
  • ClaimsRegistry (future; sweep & merkle-claim for unrefunded dust)
- Frontend:
  • Next.js (App Router), Tailwind, WalletConnect (Reown AppKit) + injected wallets
  • Direct reads via ethers; event scanning with chunked ranges and local cache
  • Subgraph (post-MVP) for lists, search, analytics
- Infra:
  • Networks: Polygon PoS (prod), Amoy (test)
  • RPC providers: Alchemy/Infura
  • Optional edge KV (referral click counters, vanity redirect)
  • CI/CD: lint, typecheck, test, build, deploy
- No heavy backend in MVP (blockchain is source of truth). Optional tiny service for allowlist proof serving and shortlinks.

C) MONOREPO LAYOUT (pnpm)
root/
pnpm-workspace.yaml (apps/\*, chain)
apps/web (Next.js)
next.config.ts
tailwind.config.ts
src/app/layout.tsx (WalletProvider, ConnectBar)
src/app/page.tsx (Home)
src/app/create/page.tsx (Create Pool -> Factory.create)
src/app/pool/[addr]/page.tsx (Pool detail -> PoolView)
src/app/pool/[addr]/admin/page.tsx (Organizer controls -> AdminPanel)
src/components/ConnectBar.tsx (wallet, chain guard)
src/components/ConnectionBanner.tsx (connect prompt)
src/components/PoolView.tsx (formerly PotView; reads, contribute flow)
src/components/AdminPanel.tsx (params, winners, payout, cancel)
src/lib/web3.ts (providers, chain IDs, addresses)
src/lib/abi.ts (ABIs: Factory, Escrows, ERC20)
src/lib/numeric.ts (6-dec helpers; safe mul/div, bps)
src/lib/appkit.ts (WalletConnect/Reown)
src/lib/wallet.ts (state, hooks)
chain/
contracts/PoolFactory.sol
contracts/PoolEscrowFixed.sol
contracts/PoolEscrowFlexible.sol
contracts/MockUSDC.sol
scripts/deployFactory.ts
scripts/deployMockUSDC.ts
scripts/deployExample.ts
test/ (Hardhat + Foundry tests)

Environment variables:

- NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_RPC_URL
- NEXT_PUBLIC_FACTORY_ADDR, NEXT_PUBLIC_USDC_ADDR
- NEXT_PUBLIC_SUBGRAPH_URL (optional)

D) TRUST MODEL & SECURITY POSTURE

- Non-custodial: All value flows enforced by contracts; platform fee is pulled by contract rules only.
- Minimal upgradability: Fixed implementations per version; Factory points to implementations explicitly. Avoid proxy-upgrade complexity in v1 to reduce risk.
- ERC20 behavior assumptions: USDC (6 decimals) returning bool; use OZ SafeERC20 wrappers; reset approve to 0 before increasing (where applicable).
- Reentrancy defense: ReentrancyGuard on mutating methods; CEI pattern.
- Allowlist proofs: Poseidon-compatible or Keccak Merkle (Keccak in MVP); proofs verified on-chain.
- Voucher join (future): EIP-712 typed data; organizer signature bound to pool address and wallet, optionally with nonce/expiry.
- Fee collector: Immutable feeCollector address set at deploy (Factory param), changeable only via owner (governance) on Factory to new implementation with a different collector if necessary.

E) CONTRACTS — SPECIFICATIONS (MVP)

E.1 Interfaces (psuedocode for clarity)
interface IPoolEscrow {
function token() external view returns (address);
function organizer() external view returns (address);
function endTime() external view returns (uint256);
function canceled() external view returns (bool);
function paidOut() external view returns (bool);
function createdAt() external view returns (uint64);
function monthsCharged() external view returns (uint16);
function referralBps() external view returns (uint16);
function feePolicy() external view returns (uint8); // 0=OrganizerAbsorb, 1=ContributorTopup
function payout() external;
function cancel() external;
}

E.2 PoolFactory.sol
Storage:

- address implementationFixed
- address implementationFlexible
- mapping(address => address[]) poolsByOrganizer
- address feeCollector (protocol treasury)

Enums/struct:

- enum Mode { FIXED_ENTRY, FLEXIBLE_AMOUNT }
- enum FeePolicy { ORGANIZER_ABSORB, CONTRIBUTOR_TOPUP }
- struct CreateArgs {
  address organizer;
  address token; // USDC
  Mode mode;
  uint256 entryUnit; // required if FIXED_ENTRY
  uint256 endTime; // unix > now
  bool restricted; // enable allowlist
  uint16 referralBps; // 0..1000 typical, cap 2000
  FeePolicy feePolicy; // default ORGANIZER_ABSORB
  bytes32 merkleRoot; // optional
  }

Methods:

- createPool(CreateArgs args) returns (address pool)
  • require args.endTime > block.timestamp
  • if mode==FIXED_ENTRY: require entryUnit > 0
  • clone implementation by mode
  • initialize on clone with args and feeCollector
  • poolsByOrganizer[args.organizer].push(pool)
  • emit PoolCreated(…)
- setImplementation(Mode, address) onlyOwner
- getPoolsByOrganizer(address) view returns (address[])

Events:

- PoolCreated(organizer, pool, token, mode, entryUnit, endTime, restricted, referralBps, feePolicy, merkleRoot)

E.3 PoolEscrowFixed.sol
Purpose: One join per wallet, amount = entryUnit.

Storage (key fields):

- IERC20 token
- address organizer
- uint256 entryUnit
- uint256 endTime
- bool paramsFrozen
- bool canceled
- bool paidOut
- uint64 createdAt
- uint16 monthsCharged
- uint16 referralBps
- FeePolicy feePolicy
- bytes32 merkleRoot
- address feeCollector
- mapping(address => bool) joined
- address[] contributors
- mapping(address => uint256) referralAccrued
- mapping(address => bytes32) referralCodeOf
- address[] referrersIndex (unique referrers who accrued >0) // for bounded iteration at payout
- mapping(address => bool) isIndexedReferrer

Initialize(CreateArgs args, address \_feeCollector):

- one-time init guard
- require args.endTime > now
- if FIXED: require args.entryUnit > 0
- set storage; createdAt = now

join(bytes32[] proof, address referrer, bytes32 code):

- require !canceled && !paidOut && now < endTime
- require !joined[msg.sender]
- if merkleRoot != 0x0: verify proof for msg.sender
- transferFrom(msg.sender -> this, entryUnit)
- if referrer != 0 && referralBps > 0:
  credit = entryUnit \* referralBps / 10000
  referralAccrued[referrer] += credit
  if !isIndexedReferrer[referrer]: push to referrersIndex; isIndexedReferrer[referrer] = true
  referralCodeOf[msg.sender] = code
- joined[msg.sender] = true
- contributors.push(msg.sender)
- if !paramsFrozen: paramsFrozen = true
- emit Contributed(msg.sender, entryUnit, referrer, code)

cancel() onlyOrganizer:

- require !paidOut
- canceled = true
- emit Canceled()

claimRefund():

- require canceled && joined[msg.sender] && !paidOut
- joined[msg.sender] = false
- token.safeTransfer(msg.sender, entryUnit)
- emit Refunded(msg.sender, entryUnit)

setWinners(address[] addrs, uint16[] bps) onlyOrganizer:

- require now >= endTime && !canceled && !paidOut
- require addrs.length > 0 && addrs.length == bps.length
- require sum(bps) == 10000
- store winners and winnerBps
- emit WinnersSet(addrs, bps)

payout() onlyOrganizer nonReentrant:

- require !canceled && !paidOut && now >= endTime
- require winners set
- \_chargeMonthlyIfDue()
- bal = token.balanceOf(this)
- referralTotal = \_sumReferralAccrued()
- platformFee = 0 (flagged off at launch)
- distributable = bal - referralTotal - platformFee
- transfer amounts[i] = distributable \* winnerBps[i] / 10000 to winners[i]
- \_settleReferrers() // iterate referrersIndex, pay referralAccrued > 0, zero-out
- paidOut = true
- emit PaidOut(winners, amounts, platformFee, referralTotal)

\_chargeMonthlyIfDue():

- elapsed = floor((now - createdAt) / 30d)
- while monthsCharged < elapsed:
  monthsCharged++
  rateBps = (monthsCharged <= 6) ? 50 : (monthsCharged <= 12) ? 33 : 25
  bal = token.balanceOf(this)
  fee = bal \* rateBps / 10000
  if fee > 0 && fee <= bal: token.safeTransfer(feeCollector, fee)

View helpers:

- billingStatus(): (monthsCharged, nextChargeAt, currentTier, currentTierRateBps)
- getContributors(): address[]
- referralOwed(address referrer): uint256

Events (final names):

- Contributed(address indexed contributor, uint256 amount, address indexed referrer, bytes32 referralCode)
- Refunded(address indexed contributor, uint256 amount)
- Canceled()
- WinnersSet(address[] winners, uint16[] bps)
- PaidOut(address[] winners, uint256[] amounts, uint256 platformFee, uint256 referralTotal)
- ParamsUpdated(uint256 entryUnit, uint256 endTime, bytes32 merkleRoot, uint16 referralBps, FeePolicy feePolicy)

E.4 PoolEscrowFlexible.sol
Differences vs Fixed:

- mapping(address => uint256) contributed
- contribute(uint256 amount, bytes32[] proof, address referrer, bytes32 code):
  require amount > 0; same guards as join
  transferFrom(msg.sender -> this, amount)
  contributed[msg.sender] += amount
  accrue referral on amount (same index/settlement pattern)
  emit Contributed(msg.sender, amount, referrer, code)
- claimRefund() only if canceled (refund full contributed[msg.sender], zero-out)
- Winners, payout, billing logic identical to Fixed.

E.5 ClaimsRegistry (V2 outline)

- Sweep function callable by organizer after pool is canceled and a cool-off period passes (e.g., 18 months).
- Transfers remaining balance to registry; registry exposes Merkle roots per pool to allow claimants later.
- Prevents dust from lingering across many escrows without destroying contributor rights.

F) BILLING MATH & EDGE CASES

- Deterministic month windows: for n ∈ N, window Wn = [createdAt + (n-1)*30d, createdAt + n*30d).
- Charges occur when payout() executes or a keeper triggers charge near boundary.
- Non-pro-rated: If pool balance > 0 at charge time for Wn, fee = balance \* rate(n) is applied.
- Rounding: Use integer math with bps; truncation favors the pool (fee = floor(bal \* rateBps / 10000)).
- Underbalance: If fee > balance, transfer what's available (rare; occurs only if organizer drains via refunds in canceled pools; payout path is gated).
- Large elapsed months: Loop runs per uncharged month. Worst-case gas: bounded by 24–36 iterations (Year 2 safeguard: “charge up to K months per call” pattern if necessary).
- Anti-gaming:
  • Payout always calls \_chargeMonthlyIfDue first.
  • If organizer empties before boundary, they forgo utility of that month; acceptable by policy.

G) REFERRAL ACCOUNTING DETAILS

- Accrual: credit = amount \* referralBps / 10000 per contribution.
- Storage strategy: referralAccrued[referrer] with an enumerable index (referrersIndex) to enable O(R) settlement.
- Gas bounds:
  • Typical R (unique referrers per pool) expected small (≤ 100). For larger R, we can:
  - add batched settleReferrers(offset, limit) callable pre-payout, or
  - pay referrers lazily via claimReferral() post-payout (requires escrow of referral pot).
    • MVP: settle within payout using indexed array; add batched option in V1.1 if needed.
- Contributor-pays-on-top (future): amountSent = entryUnit + referralFee; escrowed amount = entryUnit; referralFee held and paid at payout (or streamed immediately if safe).

H) FRONTEND — FLOWS & STATE

Key flows and UI

- Create Pool: type, entryUnit (if fixed), deadline, referralBps, fee policy (Organizer absorbs default), restricted toggle + allowlist upload; deploy -> success with share link/QR.
- Pool View: header with age/tier, countdown, eligibility; balances (MATIC gas, USDC, allowance); contribute card; contributors list (or privacy-lite total); share/referral components.
- Admin: pre-join edits; cancel; billing panel (monthsCharged, nextChargeAt, tier); winners set; payout with line-items; CSV export.

State, errors, and guards

- staticcall simulation before writes to surface precise revert message.
- Error copy map:
  • "ended" => “This pool has ended.”
  • "closed" => “This pool is closed.”
  • "already" => “You’ve already joined.”
  • "not allowed" => “Your wallet isn’t on the allowlist.”
  • "sum != 100%" => “Winners must sum to 100%.”
- Gas guard: If MATIC < threshold, nudge onramp/faucet.
- Accessibility: Focus order, aria labels, large tap targets, high contrast.
- I18n plan: EN at MVP; scaffold FR/ES; NG formats for Nigeria.
- Privacy-lite: Hide contributor list behind a toggle; still compute counts/totals from events.

I) SUBGRAPH (V1.1)
Schema (draft):

- Pool: id, organizer, token, mode, entryUnit (nullable), endTime, createdAt, restricted, referralBps, feePolicy, contributorsCount, totalContributed, paidOut, canceled
- Contribution: id (tx-log), pool, contributor, amount, referrer (nullable), referralCode (bytes32), timestamp
- Payout: id, pool, winners[], amounts[], referralTotal, platformFee, timestamp
- ReferralAggregate: id "pool:referrer", pool, referrer, total

Mappings:

- On PoolCreated: create Pool entity.
- On Contributed: upsert Contribution; inc contributorsCount if first-time wallet; sum totalContributed; aggregate ReferralAggregate(pool,referrer).
- On PaidOut: write payout record; mark pool paidOut true.

J) TESTING STRATEGY

Unit tests (Foundry/Hardhat):

- Fixed: join happy path; double join revert; cancel+refund; winners sum==10000; payout math; referral accrual; billing transitions across tiers; rounding edge; zero-balance charge no-op.
- Flexible: multi-contribution per wallet; refund only after cancel; payout math with variable amounts.
- Restricted: valid vs invalid proofs; empty proof when unrestricted.
- Referral: multiple referrers; no referrer; large R; settle correctness.
- Invariants: sum(outflows) ≤ inflows − unpaidFees; monthsCharged monotonic; referral payouts ≤ accrued.

Fuzz/property tests:

- Random endTimes; random contribution sizes and counts; random merkle sets.
- Boundary tests: endTime ~= now, createdAt deltas for billing, max uint16 monthsCharged.

Integration/E2E (Cypress):

- Approve->join; admin payout; cancel->refund; restricted join; countdown->eligibility; CSV export.

K) OBSERVABILITY & OPS

- Metrics: creates, joins, refunds, payouts; avg gas per action; failure rates; monthsCharged deltas; referral counts.
- Alerts: payout failure; RPC rate-limit spikes; subgraph lag.
- Runbooks:
  • Payout failing => surface revert; check winners sum; check token balance; check feeCollector address.
  • Allowlist errors => recompute proofs; verify address normalization.
  • High R referrers => pre-payout batched settlement.

L) RISK REGISTER

- Token quirks (fee-on-transfer): mitigate by targeting canonical USDC; document unsupported tokens in UI.
- Large elapsed months => long billing loops: cap months per call if needed (V1.1) or require periodic keeper.
- Referral DOS via huge unique referrers: soft cap via UI; add batched settlement in V1.1.
- Regulatory: Non-custodial posture; no fiat custody; organizer is payout recipient (or winners). Add disclosures.

M) ROADMAP WITH ACCEPTANCE CRITERIA (12-WEEK BLOCKS)

0–12 weeks (MVP)

- Factory + Escrows (Fixed/Flexible) implement & tested.
- Organizer-absorb referrals, monthly billing engine implemented.
- UI: Create, PoolView, Contribute, Admin (edit pre-join, cancel, winners, payout), billing line items.
- Amoy deploy; bug bash; audit preparation pack.

13–24 weeks (V1.1)

- Restricted pools (Merkle) UI/contract polish; proof service.
- Referral shortlink tracker (edge KV) with /r/:code redirects.
- CSV export & basic organizer analytics.
- The Graph subgraph powering lists and discovery.

25–36 weeks (V2)

- Recurring pools (“Rounds”); rotating winners schedule.
- Contributor-pays-on-top mode.
- Privacy-lite (hide contributor list).
- Notifications (EPNS/email opt-in).

37–48 weeks (V2.5)

- Mobile polish (deep links, QR flows).
- Partner API & embeds.
- Optional 1% payout fee flag for <30-day pools (default off).

Year 2

- Privacy-advanced (ZK pattern exploration).
- Fiat on/off ramps (custodial and non-custodial partners).
- Multichain (Base/Arbitrum).
- ClaimsRegistry for unrefunded dust.

N) DEV WORKFLOWS & SCRIPTS
Local:

- pnpm i; pnpm -C apps/web dev
- Hardhat: npx hardhat test; npx hardhat run scripts/deployFactory.ts --network amoy
- ENV: set chain IDs, Factory, USDC addresses in .env.local
- Seeding: deploy MockUSDC; mint to test wallets; approve+join flows.

Acceptance checklist before prod:

- All unit + fuzz + E2E green; gas within budget; audit issues resolved; feeCollector verified; envs pinned; Factory & Escrow addresses published.
