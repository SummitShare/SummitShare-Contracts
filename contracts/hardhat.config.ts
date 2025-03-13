import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-verify";
dotenv.config();

const SEPOLIA_RPC_URL = process.env.ETH_RPC_URL;
const OP_RPC_URL = process.env.OP_RPC_URL;

const accounts = process.env.PRIVATE_KEYS?.split(',');

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true // Enable IR compilation to fix stack too deep errors
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts,
      chainId: 11155111, // ETH Sepolia chain ID
      gasPrice: "auto",
    },

    optimismSepolia: {
      url: OP_RPC_URL,
      accounts,
      chainId: 10, // OP SEPOLIA chain ID
      gasPrice: "auto",
    }
  },

  etherscan: {
    apiKey: {
      optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
      mainnetEthereum: process.env.ETHEREUM_API_KEY || "",
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
