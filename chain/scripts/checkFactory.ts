// Check factory contract state
import { ethers } from 'ethers';

const RPC_URL = 'https://rpc-amoy.polygon.technology';
const FACTORY_ADDRESS = ''; // TO BE UPDATED AFTER DEPLOYMENT

// Minimal ABI to check implementations
const FACTORY_ABI = [
  'function implementationFixed() view returns (address)',
  'function implementationFlexible() view returns (address)',
  'function implementationHybrid() view returns (address)',
  'function feeCollector() view returns (address)',
  'function owner() view returns (address)',
];

async function checkFactory() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

  try {
    console.log('Factory Address:', FACTORY_ADDRESS);
    console.log('Implementation Fixed:', await factory.implementationFixed());
    console.log('Implementation Flexible:', await factory.implementationFlexible());
    console.log('Implementation Hybrid:', await factory.implementationHybrid());
    console.log('Fee Collector:', await factory.feeCollector());
    console.log('Owner:', await factory.owner());
  } catch (error) {
    console.error('Error checking factory:', error);
  }
}

checkFactory();
