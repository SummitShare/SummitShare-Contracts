import { ethers, network } from "hardhat";
import { getRevenueConfig } from "./exhibitDetails";

// Mock USDT token initial supply
const INITIAL_SUPPLY = ethers.parseUnits("1000000", 6);

// Function to deploy and test the contracts on a specific network
async function deployAndTest(networkName: string) {
  console.log(`\n=== Starting deployment and testing on ${networkName} ===\n`);
  
  // Get signers
  const [owner, buyer1, buyer2] = await ethers.getSigners();
  console.log(`Deploying with account: ${owner.address}`);
  
  // Check deployer balance
  const balance = await owner.provider.getBalance(owner.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);
  if (balance < ethers.parseEther("0.1")) {
    throw new Error("Insufficient deployer balance - needs at least 0.1 ETH");
  }
  
  try {
    // Step 1: Deploy the base contracts
    console.log("\nStep 1: Deploying base contracts");
    
    let museum;
    let museumAddress;
    try {
      console.log("Deploying Museum contract...");
      const Museum = await ethers.getContractFactory("Museum");
      museum = await Museum.connect(owner).deploy();
      await museum.waitForDeployment();
      await museum.deploymentTransaction()?.wait(4);
      museumAddress = await museum.getAddress();
      console.log(`Museum deployed to: ${museumAddress}`);
    } catch (error: any) {
      console.error("Failed to deploy Museum:", error.message);
      if (error.transaction) {
        console.error("Transaction:", error.transaction);
      }
      throw error;
    }
    
    let organizerService;
    let organizerServiceAddress;
    try {
      console.log("\nDeploying EventOrganizerService contract...");
      const EventOrganizerService = await ethers.getContractFactory("EventOrganizerService");
      organizerService = await EventOrganizerService.deploy(museumAddress);
      await organizerService.waitForDeployment();
      await organizerService.deploymentTransaction()?.wait(4);
      organizerServiceAddress = await organizerService.getAddress();
      console.log(`EventOrganizerService deployed to: ${organizerServiceAddress}`);
    } catch (error: any) {
      console.error("Failed to deploy EventOrganizerService:", error.message);
      if (error.transaction) {
        console.error("Transaction:", error.transaction);
      }
      throw error;
    }
    
    try {
      console.log("\nTransferring Museum ownership to EventOrganizerService...");
      const transferTx = await museum.transferOwnership(organizerServiceAddress);
      await transferTx.wait(4);
      console.log("Museum ownership transferred to EventOrganizerService");
    } catch (error: any) {
      console.error("Failed to transfer Museum ownership:", error.message);
      if (error.transaction) {
        console.error("Transaction:", error.transaction);
      }
      throw error;
    }
    
    // Step 2: Deploy mock USDT token for testing payments
    console.log("\nStep 2: Setting up test tokens");
    
    let usdt;
    let usdtAddress;
    try {
      console.log("Deploying mock USDT token...");
      const USDT = await ethers.getContractFactory("USDT");
      usdt = await USDT.connect(owner).deploy(INITIAL_SUPPLY);
      await usdt.waitForDeployment();
      await usdt.deploymentTransaction()?.wait(4);
      usdtAddress = await usdt.getAddress();
      console.log(`Mock USDT deployed to: ${usdtAddress}`);
    } catch (error: any) {
      console.error("Failed to deploy USDT:", error.message);
      if (error.transaction) {
        console.error("Transaction:", error.transaction);
      }
      throw error;
    }
    
    // Transfer tokens to test buyers
    try {
      console.log("\nTransferring USDT to test buyers...");
      const buyerAmount = ethers.parseUnits("1000", 6);
      const tx1 = await usdt.transfer(buyer1.address, buyerAmount);
      await tx1.wait(4);
      const tx2 = await usdt.transfer(buyer2.address, buyerAmount);
      await tx2.wait(4);
      console.log(`Transferred ${ethers.formatUnits(buyerAmount, 6)} USDT to each buyer`);
      
      // Verify USDT balances
      const buyer1USDTBalance = await usdt.balanceOf(buyer1.address);
      const buyer2USDTBalance = await usdt.balanceOf(buyer2.address);
      console.log(`Buyer 1 USDT balance: ${ethers.formatUnits(buyer1USDTBalance, 6)}`);
      console.log(`Buyer 2 USDT balance: ${ethers.formatUnits(buyer2USDTBalance, 6)}`);
      
      console.log("\nTransferring ETH to test buyers...");
      const ethAmount = ethers.parseEther("0.05");
      const tx3 = await owner.sendTransaction({
          to: buyer1.address,
          value: ethAmount
      });
      await tx3.wait(4);
      const tx4 = await owner.sendTransaction({
          to: buyer2.address,
          value: ethAmount
      });
      await tx4.wait(4);
      console.log(`Transferred ${ethers.formatEther(ethAmount)} ETH to each buyer`);
      
      // Verify ETH balances
      const buyer1ETHBalance = await buyer1.provider.getBalance(buyer1.address);
      const buyer2ETHBalance = await buyer2.provider.getBalance(buyer2.address);
      console.log(`Buyer 1 ETH balance: ${ethers.formatEther(buyer1ETHBalance)}`);
      console.log(`Buyer 2 ETH balance: ${ethers.formatEther(buyer2ETHBalance)}`);
    } catch (error: any) {
      console.error("Failed to transfer tokens to buyers:", error.message);
      if (error.transaction) {
        console.error("Transaction:", error.transaction);
      }
      throw error;
    }
    
    // Step 3: Deploy ArtifactNFT
    console.log("\nStep 3: Deploying ArtifactNFT");
    
    let artifactNFTAddress = "";
    try {
      const artifact = {
        name: "Test Artifact Collection",
        symbol: "TAC",
        owner: owner.address,
        baseURI: "https://s3.tebi.io/summitshare-uris/",
      };
      
      console.log("Deploying ArtifactNFT with params:", artifact);
      const deployArtifactTx = await organizerService.connect(owner).deployArtifactNFT(
        artifact.name,
        artifact.symbol,
        artifact.owner,
        artifact.baseURI
      );
      
      const deployArtifactReceipt = await deployArtifactTx.wait(6);
      console.log("ArtifactNFT deployment transaction confirmed");
    
      // Extract ArtifactNFT address from event logs
      for (const log of deployArtifactReceipt.logs) {
        try {
          const parsedLog = organizerService.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "ArtifactNFTDeployed") {
            artifactNFTAddress = parsedLog.args.artifactNFTAddress;
            break;
          }
        } catch (e) {
          console.log("Skipping unparseable log:", e.message);
          continue;
        }
      }
      
      if (!artifactNFTAddress) {
        throw new Error("Failed to extract ArtifactNFT address from event logs");
      }
      
      console.log(`ArtifactNFT deployed to: ${artifactNFTAddress}`);
    } catch (error: any) {
      console.error("Failed to deploy ArtifactNFT:", error.message);
      if (error.transaction) {
        console.error("Transaction:", error.transaction);
      }
      throw error;
    }
    
    // Step 4: Organize an exhibit with ticketing enabled
    console.log("\nStep 4: Organizing exhibit");
    
    let exhibitNFTAddress = "";
    let paymentHandlerAddress = "";
    
    try {
      // Use a timestamp-based exhibit ID with random suffix to ensure uniqueness
      const timestamp = Math.floor(Date.now() / 1000);
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const exhibitId = `TEST${timestamp}${randomSuffix}`;
      console.log(`Using exhibit ID: ${exhibitId}`);
      
      // Create ExhibitInfo struct
      const exhibitInfo = {
        name: `Test Exhibit ${timestamp}`,
        symbol: `TE${timestamp}`,
        ticketPrice: ethers.parseUnits("5", 6),
        baseURI: "https://s3.tebi.io/summitshare-tickets/",
        artifactNFTAddress: artifactNFTAddress
      };
      
      // Get the revenue configuration
      const revenueConfig = getRevenueConfig();
      console.log(`Using revenue config with beneficiaries: ${revenueConfig.beneficiaries.join(", ")}`);
      console.log(`Shares: ${revenueConfig.shares.join(", ")}`);
      
      // Verify beneficiary addresses
      for (const beneficiary of revenueConfig.beneficiaries) {
        if (!ethers.isAddress(beneficiary)) {
          throw new Error(`Invalid beneficiary address: ${beneficiary}`);
        }
      }
      
      const location = "Virtual Space";
      const details = "Test exhibit for deployment testing";
      
      console.log("\nCalling organizeExhibit...");
      const organizeTx = await organizerService.organizeExhibit(
        exhibitId,
        exhibitInfo,
        revenueConfig,
        location,
        details
      );
      
      console.log("Waiting for organizeExhibit transaction confirmation...");
      const organizeReceipt = await organizeTx.wait(6);
      console.log("Exhibit organization transaction confirmed");
    
      // Extract ExhibitNFT and PaymentHandler addresses from event logs
      for (const log of organizeReceipt.logs) {
        try {
          const parsedLog = organizerService.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "ExhibitNFTDeployed") {
            exhibitNFTAddress = parsedLog.args.exhibitNFTAddress;
            paymentHandlerAddress = parsedLog.args.paymentHandlerAddress;
            break;
          }
        } catch (e) {
          console.log("Skipping unparseable log:", e.message);
          continue;
        }
      }
      
      if (!exhibitNFTAddress || !paymentHandlerAddress) {
        throw new Error("Failed to extract ExhibitNFT or PaymentHandler address from event logs");
      }
      
      console.log(`ExhibitNFT deployed to: ${exhibitNFTAddress}`);
      console.log(`PaymentHandler deployed to: ${paymentHandlerAddress}`);
    } catch (error: any) {
      console.error("Failed to organize exhibit:", error.message);
      if (error.transaction) {
        console.error("Transaction:", error.transaction);
      }
      throw error;
    }
    
    // Step 5: Connect to the deployed contracts and verify configuration
    console.log("\nStep 5: Verifying contract configuration");
    
    try {
      const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
      const artifactNFT = (await ArtifactNFT.attach(artifactNFTAddress).connect(owner)) as any;
      
      const ExhibitNFT = await ethers.getContractFactory("ExhibitNFT");
      const exhibitNFT = (await ExhibitNFT.attach(exhibitNFTAddress).connect(owner)) as any;
      
      const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
      const paymentHandler = (await PaymentHandler.attach(paymentHandlerAddress).connect(owner)) as any;
      
      const ticketingEnabled = await paymentHandler.onChainTicketingEnabled();
      const ticketingContract = await paymentHandler.ticketingContract();
      
      console.log(`Ticketing enabled: ${ticketingEnabled}`);
      console.log(`Ticketing contract: ${ticketingContract}`);
      
      // Step 6: Mint ArtifactNFTs
      console.log("\nStep 6: Minting ArtifactNFTs");
      const mintTx = await artifactNFT.mint(owner.address, 5);
      await mintTx.wait(4);
      
      const artifactBalance = await artifactNFT.balanceOf(owner.address);
      console.log(`Minted ${artifactBalance.toString()} ArtifactNFTs to ${owner.address}`);
      
      // Step 7: Process payments and mint tickets
      console.log("\nStep 7: Processing payments and minting tickets");
      
      // Add 50% buffer to approval amount
      const ticketPrice = ethers.parseUnits("5", 6);
      const approvalAmount = (ticketPrice * BigInt(150)) / BigInt(100); // 150% of ticket price
      console.log(`Ticket price: ${ethers.formatUnits(ticketPrice, 6)} USDT`);
      console.log(`Approval amount with buffer: ${ethers.formatUnits(approvalAmount, 6)} USDT`);
      
      // Buyer 1 purchases a ticket
      console.log("\nBuyer 1 purchasing ticket...");
      const approve1Tx = await usdt.connect(buyer1).approve(paymentHandlerAddress, approvalAmount);
      await approve1Tx.wait(4);
      console.log("Buyer 1 approval confirmed");
      
      const payment1Tx = await paymentHandler.connect(buyer1).processPayment(usdtAddress, ticketPrice, 1);
      await payment1Tx.wait(4);
      console.log("Buyer 1 payment processed");
      
      // Buyer 2 purchases a ticket
      console.log("\nBuyer 2 purchasing ticket...");
      const approve2Tx = await usdt.connect(buyer2).approve(paymentHandlerAddress, approvalAmount);
      await approve2Tx.wait(4);
      console.log("Buyer 2 approval confirmed");
      
      const payment2Tx = await paymentHandler.connect(buyer2).processPayment(usdtAddress, ticketPrice, 1);
      await payment2Tx.wait(4);
      console.log("Buyer 2 payment processed");
      
      // Check ticket balances
      const buyer1Balance = await exhibitNFT.balanceOf(buyer1.address);
      const buyer2Balance = await exhibitNFT.balanceOf(buyer2.address);
      
      console.log(`\nBuyer 1 (${buyer1.address}) ticket balance: ${buyer1Balance.toString()}`);
      console.log(`Buyer 2 (${buyer2.address}) ticket balance: ${buyer2Balance.toString()}`);
      
      // Step 8: Verify revenue distribution
      console.log("\nStep 8: Verifying revenue distribution");
      
      // Get revenue config and calculate shares
      const revenueConfig = getRevenueConfig();
      const totalPayments = ticketPrice * BigInt(2);
      const totalShares = revenueConfig.shares.reduce((a, b) => a + b, 0);
      
      console.log(`Total payments: ${ethers.formatUnits(totalPayments, 6)} USDT`);
      console.log(`Total shares: ${totalShares}`);
      
      for (let i = 0; i < revenueConfig.beneficiaries.length; i++) {
        const beneficiary = revenueConfig.beneficiaries[i];
        const share = revenueConfig.shares[i];
        const expectedAmount = (totalPayments * BigInt(share)) / BigInt(totalShares);
        
        const balance = await usdt.balanceOf(beneficiary);
        console.log(`\nBeneficiary ${beneficiary}:`);
        console.log(`  Share: ${share}/${totalShares} (${(share/totalShares*100).toFixed(2)}%)`);
        console.log(`  Expected amount: ${ethers.formatUnits(expectedAmount, 6)} USDT`);
        console.log(`  Actual balance: ${ethers.formatUnits(balance, 6)} USDT`);
      }
    } catch (error: any) {
      console.error("Failed during contract verification and testing:", error.message);
      if (error.transaction) {
        console.error("Transaction:", error.transaction);
      }
      throw error;
    }
    
    console.log(`\n=== Deployment and testing on ${networkName} completed successfully ===\n`);
    return true;
  } catch (error) {
    console.error(`Error during deployment and testing on ${networkName}:`, error);
    return false;
  }
}

// Main function to run the deployment and testing on multiple networks
async function main() {
  // Get the current network
  const currentNetwork = network.name;
  console.log(`Current network: ${currentNetwork}`);
  
  // Define the networks to test
  const networks = process.argv.slice(2);
  
  // If no networks are specified, use the current network
  if (networks.length === 0) {
    console.log(`No networks specified, using current network: ${currentNetwork}`);
    await deployAndTest(currentNetwork);
    return;
  }
  
  console.log(`Testing deployment on networks: ${networks.join(", ")}`);
  
  // Deploy and test on each network
  for (const networkName of networks) {
    console.log(`\nSwitching to network: ${networkName}`);
    
    try {
      // Note: In a real scenario, we would need to use the Hardhat Runtime Environment (HRE)
      // to programmatically switch networks. For this script, we'll assume it's run with
      // the --network flag for each network separately.
      
      // For demonstration purposes, we'll just check if we're on the right network
      if (currentNetwork !== networkName) {
        console.log(`Currently on ${currentNetwork}, but want to test on ${networkName}.`);
        console.log(`Please run this script with: npx hardhat run --network ${networkName} scripts/test-deployment.ts`);
        continue;
      }
      
      await deployAndTest(networkName);
    } catch (error) {
      console.error(`Error testing on ${networkName}:`, error);
    }
  }
}

// Execute the script
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;
