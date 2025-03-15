import { ethers } from "hardhat";

async function main() {

    // Get the signers
    const [owner] = await ethers.getSigners();
    // Hardcoded addresses
    const museumAddress = "0x3935e5BED378aCeD49655b3E1fA8c0e68550fbaa";
    const organizerServiceAddress = "0x662388C92915aD4be269452E7069d4AC56b07e82";
    const artifactNFT1 = "0xE3f9Cb6608fEFb78FDB2FD5496d62dc547236AAa";

    const beneficiary1 : string =  "0xc0243933ba0a7b3fffbb960c58011be37ab3a3fd" ;
    const beneficiary2 : string = "0x3B6b0Ba44Ef20324c99F5A152C2fF19a13369498";

    const exhibitInfo = {
        name: "Exhibit_v2",
        symbol:"EV2",
        ticketPrice: ethers.parseUnits("5", 6),
        artifactNFTAddress: artifactNFT1 
    };

    const revenueConfig = {
        beneficiaries: [ beneficiary1, beneficiary2],
        shares: [60, 40]
    }

    // Deploy PaymentHnadler Contract
    const PaymentHandler = await ethers.getContractFactory("PaymentHandler")
    const paymentHandler = PaymentHandler.connect(owner).deploy(revenueConfig.beneficiaries, revenueConfig.shares)

    // Connect to the contracts
    const OrganizerService = await ethers.getContractFactory("EventOrganizerService");
    const Museum = await ethers.getContractFactory("Museum");
    const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
    
    const organizerService = OrganizerService.attach(organizerServiceAddress).connect(owner);
    const museum = Museum.attach(museumAddress).connect(owner);
    const artifactNFT = ArtifactNFT.attach(artifactNFT1).connect(owner);

    // Organize an exhibit
    const tx1 = await organizerService.connect(owner).organizeExhibit( 
        "EXV2", // note: standardize IDSs
        exhibitInfo,
        revenueConfig,
        "LUN", //note: standardize location names to IATA codes
        "Exhibit Details" // note: check if there's a need for a character limit most likely to be done frontendside
        );
    const receipt1 = await tx1.wait(6);
    console.log("Organized Exhibit 1", receipt1.status)

    // need to incorporate paymentHandler as well as get its address

 
    // Read the contract state
    const exhibitNFTAddress = await organizerService.exhibits(exhibit1.id);
    console.log("ExhibitNFT 1 deployed to:", exhibitNFTAddress)

    const tx3 =  await museum.curateExhibit(exhibit1.id, exhibitNFTAddress);
    const receipt3 = await tx3.wait(6);
    console.log("Curated Exhibit 1", receipt3.status)

    // get usdcToken set on museum exhibits
    const exhibitMuseumAddress = await museum.exhibits(exhibit1.id);

    console.log("ExhibitNFT 1 deployed to:", exhibitNFTAddress)
    console.log("Exhibit1 Museum deployed to:", exhibitMuseumAddress)

    //mint artifactNFTs - exhibit 1
    const tx4 = await artifactNFT.mint(owner.address, 6);
    const receipt4 = await tx4.wait(6);
    console.log("Minted ArtifactNFT 1", receipt4.status)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });