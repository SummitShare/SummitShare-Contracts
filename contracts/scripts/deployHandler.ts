import { ethers, network } from "hardhat";
import { getRevenueConfig } from "./exhibitDetails";

async function main() {
  try {
    const networkName = network.name;
    console.log(`\nDeploying PaymentHandler to ${networkName}...\n`);

    // Get the signer
    const [ owner ] = await ethers.getSigners();
    console.log(`Deploying with account: ${owner.address}`);

    // Log balance
    const balance = await owner.provider.getBalance(owner.address);
    console.log(`Account balance: ${ethers.formatEther(balance)} ETH\n`);

    // Get deployment parameters
    const revenueConfig = getRevenueConfig();
    console.log("Deployment Parameters:");
    console.log(`Beneficiaries: ${revenueConfig.beneficiaries.join(", ")}`);
    console.log(`Shares: ${revenueConfig.shares.join(", ")}\n`);

    // Validate parameters
    if (revenueConfig.beneficiaries.length === 0) {
      throw new Error("No beneficiaries provided");
    }
    if (revenueConfig.beneficiaries.length !== revenueConfig.shares.length) {
      throw new Error("Beneficiaries and shares length mismatch");
    }

    // Get current nonce
    const nonce = await owner.provider.getTransactionCount(owner.address);
    console.log(`Current nonce: ${nonce}`);

    // Get contract factory
    const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
        // Deploy contract
        console.log("\nDeploying contract...");
    const paymentHandler = await PaymentHandler.deploy(revenueConfig.beneficiaries, revenueConfig.shares)

    // Wait for deployment
    console.log("Waiting for deployment confirmation...");
    const deployTx = paymentHandler.deploymentTransaction();
    if (!deployTx) throw new Error("Failed to get deployment transaction");
    
    console.log(`Transaction hash: ${deployTx.hash}`);
    
    await paymentHandler.waitForDeployment();
    const paymentHandlerAddress = await paymentHandler.getAddress();
    
    console.log("\nDeployment successful!");
    console.log(`Contract address: ${paymentHandlerAddress}`);
  
        // Print verification command
        console.log("\nTo verify on block explorer:");
        console.log(`npx hardhat verify --network ${networkName} ${paymentHandlerAddress} "${revenueConfig.beneficiaries.join('","')}" ${revenueConfig.shares.join(',')}`);

  } catch (error: any) {
    console.error("\nDeployment failed:");
    console.error(error.message);
    if (error.transaction) {
      console.error("\nTransaction details:", {
        hash: error.transaction.hash,
        from: error.transaction.from,
        nonce: error.transaction.nonce,
        gasLimit: error.transaction.gasLimit?.toString(),
        maxFeePerGas: error.transaction.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: error.transaction.maxPriorityFeePerGas?.toString()
      });
    }
    process.exit(1);
  }
}

// Execute if running directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;
