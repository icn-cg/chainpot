# Product Definition & Roadmap (Contribution Pools Platform)

Version: 1.0 • Audience: Product, Design, Engineering • File: Chainpool_Product_Definition_Roadmap.md

A) ONE-LINER
Chainpool lets anyone organize a pool of USDC contributions, share a link, and payout or cancel→refund by clear rules — with built-in referrals, low predictable fees, and optional access controls.

B) PERSONAS & JOBS-TO-BE-DONE

1. Organizer (primary)
   - Jobs: set clear rules, collect contributions fast, distribute fairly, avoid spreadsheets, keep trust high.
   - Constraints: low fees, simple wallet UX, transparency for group.
2. Contributor
   - Jobs: contribute safely, see status, self-refund if organizer cancels.
   - Constraints: minimal steps, gas clarity, privacy expectations.
3. Referrer/Promoter
   - Jobs: share link/code, see attribution, receive reward automatically.
4. Recipient/Winner (could be Organizer or third party)
   - Jobs: receive funds reliably with line-item transparency.

C) USER-LEVEL POOL TYPES & SEMANTICS

- Fixed-Entry
  • Organizer sets entryUnit (e.g., 50 USDC). One join per wallet at that amount.
  • Great for: split-the-bill, dues, class gifts.
- Flexible-Amount
  • Any amount, multiple contributions per wallet; great for donations/tips.
- Hybrid (Fixed-Entry + Flexible Pot)
  • Same fixed amount per person; unlimited contributors; no target cap.

Refunds

- Perpetual refund rights after Organizer cancels (no expiry).
- Fixed-Entry: refund amount = entryUnit; Flexible-Amount: refund = sum of user’s contributions.

Payouts

- After deadline, Organizer sets winners (default organizer 100%) and triggers payout.
- Fees (holding) and referral totals are deducted first; multi-winner splits by bps sum to 10000.

D) FEES, REFERRALS & EXAMPLES
Monthly Holding Fee (pool-level; non-pro-rated; anchored to creation)

- 0–6 months: 0.50%/mo
- 7–12 months: 0.33%/mo
- 13+ months: 0.25%/mo

Referral Rewards

- Default: Organizer absorbs (contributors’ credited amounts unaffected).
- Accrued per contribution; paid to referrers at payout.
- Future toggle: Contributor pays on top (adds fee to transfer).

No contribution fee at launch. No payout fee at launch (lever exists for <30-day pools; off by default).

Plain-English copy candidates (tooltips, explainer)

- “Your pool pays a small monthly maintenance fee that decreases over time.”
- “Referral rewards are paid by the organizer at payout. Your contribution is credited in full.”
- “If the organizer cancels, you can refund yourself at any time. Refunds never expire.”

Fee math examples

- Example A (Fixed, month 5, 1000 USDC balance): fee = 1000 \* 0.50% = 5.00 USDC.
- Example B (Flexible, month 9, 4200 USDC): fee = 4200 \* 0.33% = 13.86 USDC (truncated to token decimals).
- Example C (month 14, 20,000 USDC): fee = 20,000 \* 0.25% = 50.00 USDC.

E) CORE FLOWS (END-TO-END)

Create Pool

1. Choose type (Fixed / Flexible / Hybrid)
2. Set entryUnit (if fixed), deadline, referral %, access (restricted on/off; upload allowlist), fee policy (Organizer absorbs default)
3. Deploy → success screen with share link, QR, short code

Contribute

1. Connect wallet
2. Approve USDC (if needed)
3. Join/Contribute (attach referral code if any; auto-filled via link)
4. Confirmation; pot updates

Manage (Organizer)

- Before first join: edit entryUnit, endTime, referralBps, access, fee policy
- During: cancel; monitor “next charge” panel; view accrued referrals
- After deadline: set winners; payout; view line-items (fees, referral, optional payout fee flag); export CSV

Refund

- If canceled: “Refund available” appears for each contributor; one click→funds back

F) UX DETAILS & COPY HOOKS

- Headers: “Payout eligible on [date/time]”; “Pool age: Month N (Tier 0.50%/0.33%/0.25%)”
- Contribute card:
  • Fixed: “Join with X USDC” (Approve → Join)
  • Flexible: “Enter amount” (Approve → Contribute)
- Access:
  • Restricted badge: “Invite-only — your wallet must be pre-approved.”
  • Privacy-lite: “Organizer hides participant list. Totals remain public.”
- Errors (friendly):
  • Already joined; Not allowlisted; Pool ended; Winner sum must equal 100%.

G) ANALYTICS & SUCCESS METRICS
Activation

- % of pool pages with ≥3 contributors within 72h (target 60% by month 3)
  Growth
- K-factor (avg new contributors per contributor) target ≥ 1.2 by month 3
  Retention
- Organizer repeat rate within 30d (target ≥ 35% by month 6)
  Recurring Adoption
- % of pools marked recurring (target ≥ 25% by month 9)
  Ops
- Median refund time after cancel (< 48h)
  Revenue
- Fee yield per age cohort; ARPP (avg revenue per pool by cohort)

H) RECURRING (“ROUNDS”) DESIGN (V2)

- Round lifecycle:
  Open → accept contributions → deadline → payout → auto-open next round (config copied; contributors reset; organizer persists).
- Fee tier continues across rounds for the same recurring pool ID (reward longevity).
- Optional rotating winners (predefined schedule).
- Notifications: “Round opens in 24h”, “Last day to contribute”, etc.

I) PRIVACY, ACCESS & COMMS

- Privacy-lite hides contributor list in app; explain on-chain transparency clearly.
- Restricted pools via Merkle allowlist or organizer vouchers (EIP-712).
- User education:
  • “USDC is dollar-backed and widely used; your funds sit in a public escrow with rules.”
  • “You always keep control: if the organizer cancels, you can self-refund.”

J) ROADMAP (12-WEEK BLOCKS) WITH EXIT CRITERIA
0–12 (MVP)

- Contracts: Factory, Fixed, Flexible; referral accrual; billing engine
- Web app: Create, Pool, Contribute, Admin (cancel, winners, payout), billing line-items
- Amoy testnet launch; QA and audit prep
  Exit: Full happy-path flows, 90% test coverage on contracts, basic docs & risk disclosures

13–24 (V1.1)

- Subgraph lists/discovery; organizer analytics; CSV exports
- Referral shortlink service (/r/:code) and click counts
  Exit: Discovery pages powered by subgraph; CSV accessible; click analytics visible to organizer

25–36 (V2)

- Recurring rounds; rotating winners template
- Privacy-lite; Contributor-pays-on-top toggle
  Exit: End-to-end recurring flow; hide list option; contributor-pays tested and gated

37–48 (V2.5)

- Mobile polish; deep links & QR
- Partner embeds/API
- Optional payout fee lever for <30-day pools (off by default)
  Exit: Mobile UX parity; partner demo integration; feature-flag infra

Year 2

- ZK privacy exploration; Fiat on/off ramps; Multichain; ClaimsRegistry

K) CONTENT & PLAYBOOKS

- Templates: Trips, Weddings, Class Gift, Team Dues, Small NGO Drive
- Sharing: QR posters, “Invite friends” snippets, post-payout “Thank You” share
- FAQ: “Do I lose money if pool cancels?” (No; you can refund anytime after cancel). “Why a monthly fee?” (to keep it sustainable; it decreases over time).

L) INSTRUMENTATION PLAN

- Client events: view_create, create_submit, contribute_approve, contribute_submit, admin_cancel, admin_set_winners, admin_payout, refund_click, refund_success
- Serverless logs (if used): shortlink redirect hits; allowlist proof fetches
- On-chain: events mirrored in analytics (subgraph V1.1)

M) DEPENDENCIES, RISKS, MITIGATIONS

- Wallet UX complexity → WalletConnect fallback + copy
- Referral spam (huge referrer set) → cap in UI, batched settlement V1.1
- Regulatory ambiguity → non-custodial; no fiat custody; clear disclosures; partner for ramps later

N) ACCEPTANCE CHECKLIST (MVP SHIP)

- Fixed/Flexible flows green; refunds after cancel; winners/payout; billing on payout
- Clear fee/referral explanations; error messages mapped; QA on Amoy
- Docs: organizer quickstart; fees explainer; risk disclosure

END OF FILE
