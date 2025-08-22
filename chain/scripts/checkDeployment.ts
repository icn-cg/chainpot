import { ethers } from 'hardhat';

async function main() {
  const txHash = '0x6067db057cbd9339126902d6fa29b6cc0e98c07713ee871e50f9a349824d76f7';
  
  console.log('🔍 Checking PoolEscrowFixed deployment...');
  console.log('Transaction:', txHash);
  console.log('Explorer: https://amoy.polygonscan.com/tx/' + txHash);
  
  try {
    const receipt = await ethers.provider.getTransactionReceipt(txHash);
    
    if (receipt) {
      if (receipt.status === 1) {
        console.log('✅ PoolEscrowFixed deployed successfully!');
        console.log('Contract address:', receipt.contractAddress);
        console.log('\nReady to deploy PoolEscrowFlexible next.');
      } else {
        console.log('❌ Transaction failed');
      }
    } else {
      console.log('⏳ Transaction still pending...');
      console.log('💡 Check the explorer link above for updates');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
