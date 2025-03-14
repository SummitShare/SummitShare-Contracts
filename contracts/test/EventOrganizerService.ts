import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("EventOrganizerService Contract Tests", function () {
  async function deployContracts() {
    const [owner, beneficiary1, beneficiary2, user] = await ethers.getSigners();

    // Deploying the Museum contract
    const Museum = await ethers.getContractFactory("Museum");
    const museum = await Museum.deploy();

    // Deploying the EventOrganizerService contract
    const EventOrganizerService = await ethers.getContractFactory("EventOrganizerService");
    const organizerService = await EventOrganizerService.deploy(museum.target);

    // Transfer ownership of Museum to EventOrganizerService
    await museum.transferOwnership(organizerService.target);

    // Deploying the ArtifactNFT contract
    const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
    const artifactNFT = await ArtifactNFT.deploy("ArtifactNFT", "ANFT", owner.address, "https://api.example.com/nft/");

    return { 
      museum,
      organizerService,
      artifactNFT,
      owner,
      beneficiary1,
      beneficiary2,
      user
     };
  }

  it("Should deploy ArtifactNFT and emit the correct event", async function () {
    const { organizerService, owner } = await loadFixture(deployContracts);

    const tx = await organizerService.deployArtifactNFT(
      "NewArtifact",
      "NANFT",
      owner.address,
      "https://api.example.com/newnft/"
    );

    await expect(tx)
      .to.emit(organizerService, "ArtifactNFTDeployed")
      .withArgs(anyValue, "NewArtifact", "NANFT", owner.address, "https://api.example.com/newnft/");
  });

  it("Should organize a new exhibit and emit the correct event", async function () {
    const { organizerService, museum, artifactNFT, beneficiary1, beneficiary2 } = await loadFixture(deployContracts);

    const exhibitInfo = {
      name: "ExhibitName",
      symbol: "EXB",
      ticketPrice: ethers.parseEther("1"),
      baseURI: "https://api.example.com/exhibit/",
      artifactNFTAddress: artifactNFT.target
    };

    // Only include actual beneficiaries, not the organizerService
    const revenueConfig = {
      beneficiaries: [beneficiary1.address, beneficiary2.address],
      shares: [50, 50]
    };

    const location = "Lusaka, Zambia";
    const details = "Exhibit Details";

    const tx = await organizerService.organizeExhibit(
      "Exhibit1",
      exhibitInfo,
      revenueConfig,
      location,
      details
    );

    await expect(tx)
      .to.emit(organizerService, "ExhibitNFTDeployed")
      .withArgs("Exhibit1", anyValue, anyValue, museum.target);
  });

  it("Should revert when organizing an exhibit with a duplicate ID", async function () {
    const { organizerService, artifactNFT, beneficiary1, beneficiary2 } = await loadFixture(deployContracts);

    const exhibitInfo = {
      name: "ExhibitName",
      symbol: "EXB",
      ticketPrice: ethers.parseEther("1"),
      baseURI: "https://api.example.com/exhibit/",
      artifactNFTAddress: artifactNFT.target
    };

    // Only include actual beneficiaries, not the EOS
    const revenueConfig = {
      beneficiaries: [beneficiary1.address, beneficiary2.address],
      shares: [50, 50]
    };

    const location = "Lusaka, Zambia";
    const details = "Exhibit Details";

    await organizerService.organizeExhibit(
      "Exhibit1",
      exhibitInfo,
      revenueConfig,
      location,
      details
    );

    await expect(
      organizerService.organizeExhibit(
        "Exhibit1",
        exhibitInfo,
        revenueConfig,
        location,
        details
      )
    ).to.be.revertedWith("ExhibitID already taken");
  });

  it("Should correctly retrieve the ExhibitNFT address", async function () {
    const { organizerService, artifactNFT, beneficiary1, beneficiary2 } = await loadFixture(deployContracts);

    const exhibitInfo = {
      name: "ExhibitName",
      symbol: "EXB",
      ticketPrice: ethers.parseEther("1"),
      baseURI: "https://api.example.com/exhibit/",
      artifactNFTAddress: artifactNFT.target
    };

    const revenueConfig = {
      beneficiaries: [beneficiary1.address, beneficiary2.address],
      shares: [50, 50]
    };

    const location = "Lusaka, Zambia";
    const details = "Exhibit Details";

    await organizerService.organizeExhibit(
      "Exhibit1",
      exhibitInfo,
      revenueConfig,
      location,
      details
    );

    const exhibitAddress = await organizerService.getExhibitNFTAddress("Exhibit1");
    expect(exhibitAddress).to.not.equal(ethers.ZeroAddress);
  });
});
