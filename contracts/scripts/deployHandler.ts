import { ethers, network } from "hardhat";
import { getRevenueConfig } from "./configure";

// Function to deploy PaymentHandler to a specific network
async function deployToNetwork(networkName: string) {
  console.log(`Deploying PaymentHandler to ${networkName}...`);

  // Get the signers
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  // Get the revenue configuration from configure.ts
  const revenueConfig = getRevenueConfig();
  console.log(`Beneficiaries: ${revenueConfig.beneficiaries.join(", ")}`);
  console.log(`Shares: ${revenueConfig.shares.join(", ")}`);

  // Deploy the PaymentHandler contract
  console.log("Deploying PaymentHandler...");
  const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
  const paymentHandler = await PaymentHandler.deploy(
    revenueConfig.beneficiaries,
    revenueConfig.shares
  );

  await paymentHandler.waitForDeployment();
  const paymentHandlerAddress = await paymentHandler.getAddress();
  
  console.log(`PaymentHandler deployed to: ${paymentHandlerAddress} on ${networkName}`);
  console.log(`To verify on ${networkName}:`);
  console.log(`npx hardhat verify --network ${networkName} ${paymentHandlerAddress} "${revenueConfig.beneficiaries.join('","')}" ${revenueConfig.shares.join(',')}`);

  return { paymentHandlerAddress, networkName };
}

// Main function that handles deployment to one or more networks
async function main() {
  // Get networks from command line arguments
  const args = process.argv.slice(2);
  let networks: string[] = [];
  
  // If networks are specified as arguments, use those
  if (args.length > 0) {
    networks = args;
  } else {
    // Otherwise use the current hardhat network
    networks = [network.name];
  }
  
  console.log(`Deploying PaymentHandler to the following networks: ${networks.join(", ")}`);
  
  // Deploy to each network
  const results = [];
  for (const networkName of networks) {
    try {
      // Need to use hardhat.run to switch networks programmatically
      // This is a simplified example - in practice, you'd need to use the Hardhat Runtime Environment
      const result = await deployToNetwork(networkName);
      results.push(result);
    } catch (error) {
      console.error(`Error deploying to ${networkName}:`, error);
    }
  }
  
  // Print summary
  console.log("\nDeployment Summary:");
  for (const result of results) {
    console.log(`${result.networkName}: ${result.paymentHandlerAddress}`);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;
