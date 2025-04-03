import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-verify";
dotenv.config();

// RPC URLs from environment variables with fallbacks
const SEPOLIA_RPC_URL = process.env.ETH_RPC_URL 
const OP_RPC_URL = process.env.OP_RPC_URL || "https://sepolia.optimism.io";
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://sepolia.base.org";
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL 
const OPTIMISM_MAINNET_RPC_URL = process.env.OPTIMISM_MAINNET_RPC_URL || "https://mainnet.optimism.io";
const BASE_MAINNET_RPC_URL = process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org";

const accounts = process.env.DEV_PRIVATE_KEYS?.split(',');

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
    },
  },
  networks: {
    // Development networks
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts,
      chainId: 11155111, // ETH Sepolia chain ID
      gasPrice: "auto",
    },
    optimismSepolia: {
      url: OP_RPC_URL,
      accounts,
      chainId: 11155420, // OP Sepolia chain ID
      gasPrice: "auto",
      timeout: 200000
    },
    baseSepolia: {
      url: BASE_RPC_URL || "https://sepolia.base.org",
      accounts,
      chainId: 84532, // Base Sepolia chain ID
      gasPrice: "auto",
      timeout: 200000
    },
    // Production networks
    mainnet: {
      url: MAINNET_RPC_URL,
      accounts,
      chainId: 1, // Ethereum Mainnet
      gasPrice: "auto",
    },
    optimism: {
      url: OPTIMISM_MAINNET_RPC_URL,
      accounts,
      chainId: 10, // Optimism Mainnet
      gasPrice: "auto",
    },
    base: {
      url: BASE_MAINNET_RPC_URL,
      accounts,
      chainId: 8453, // Base Mainnet
      gasPrice: "auto",
    }
  },

  etherscan: {
    apiKey: {
      // Testnets
      sepolia: process.env.ETHEREUM_API_KEY || "",
      optimisticSepolia: process.env.OPTIMISM_API_KEY || "",
      baseSepolia: process.env.BASE_API_KEY || "",
      
      // Mainnets
      mainnet: process.env.ETHEREUM_API_KEY || "",
      optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
      base: process.env.BASE_API_KEY || "",
    },
  },


  gasReporter: {
    currency: "USD",
    gasPrice: 100,
    rst: true,
    enabled: true,
    coinmarketcap: "603bd12e-d2f3-4a9f-8c82-d5e346d9d482",
  },

};


export default config;
