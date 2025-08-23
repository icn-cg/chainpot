# MetaMask Setup Reference Card

## Hardhat Local Network
**Add this network to MetaMask:**
- **Network Name**: Hardhat Local
- **RPC URL**: `http://127.0.0.1:8547`
- **Chain ID**: `31337`
- **Currency Symbol**: `ETH`
- **Block Explorer**: (leave blank)

## MockUSDC Token
**Add this token to MetaMask:**
- **Contract Address**: `0xe5bB50Cf598eC6c6D635938bF814ad25c2ea68Fb`
- **Token Symbol**: `mUSDC`
- **Token Decimals**: `6`

## Test Account (Optional)
**Import this account for 10,000 test ETH:**
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

⚠️ **Warning**: Never use this private key on mainnet!

## Key Addresses
- **PoolFactory**: `0x40ec018CDa28e11c3BfF23487dcE6102459A25B9`
- **Test Pool**: `0xABb5cd949730f4f0d00a0E2b9abDD6727632ddF9`
- **MockUSDC**: `0xe5bB50Cf598eC6c6D635938bF814ad25c2ea68Fb`

## Testing URLs
- **AdminPanel**: http://localhost:3000/pool/0xABb5cd949730f4f0d00a0E2b9abDD6727632ddF9/admin
- **Main App**: http://localhost:3000

## Pool Details
- **Entry Fee**: 100 mUSDC
- **Pool Type**: Fixed
- **Duration**: 24 hours from deployment
- **Organizer**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

## Quick Steps
1. Add Hardhat Local network to MetaMask
2. Import the test account (optional)
3. Add mUSDC token contract
4. Visit AdminPanel URL
5. Connect wallet and test the Dev Faucet
