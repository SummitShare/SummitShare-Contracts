import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("EventOrganizerService Contract Tests", function () {
  // Function to deploy and set up the necessary contracts
  async function deployContracts() {
    // Deploying Museum contract
    const [owner, controller, beneficiary1, beneficiary2, funder] = await ethers.getSigners();

    // Deploy USDC token (or another ERC20 token)
    const MockUSDC = await ethers.getContractFactory("USDT");
    const usdcToken = await MockUSDC.connect(owner).deploy(ethers.parseUnits("200", 6));

    const Museum = await ethers.getContractFactory("Museum");
    const museum = await Museum.connect(owner).deploy();

    // Deploy EventOrganizerService with the deployed Museum
    const EventOrganizerService = await ethers.getContractFactory("EventOrganizerService");
    const organizerService = await EventOrganizerService.deploy(museum.target);

    // Deploy ArtifactNFT contract (or another ERC721 token)
    const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
    const artifactNFT = await ArtifactNFT.connect(owner).deploy("ArtifactNFT", "ANFT", owner.address, "https://api.example.com/nft/");

    return {
      museum,
      usdcToken,
      organizerService,
      owner,
      controller,
      beneficiary1,
      beneficiary2,
      funder,
      artifactNFT
    };
  }

  describe("Funding", function () {
    it("Should correctly organize an exhibit and emit an event", async function () {
      const { organizerService, beneficiary1, beneficiary2, artifactNFT } = await loadFixture(deployContracts);

      // Create exhibit info struct
      const exhibitInfo = {
        name: "ExhibitName",
        symbol: "EXB",
        ticketPrice: ethers.parseUnits("10", 18),
        baseURI: "https://api.example.com/nft/",
        location: "Lusaka,Zambia",
        artifactNFTAddress: artifactNFT.target,
        details: "Lusaka Art Gallery"
      };

      // Create revenue config struct
      const revenueConfig = {
        beneficiaries: [beneficiary1.address, beneficiary2.address],
        shares: [50, 50]
      };

      await expect(
        organizerService.organizeExhibit(
          "Exhibit1",
          exhibitInfo,
          revenueConfig
        )
      )
        .to.emit(organizerService, "ExhibitNFTDeployed")
        .withArgs("Exhibit1", anyValue, anyValue, anyValue); // using anyValue for argument matching
    });

    it("Should revert if an exhibit with the same exhibitID that is already curated is organized again", async function () {
      const { organizerService, beneficiary1, beneficiary2, museum, owner, artifactNFT } = await loadFixture(deployContracts);

      // Create exhibit info struct
      const exhibitInfo = {
        name: "ExhibitName",
        symbol: "EXB",
        ticketPrice: ethers.parseUnits("10", 18),
        baseURI: "https://api.example.com/nft/",
        location: "Lusaka,Zambia",
        artifactNFTAddress: artifactNFT.target,
        details: "Lusaka Art Gallery"
      };

      // Create revenue config struct
      const revenueConfig = {
        beneficiaries: [beneficiary1.address, beneficiary2.address],
        shares: [50, 50]
      };

      await organizerService.organizeExhibit(
        "Exhibit1",
        exhibitInfo,
        revenueConfig
      );

      const exhibitNFT = await organizerService.connect(owner).exhibits("Exhibit1");
      await museum.connect(owner).curateExhibit("Exhibit1", exhibitNFT);
      
      await expect(organizerService.organizeExhibit(
        "Exhibit1",
        exhibitInfo,
        revenueConfig
      )).to.be.revertedWith("ExhibitID already taken");
    });

    it("Should correctly read state variables of the deployed ExhibitNFT and PaymentHandler contracts", async function () {
      const { organizerService, beneficiary1, beneficiary2, owner, artifactNFT } = await loadFixture(deployContracts);
      const ticketPrice = ethers.parseUnits("10", 18);

      // Create exhibit info struct
      const exhibitInfo = {
        name: "ExhibitName",
        symbol: "EXB",
        ticketPrice: ticketPrice,
        baseURI: "https://api.example.com/nft/",
        location: "Lusaka,Zambia",
        artifactNFTAddress: artifactNFT.target,
        details: "Lusaka Art Gallery"
      };

      // Create revenue config struct
      const revenueConfig = {
        beneficiaries: [beneficiary1.address, beneficiary2.address],
        shares: [50, 50]
      };

      // Triggering the event by organizing an exhibit
      await organizerService.organizeExhibit(
        "Exhibit1",
        exhibitInfo,
        revenueConfig
      );

      const exhibitNFTAddress = await organizerService.connect(owner).exhibits("Exhibit1");
      const exhibitNFT = await ethers.getContractAt("ExhibitNFT", exhibitNFTAddress);
      const paymentHandlerAddress = await exhibitNFT.paymentHandler();
      const paymentHandler = await ethers.getContractAt("PaymentHandler", paymentHandlerAddress);
      
      const address1 = await paymentHandler.beneficiaries(0);
      const address2 = await paymentHandler.beneficiaries(1);
      const share1 = await paymentHandler.shares(address1);
      const share2 = await paymentHandler.shares(address2);

      expect(share1).to.equal(50);
      expect(share2).to.equal(50);
    });

    it("Should correctly set any revenue split", async function () {
      const { organizerService, beneficiary1, beneficiary2, owner, artifactNFT } = await loadFixture(deployContracts);
      const ticketPrice = ethers.parseUnits("10", 18);

      // Create exhibit info struct
      const exhibitInfo = {
        name: "ExhibitName",
        symbol: "EXB",
        ticketPrice: ticketPrice,
        baseURI: "https://api.example.com/nft/",
        location: "Lusaka,Zambia",
        artifactNFTAddress: artifactNFT.target,
        details: "Lusaka Art Gallery"
      };

      // Create revenue config struct with uneven split
      const revenueConfig = {
        beneficiaries: [beneficiary1.address, beneficiary2.address],
        shares: [10, 9000]
      };

      // Triggering the event by organizing an exhibit
      await organizerService.organizeExhibit(
        "Exhibit1",
        exhibitInfo,
        revenueConfig
      );

      const exhibitNFTAddress = await organizerService.connect(owner).exhibits("Exhibit1");
      const exhibitNFT = await ethers.getContractAt("ExhibitNFT", exhibitNFTAddress);
      const paymentHandlerAddress = await exhibitNFT.paymentHandler();
      const paymentHandler = await ethers.getContractAt("PaymentHandler", paymentHandlerAddress);
      
      const address1 = await paymentHandler.beneficiaries(0);
      const address2 = await paymentHandler.beneficiaries(1);
      const share1 = await paymentHandler.shares(address1);
      const share2 = await paymentHandler.shares(address2);

      expect(share1).to.equal(10);
      expect(share2).to.equal(9000);
    });
  });
});
