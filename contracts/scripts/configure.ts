import { ethers } from "hardhat";

// Define types for our configuration
export interface RevenueConfig {
    beneficiaries: string[];
    shares: number[];
}

export interface ExhibitInfo {
    name: string;
    symbol: string;
    ticketPrice: bigint;
    baseURI: string;
    artifactNFTAddress: string;
}

// Export the revenue configuration for reuse in other scripts
export const getRevenueConfig = (): RevenueConfig => {
    const beneficiary1: string = "0xA259489699DA3296ac0211e83A5c7cB5FeB3E33f";
    const beneficiary2: string = "0x6E95E4a97efb1FaDE341Cd867F07101C7b997151";
    
    return {
        beneficiaries: [beneficiary1, beneficiary2],
        shares: [80, 20]
    };
};

async function main() {
    // Get the signers
    const [owner] = await ethers.getSigners();
    
    // Hardcoded addresses
    const museumAddress = "0xA81Febe32BaeE60556A3Cf993dF27606e2cC02F4";
    const organizerServiceAddress = "0x3f620D709b4734fcfF59733e5C384EB2424E0EAA";
    const artifactNFT1 = "0xe8EE4BADEf8A5f8629Fc9f00AA1f13F6b808511E";

    const exhibitId = "TS1";
    
    // Create ExhibitInfo struct
    const exhibitInfo: ExhibitInfo = {
        name: "Test Exhibit",
        symbol: "TS1",
        ticketPrice: ethers.parseUnits("5", 6),
        baseURI: "https://s3.tebi.io/summitshare-tickets/",
        artifactNFTAddress: artifactNFT1
    };
    
    // Get the revenue configuration
    const revenueConfig = getRevenueConfig();
    
    const location = "Virtual Space";
    const details = "Join us as we reclaim and create new history.";

    // Connect to the contracts
    const OrganizerService = await ethers.getContractFactory("EventOrganizerService");
    const Museum = await ethers.getContractFactory("Museum");
    const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
    
    const organizerService = OrganizerService.attach(organizerServiceAddress).connect(owner);
    const museum = Museum.attach(museumAddress).connect(owner);
    const artifactNFT = ArtifactNFT.attach(artifactNFT1).connect(owner);


    // Organize an exhibit with the new function signature
    console.log("Organizing exhibit...");
    const tx1 = await organizerService.organizeExhibit(
        exhibitId,
        exhibitInfo,
        revenueConfig,
        location,
        details
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
    const exhibitMuseumAddress = await museum.exhibits(exhibitId);
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
