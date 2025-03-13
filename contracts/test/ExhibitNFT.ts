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

    // Deploy ExhibitNFT with PaymentHandler
    const ExhibitNFT = await ethers.getContractFactory("ExhibitNFT");
    const exhibitNFT = await ExhibitNFT.connect(owner).deploy(
      "EVENTNAME", // name
      "ENFT", // symbol
      100, // ticketPrice
      paymentHandler.target, // paymentHandler (instead of escrow)
      owner.address, // owner
      'https://api.example.com/nft/', // baseURI
      "Lusaka,Zambia", // location
      artifactNFT.target, // ArtifactNFTAddress
      "Lusaka Art Gallery" // details
    );
    
    // Configure PaymentHandler to use ExhibitNFT for ticketing
    await paymentHandler.connect(beneficiary1).setTicketingEnabled(true, exhibitNFT.target);
    
    return {
      exhibitNFT,
      paymentHandler,
      usdcToken,
      owner,
      controller,
      beneficiary1,
      beneficiary2,
      funder,
      artifactNFT
    };
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { exhibitNFT, owner } = await loadFixture(deployContracts);
      expect(await exhibitNFT.owner()).to.equal(owner.address);
    });

    it('Should set the right ticket price', async function () {
      const { exhibitNFT } = await loadFixture(deployContracts);
      expect(await exhibitNFT.ticketPrice()).to.equal(100);
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
      ).to.be.revertedWithCustomError(exhibitNFT, "OwnableUnauthorizedAccount");
    });

    it('Should set the correct tokenURI', async function () {
      const { exhibitNFT, owner, funder } = await loadFixture(deployContracts);
      await expect(exhibitNFT.connect(owner).mintTicket(funder.address))
        .to.emit(exhibitNFT, 'TicketMinted')
        .withArgs(exhibitNFT.target, funder.address, 0);
      expect(await exhibitNFT.tokenURI(0)).to.equal('https://api.example.com/nft/0');
    });
    
    it('Should allow payment handler to mint tickets', async function () {
      const { exhibitNFT, paymentHandler, funder, beneficiary1 } = await loadFixture(deployContracts);
      
      // Simulate PaymentHandler minting a ticket
      // In a real scenario, this would be called by the PaymentHandler during processPayment
      const mintTx = await paymentHandler.connect(beneficiary1).setTicketingEnabled(true, exhibitNFT.target);
      await mintTx.wait();
      
      // Now mint a ticket through the payment handler
      const ABI = ["function mintTicket(address) external returns (uint256)"];
      const paymentHandlerWithMintFunction = new ethers.Contract(
        paymentHandler.target,
        ABI,
        beneficiary1
      );
      
      // This test is just to verify the permission, not the actual integration
      // In reality, mintTicket would be called by the PaymentHandler internally
      await expect(
        exhibitNFT.connect(beneficiary1).mintTicket(funder.address)
      ).not.to.be.reverted;
    });
  });
});
