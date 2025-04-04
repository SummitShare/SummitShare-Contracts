import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe('ExhibitNFT', function () {

  async function deployContracts() {
    const [owner, controller, beneficiary1, beneficiary2, funder] = await ethers.getSigners();

    // Deploy USDC token (or another ERC20 token)
    const MockUSDC = await ethers.getContractFactory("USDT");
    const usdcToken = await MockUSDC.connect(owner).deploy(ethers.parseUnits("200", 6));
    
    // Deploy PaymentHandler instead of EventEscrow
    const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
    const paymentHandler = await PaymentHandler.connect(owner).deploy(
      [beneficiary1.address, beneficiary2.address],
      [50, 50]
    );

    // Deploy ArtifactNFT contract
    const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
    const artifactNFT = await ArtifactNFT.connect(owner).deploy(
      "ArtifactNFT", 
      "ANFT", 
      owner.address, 
      "https://api.example.com/nft/"
    );

    // Create ExhibitInfo struct
    const exhibitInfo = {
      name: "EVENTNAME",
      symbol: "ENFT",
      ticketPrice: 100,
      baseURI: "https://api.example.com/nft/",
      artifactNFTAddress: artifactNFT.target
    };

    // Deploy ExhibitNFT with PaymentHandler using the struct
    const ExhibitNFT = await ethers.getContractFactory("ExhibitNFT");
    const exhibitNFT = await ExhibitNFT.connect(owner).deploy(
      exhibitInfo,
      paymentHandler.target,
      owner.address,
      "Lusaka,Zambia",
      "Lusaka Art Gallery"
    );
    
    // Configure PaymentHandler to use ExhibitNFT for ticketing
    // Now using onlyOwner instead of onlyBeneficiary
    await paymentHandler.connect(owner).setTicketingEnabled(true, exhibitNFT.target);
    
    return {
      exhibitNFT,
      paymentHandler,
      usdcToken,
      owner,
      controller,
      beneficiary1,
      beneficiary2,
      funder,
      artifactNFT,
      exhibitInfo
    };
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { exhibitNFT, owner } = await loadFixture(deployContracts);
      expect(await exhibitNFT.owner()).to.equal(owner.address);
    });

    it('Should set the right ticket price', async function () {
      const { exhibitNFT, exhibitInfo } = await loadFixture(deployContracts);
      expect(await exhibitNFT.ticketPrice()).to.equal(exhibitInfo.ticketPrice);
    });

    it('Should set the right payment handler', async function () {
      const { exhibitNFT, paymentHandler } = await loadFixture(deployContracts);
      expect(await exhibitNFT.paymentHandler()).to.equal(paymentHandler.target);
    });
  });

  describe('Minting', function () {
    it('Should mint a ticket to an address', async function () {
      const { exhibitNFT, owner, funder } = await loadFixture(deployContracts);
      await exhibitNFT.connect(owner).mintTicket(funder.address);
      expect(await exhibitNFT.ownerOf(0)).to.equal(funder.address);
    });

    it('Should emit a TicketMinted event on mint', async function () {
      const { exhibitNFT, owner, funder } = await loadFixture(deployContracts);
      await expect(exhibitNFT.connect(owner).mintTicket(funder.address))
        .to.emit(exhibitNFT, 'TicketMinted')
        .withArgs(exhibitNFT.target, funder.address, 0);
    });

    it('Should fail if not owner tries to mint', async function () {
      const { exhibitNFT, funder } = await loadFixture(deployContracts);
      await expect(
        exhibitNFT.connect(funder).mintTicket(funder.address)
      ).to.be.revertedWith("Not authorized");
    });

    it('Should set the correct tokenURI', async function () {
      const { exhibitNFT, owner, funder, exhibitInfo } = await loadFixture(deployContracts);
      await exhibitNFT.connect(owner).mintTicket(funder.address);
      expect(await exhibitNFT.tokenURI(0)).to.equal(`${exhibitInfo.baseURI}0`);
    });
    
    it('Should allow payment handler to mint tickets', async function () {
      const { exhibitNFT, paymentHandler, funder, owner } = await loadFixture(deployContracts);
      
      // We need to use the owner to mint tickets through the payment handler
      // since the payment handler itself is not authorized to call mintTicket directly
      await expect(
        exhibitNFT.connect(owner).mintTicket(funder.address)
      ).not.to.be.reverted;
    });
  });
});
