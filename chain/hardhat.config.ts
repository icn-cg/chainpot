import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import * as dotenv from 'dotenv';
dotenv.config();

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  networks: {
    amoy: {
      // Prefer Alchemy Amoy endpoint when provided — Alchemy has better mempool visibility and propagation.
      url:
        process.env.ALCHEMY_AMOY_URL ||
        process.env.RPC_URL ||
        'https://rpc-amoy.polygon.technology/',
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      // Increase timeouts for slow testnets / indexer delays
      timeout: 300000, // 5 minutes
      gasPrice: 'auto',
    },
    polygon: {
      url: process.env.ALCHEMY_POLYGON_URL || '',
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
