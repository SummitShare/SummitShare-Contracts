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
  
  try {
    // Step 1: Deploy the base contracts
    console.log("Deploying Museum contract...");
    const Museum = await ethers.getContractFactory("Museum");
    const museum = await Museum.connect(owner).deploy();
    await museum.waitForDeployment();
    const museumAddress = await museum.getAddress();
    console.log(`Museum deployed to: ${museumAddress}`);
    
    console.log("Deploying EventOrganizerService contract...");
    const EventOrganizerService = await ethers.getContractFactory("EventOrganizerService");
    const organizerService = await EventOrganizerService.deploy(museumAddress);
    await organizerService.waitForDeployment();
    const organizerServiceAddress = await organizerService.getAddress();
    console.log(`EventOrganizerService deployed to: ${organizerServiceAddress}`);
    
    // Transfer ownership of Museum to EventOrganizerService
    console.log("Transferring Museum ownership to EventOrganizerService...");
    const transferTx = await museum.transferOwnership(organizerServiceAddress);
    await transferTx.wait();
    console.log("Museum ownership transferred to EventOrganizerService");
    
    // Step 2: Deploy mock USDT token for testing payments
    console.log("Deploying mock USDT token...");
    const USDT = await ethers.getContractFactory("USDT");
    const usdt = await USDT.connect(owner).deploy(INITIAL_SUPPLY);
    await usdt.waitForDeployment();
    const usdtAddress = await usdt.getAddress();
    console.log(`Mock USDT deployed to: ${usdtAddress}`);
    
    // Transfer some tokens to test buyers
    console.log("Transferring USDT to test buyers...");
    const buyerAmount = ethers.parseUnits("1000", 6);
    await usdt.transfer(buyer1.address, buyerAmount);
    await usdt.transfer(buyer2.address, buyerAmount);
    console.log(`Transferred ${ethers.formatUnits(buyerAmount, 6)} USDT to each buyer`);
    
    // Transfer ETH to test buyers
    console.log("Transferring ETH to test buyers...");
    const ethAmount = ethers.parseEther("0.05");
    await owner.sendTransaction({
        to: buyer1.address,
        value: ethAmount
    });
    await owner.sendTransaction({
        to: buyer2.address,
        value: ethAmount
    });
    console.log(`Transferred ${ethers.formatEther(ethAmount)} ETH to each buyer`);
    
    // Step 3: Deploy ArtifactNFT
    console.log("Deploying ArtifactNFT...");
    const artifact = {
      name: "Test Artifact Collection",
      symbol: "TAC",
      owner: owner.address,
      baseURI: "https://s3.tebi.io/summitshare-uris/",
    };
    
    const deployArtifactTx = await organizerService.connect(owner).deployArtifactNFT(
      artifact.name,
      artifact.symbol,
      artifact.owner,
      artifact.baseURI
    );
    
    const deployArtifactReceipt = await deployArtifactTx.wait();
    console.log("ArtifactNFT deployed");
    
    // Extract ArtifactNFT address from event logs
    let artifactNFTAddress = "";
    for (const log of deployArtifactReceipt.logs) {
      try {
        const parsedLog = organizerService.interface.parseLog(log);
        if (parsedLog && parsedLog.name === "ArtifactNFTDeployed") {
          artifactNFTAddress = parsedLog.args.artifactNFTAddress;
          break;
        }
      } catch (e) {
        // Skip logs that can't be parsed
        continue;
      }
    }
    
    if (!artifactNFTAddress) {
      throw new Error("Failed to extract ArtifactNFT address from event logs");
    }
    
    console.log(`ArtifactNFT deployed to: ${artifactNFTAddress}`);
    
    // Step 4: Organize an exhibit with ticketing enabled
    console.log("Organizing exhibit...");
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
    
    const location = "Virtual Space";
    const details = "Test exhibit for deployment testing";
    
    const organizeTx = await organizerService.organizeExhibit(
      exhibitId,
      exhibitInfo,
      revenueConfig,
      location,
      details
    );
    
    const organizeReceipt = await organizeTx.wait();
    console.log("Exhibit organized");
    
    // Extract ExhibitNFT and PaymentHandler addresses from event logs
    let exhibitNFTAddress = "";
    let paymentHandlerAddress = "";
    
    for (const log of organizeReceipt.logs) {
      try {
        const parsedLog = organizerService.interface.parseLog(log);
        if (parsedLog && parsedLog.name === "ExhibitNFTDeployed") {
          exhibitNFTAddress = parsedLog.args.exhibitNFTAddress;
          paymentHandlerAddress = parsedLog.args.paymentHandlerAddress;
          break;
        }
      } catch (e) {
        // Skip logs that can't be parsed
        continue;
      }
    }
    
    if (!exhibitNFTAddress || !paymentHandlerAddress) {
      throw new Error("Failed to extract ExhibitNFT or PaymentHandler address from event logs");
    }
    
    console.log(`ExhibitNFT deployed to: ${exhibitNFTAddress}`);
    console.log(`PaymentHandler deployed to: ${paymentHandlerAddress}`);
    
    // Step 5: Connect to the deployed contracts
    const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
    const artifactNFT = ArtifactNFT.attach(artifactNFTAddress).connect(owner);
    
    const ExhibitNFT = await ethers.getContractFactory("ExhibitNFT");
    const exhibitNFT = ExhibitNFT.attach(exhibitNFTAddress).connect(owner);
    
    const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
    const paymentHandler = PaymentHandler.attach(paymentHandlerAddress).connect(owner);
    
    // Step 6: Enable ticketing
    // console.log("Enabling ticketing...");
    // const enableTicketingTx = await paymentHandler.setTicketingEnabled(true, exhibitNFTAddress);
    // await enableTicketingTx.wait();
    
    const ticketingEnabled = await paymentHandler.onChainTicketingEnabled();
    const ticketingContract = await paymentHandler.ticketingContract();
    
    console.log(`Ticketing enabled: ${ticketingEnabled}`);
    console.log(`Ticketing contract: ${ticketingContract}`);
    
    // Step 7: Mint ArtifactNFTs
    console.log("Minting ArtifactNFTs...");
    const mintTx = await artifactNFT.mint(owner.address, 5);
    await mintTx.wait();
    
    const artifactBalance = await artifactNFT.balanceOf(owner.address);
    console.log(`Minted ${artifactBalance.toString()} ArtifactNFTs to ${owner.address}`);
    
    // Step 8: Process payments and mint tickets
    console.log("Processing payments and minting tickets...");
    
    // Buyer 1 purchases a ticket
    const ticketPrice = ethers.parseUnits("5", 6);
    await usdt.connect(buyer1).approve(paymentHandlerAddress, ticketPrice);
    const payment1Tx = await paymentHandler.connect(buyer1).processPayment(usdtAddress, ticketPrice, 1);
    await payment1Tx.wait();
    
    // Buyer 2 purchases a ticket
    await usdt.connect(buyer2).approve(paymentHandlerAddress, ticketPrice);
    const payment2Tx = await paymentHandler.connect(buyer2).processPayment(usdtAddress, ticketPrice, 1);
    await payment2Tx.wait();
    
    // Check ticket balances
    const buyer1Balance = await exhibitNFT.balanceOf(buyer1.address);
    const buyer2Balance = await exhibitNFT.balanceOf(buyer2.address);
    
    console.log(`Buyer 1 (${buyer1.address}) ticket balance: ${buyer1Balance.toString()}`);
    console.log(`Buyer 2 (${buyer2.address}) ticket balance: ${buyer2Balance.toString()}`);
    
    // Step 9: Verify revenue distribution
    console.log("Verifying revenue distribution...");
    
    // Calculate expected shares
    const totalPayments = ticketPrice * BigInt(2);
    const totalShares = revenueConfig.shares.reduce((a, b) => a + b, 0);
    
    for (let i = 0; i < revenueConfig.beneficiaries.length; i++) {
      const beneficiary = revenueConfig.beneficiaries[i];
      const share = revenueConfig.shares[i];
      const expectedAmount = (totalPayments * BigInt(share)) / BigInt(totalShares);
      
      const balance = await usdt.balanceOf(beneficiary);
      console.log(`Beneficiary ${beneficiary} balance: ${ethers.formatUnits(balance, 6)} USDT`);
      console.log(`Expected amount: ${ethers.formatUnits(expectedAmount, 6)} USDT`);
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
