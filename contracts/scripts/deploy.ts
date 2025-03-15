import { ethers } from "hardhat";

async function main() {
  // Retrieve signers
  const [ owner ] = await ethers.getSigners();

  // Deploying Museum contract
  const Museum = await ethers.getContractFactory("Museum");
  const museum = await Museum.connect(owner).deploy();
  await museum.deploymentTransaction().wait(2);

  // Deploy EventOrganizerService with the deployed Museum
  const EventOrganizerService = await ethers.getContractFactory("EventOrganizerService");
  const organizerService = await EventOrganizerService.deploy(museum.target);
  await organizerService.deploymentTransaction().wait(2);

  // Transfer ownership of Museum to EventOrganizerService
  console.log("Transferring Museum ownership to EventOrganizerService...");
  const transferTx = await museum.transferOwnership(organizerService.target);
  await transferTx.wait(2);
  console.log("Museum ownership transferred to EventOrganizerService");


  // Deploy ArtifactNFT
  const artifact1 = {
    name: "Exhibit v2",
    symbol: "TS1",
    owner: owner.address,
    baseURI: "https://s3.tebi.io/summitshare-uris/",
  }

  const tx0 = await organizerService.connect(owner).deployArtifactNFT(
    artifact1.name,
    artifact1.symbol,
    artifact1.owner,
    artifact1.baseURI
  );

  const receipt0 = await tx0.wait(6);
  console.log("Deployed ArtifactNFT 1", receipt0.status)

  console.log("Events from ArtifactNFT 1 deployment:");
  receipt0.logs.forEach((log, index) => {
    if ('args' in log) {
      console.log(`Event ${index}:`, log.eventName, log.args);
    }
  });

  // log addresses
  console.log("Museum deployed to:", museum.target);
  console.log("EventOrganizerService deployed to:", organizerService.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
