import { ethers } from "hardhat";
import { ExhibitInfo, getRevenueConfig } from "./exhibitDetails";
import { getContractAddress } from "./exhibitDetails";
import { getExhibitInfo } from "./exhibitDetails";
import { getAddInfo } from "./exhibitDetails";

async function main() {
    // Get the signers
    const [owner] = await ethers.getSigners();
    
    // Get the revenue configuration
    const revenueConfig = getRevenueConfig();

    // Connect to the contracts
    const OrganizerService = await ethers.getContractFactory("EventOrganizerService");
    const Museum = await ethers.getContractFactory("Museum");
    const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
    
    const organizerService = OrganizerService.attach(getContractAddress.organizerServiceAddress).connect(owner);
    const museum = Museum.attach(getContractAddress.museumAddress).connect(owner);
    const artifactNFT = ArtifactNFT.attach(getContractAddress.artifactNFT1).connect(owner);


    // Organize an exhibit with the new function signature
    console.log("Organizing exhibit...");
    const tx1 = await organizerService.organizeExhibit(
        getContractAddress.exhibitId,
        getExhibitInfo,
        revenueConfig,
        getAddInfo.location,
        getAddInfo.details
    );
    
    const receipt1 = await tx1.wait(6);
    console.log("Organized Exhibit:", receipt1.status);
    
    // Get the ExhibitNFT address from the event
    let exhibitNFTAddress;
    let paymentHandlerAddress;
    
    for (const log of receipt1.logs) {
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
    
    console.log("ExhibitNFT deployed to:", exhibitNFTAddress);
    console.log("PaymentHandler deployed to:", paymentHandlerAddress);
    
    // Connect to the ExhibitNFT contract
    const ExhibitNFT = await ethers.getContractFactory("ExhibitNFT");
    const exhibitNFT = ExhibitNFT.attach(exhibitNFTAddress).connect(owner);
    
    // Connect to the PaymentHandler contract
    const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
    const paymentHandler = PaymentHandler.attach(paymentHandlerAddress).connect(owner);
    
    // Verify the exhibit is registered in the museum
    const exhibitMuseumAddress = await museum.exhibits(getContractAddress.exhibitId);
    console.log("Exhibit in Museum:", exhibitMuseumAddress);
    
    // Mint ArtifactNFTs
    console.log("Minting ArtifactNFTs...");
    const tx4 = await artifactNFT.mint(owner.address, 6);
    const receipt4 = await tx4.wait(6);
    console.log("Minted ArtifactNFT:", receipt4.status);
    
    // Get information from the PaymentHandler
    const totalShares = await paymentHandler.totalShares();
    console.log("Total shares in PaymentHandler:", totalShares.toString());
    
    // Check if ticketing is enabled
    const ticketingEnabled = await paymentHandler.onChainTicketingEnabled();
    console.log("Ticketing enabled:", ticketingEnabled);
    
    // Get the ticketing contract address
    const ticketingContract = await paymentHandler.ticketingContract();
    console.log("Ticketing contract:", ticketingContract);
    
    // // Example: Disable ticketing
    // console.log("Disabling ticketing...");
    // const tx5 = await paymentHandler.setTicketingEnabled(false, ethers.ZeroAddress);
    // const receipt5 = await tx5.wait(6);
    // console.log("Disabled ticketing:", receipt5.status);
    
    // // Verify ticketing is disabled
    // const ticketingEnabledAfter = await paymentHandler.onChainTicketingEnabled();
    // console.log("Ticketing enabled after update:", ticketingEnabledAfter);
    
    // // Example: Re-enable ticketing
    // console.log("Re-enabling ticketing...");
    // const tx6 = await paymentHandler.setTicketingEnabled(true, exhibitNFTAddress);
    // const receipt6 = await tx6.wait(6);
    // console.log("Re-enabled ticketing:", receipt6.status);
    
    // // Verify ticketing is enabled again
    // const ticketingEnabledFinal = await paymentHandler.onChainTicketingEnabled();
    // console.log("Ticketing enabled final state:", ticketingEnabledFinal);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
