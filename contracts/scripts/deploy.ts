// Import ethers from Hardhat, not necessary to import it separately
const { ethers } = require("hardhat");

async function main() {
  // Retrieve signers
  const [ owner ] = await ethers.getSigners();

  const usdtTokenAddress = "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"

  // Deploying Museum contract
  const Museum = await ethers.getContractFactory("Museum");
  const museum = await Museum.connect(owner).deploy(usdtTokenAddress);
  await museum.deploymentTransaction().wait(2);

  // Deploy EventOrganizerService with the deployed Museum and USDC token addresses
  const EventOrganizerService = await ethers.getContractFactory("EventOrganizerService");
  const organizerService = await EventOrganizerService.deploy(museum.target, usdtTokenAddress);
  await organizerService.deploymentTransaction().wait(2);


  // Deploy ArtifactNFT
  const artifact1 = {
    name: "The Leading Ladies of Zambia",
    symbol: "LLE",
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
  receipt0.logs.forEach((log: { eventName: any; args: any; }, index: any) => {
    console.log(`Event ${index}:`, log.eventName, log.args);
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