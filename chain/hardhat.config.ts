import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import * as dotenv from 'dotenv';
dotenv.config();

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  networks: {
    hardhat: {
      forking: process.env.ALCHEMY_POLYGON_URL
        ? {
            url: process.env.ALCHEMY_POLYGON_URL,
          }
        : undefined,
    },
    // Flexible local network. Set LOCAL_RPC_URL in chain/.env, e.g., http://127.0.0.1:8547
    local: {
      url: process.env.LOCAL_RPC_URL || 'http://127.0.0.1:8545',
      accounts: { mnemonic: 'test test test test test test test test test test test junk' },
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      accounts: { mnemonic: 'test test test test test test test test test test test junk' },
    },
    local8546: {
      url: 'http://127.0.0.1:8546',
      accounts: { mnemonic: 'test test test test test test test test test test test junk' },
    },
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
