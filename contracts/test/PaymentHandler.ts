import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";

describe("PaymentHandler Contract Tests", function() {
  async function deployContracts() {
    const [
      owner,
      beneficiary1,
      beneficiary2,
      beneficiary3,
      buyer1,
      buyer2
    ] = await ethers.getSigners();

    // Deploy mock USDT token
    const MockUSDT = await ethers.getContractFactory("USDT");
    const usdtToken = await MockUSDT.connect(owner).deploy(ethers.parseUnits("1000", 6));

    // Transfer some tokens to buyers
    await usdtToken.transfer(buyer1.address, ethers.parseUnits("200", 6));
    await usdtToken.transfer(buyer2.address, ethers.parseUnits("200", 6));

    // Deploy PaymentHandler
    const beneficiaries = [beneficiary1.address, beneficiary2.address, beneficiary3.address];
    const shares = [50, 30, 20]; // 50%, 30%, 20%
    
    const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
    const paymentHandler = await PaymentHandler.connect(owner).deploy(beneficiaries, shares);

    // Deploy ArtifactNFT contract for ExhibitNFT
    const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
    const artifactNFT = await ArtifactNFT.connect(owner).deploy(
      "ArtifactNFT", 
      "ANFT", 
      owner.address, 
      "https://api.example.com/artifact/"
    );

    // Deploy ExhibitNFT
    const exhibitInfo = {
      name: "TestExhibit",
      symbol: "TEXB",
      ticketPrice: ethers.parseUnits("50", 6),
      baseURI: "https://api.example.com/exhibit/",
      artifactNFTAddress: artifactNFT.target
    };

    const ExhibitNFT = await ethers.getContractFactory("ExhibitNFT");
    const exhibitNFT = await ExhibitNFT.connect(owner).deploy(
      exhibitInfo,
      paymentHandler.target,
      owner.address,
      "Virtual Exhibition",
      "A test exhibition for contract testing"
    );

    return {
      usdtToken,
      paymentHandler,
      exhibitNFT,
      owner,
      beneficiary1,
      beneficiary2,
      beneficiary3,
      buyer1,
      buyer2,
      totalShares: 100 // 50 + 30 + 20
    };
  }

  it("should correctly deploy PaymentHandler with beneficiaries and shares", async function() {
    const { paymentHandler, beneficiary1, beneficiary2, beneficiary3, totalShares } = await loadFixture(deployContracts);
    
    expect(await paymentHandler.beneficiaries(0)).to.equal(beneficiary1.address);
    expect(await paymentHandler.beneficiaries(1)).to.equal(beneficiary2.address);
    expect(await paymentHandler.beneficiaries(2)).to.equal(beneficiary3.address);
    
    expect(await paymentHandler.shares(beneficiary1.address)).to.equal(50);
    expect(await paymentHandler.shares(beneficiary2.address)).to.equal(30);
    expect(await paymentHandler.shares(beneficiary3.address)).to.equal(20);
    
    expect(await paymentHandler.totalShares()).to.equal(totalShares);
  });

  it("should enable and disable ticketing", async function() {
    const { paymentHandler, exhibitNFT, owner } = await loadFixture(deployContracts);
    
    // Initially, ticketing should be disabled
    expect(await paymentHandler.onChainTicketingEnabled()).to.equal(false);
    
    // Enable ticketing
    await paymentHandler.connect(owner).setTicketingEnabled(true, exhibitNFT.target);
    expect(await paymentHandler.onChainTicketingEnabled()).to.equal(true);
    expect(await paymentHandler.ticketingContract()).to.equal(exhibitNFT.target);
    
    // Disable ticketing
    await paymentHandler.connect(owner).setTicketingEnabled(false, exhibitNFT.target);
    expect(await paymentHandler.onChainTicketingEnabled()).to.equal(false);
  });

  it("should revert when enabling ticketing with zero address", async function() {
    const { paymentHandler, owner } = await loadFixture(deployContracts);
    
    await expect(
      paymentHandler.connect(owner).setTicketingEnabled(true, ethers.ZeroAddress)
    ).to.be.revertedWith("Invalid ticketing contract");
  });

  it("should correctly process ticket payment and mint ticket when ticketing is enabled", async function() {
    const { 
      paymentHandler, 
      exhibitNFT, 
      usdtToken, 
      buyer1, 
      owner, 
      beneficiary1, 
      beneficiary2, 
      beneficiary3 
    } = await loadFixture(deployContracts);
    
    // Enable ticketing
    await paymentHandler.connect(owner).setTicketingEnabled(true, exhibitNFT.target);
    
    // Initial balances
    const initialBal1 = await usdtToken.balanceOf(beneficiary1.address);
    const initialBal2 = await usdtToken.balanceOf(beneficiary2.address);
    const initialBal3 = await usdtToken.balanceOf(beneficiary3.address);
    
    // Process payment
    const ticketPrice = ethers.parseUnits("50", 6);
    await usdtToken.connect(buyer1).approve(paymentHandler.target, ticketPrice);
    await paymentHandler.connect(buyer1).processPayment(usdtToken.target, ticketPrice, 1);
    
    // Check beneficiary balances
    expect(await usdtToken.balanceOf(beneficiary1.address)).to.equal(initialBal1 + (ticketPrice * BigInt(50) / BigInt(100)));
    expect(await usdtToken.balanceOf(beneficiary2.address)).to.equal(initialBal2 + (ticketPrice * BigInt(30) / BigInt(100)));
    expect(await usdtToken.balanceOf(beneficiary3.address)).to.equal(initialBal3 + (ticketPrice * BigInt(20) / BigInt(100)));
    
    // Check ticket minted
    expect(await exhibitNFT.balanceOf(buyer1.address)).to.equal(1);
  });

  it("should correctly process donation payment without minting ticket", async function() {
    const { 
      paymentHandler, 
      exhibitNFT, 
      usdtToken, 
      buyer1, 
      owner, 
      beneficiary1, 
      beneficiary2, 
      beneficiary3 
    } = await loadFixture(deployContracts);
    
    // Enable ticketing
    await paymentHandler.connect(owner).setTicketingEnabled(true, exhibitNFT.target);
    
    // Initial balances
    const initialBal1 = await usdtToken.balanceOf(beneficiary1.address);
    const initialBal2 = await usdtToken.balanceOf(beneficiary2.address);
    const initialBal3 = await usdtToken.balanceOf(beneficiary3.address);
    
    // Process donation (payment type 2)
    const donationAmount = ethers.parseUnits("100", 6);
    await usdtToken.connect(buyer1).approve(paymentHandler.target, donationAmount);
    await paymentHandler.connect(buyer1).processPayment(usdtToken.target, donationAmount, 2);
    
    // Check beneficiary balances
    expect(await usdtToken.balanceOf(beneficiary1.address)).to.equal(initialBal1 + (donationAmount * BigInt(50) / BigInt(100)));
    expect(await usdtToken.balanceOf(beneficiary2.address)).to.equal(initialBal2 + (donationAmount * BigInt(30) / BigInt(100)));
    expect(await usdtToken.balanceOf(beneficiary3.address)).to.equal(initialBal3 + (donationAmount * BigInt(20) / BigInt(100)));
    
    // Check no ticket minted for donation
    expect(await exhibitNFT.balanceOf(buyer1.address)).to.equal(0);
  });

  it("should not mint ticket when ticketing is disabled", async function() {
    const { 
      paymentHandler, 
      exhibitNFT, 
      usdtToken, 
      buyer1, 
      owner 
    } = await loadFixture(deployContracts);
    
    // Make sure ticketing is disabled
    await paymentHandler.connect(owner).setTicketingEnabled(false, exhibitNFT.target);
    
    // Process payment
    const ticketPrice = ethers.parseUnits("50", 6);
    await usdtToken.connect(buyer1).approve(paymentHandler.target, ticketPrice);
    await paymentHandler.connect(buyer1).processPayment(usdtToken.target, ticketPrice, 1);
    
    // Check no ticket minted
    expect(await exhibitNFT.balanceOf(buyer1.address)).to.equal(0);
  });

  it("should correctly direct mint a ticket from the owner", async function() {
    const { exhibitNFT, owner, buyer1 } = await loadFixture(deployContracts);
    
    // Mint ticket directly from owner
    await exhibitNFT.connect(owner).mintTicket(buyer1.address);
    
    // Check ticket minted
    expect(await exhibitNFT.balanceOf(buyer1.address)).to.equal(1);
  });

  it("should correctly direct mint a ticket from the payment handler", async function() {
    const { 
      paymentHandler, 
      exhibitNFT, 
      usdtToken, 
      buyer1, 
      owner 
    } = await loadFixture(deployContracts);
    
    // Enable ticketing
    await paymentHandler.connect(owner).setTicketingEnabled(true, exhibitNFT.target);
    
    // Process payment
    const ticketPrice = ethers.parseUnits("50", 6);
    await usdtToken.connect(buyer1).approve(paymentHandler.target, ticketPrice);
    await paymentHandler.connect(buyer1).processPayment(usdtToken.target, ticketPrice, 1);
    
    // Check ticket minted
    expect(await exhibitNFT.balanceOf(buyer1.address)).to.equal(1);
  });

  it("should revert when unauthorized account tries to mint ticket", async function() {
    const { exhibitNFT, buyer1, buyer2 } = await loadFixture(deployContracts);
    
    // Try to mint ticket from unauthorized account
    await expect(
      exhibitNFT.connect(buyer1).mintTicket(buyer2.address)
    ).to.be.revertedWith("Not authorized");
  });

  it("should emit TicketMinted event when ticket is minted", async function() {
    const { exhibitNFT, owner, buyer1 } = await loadFixture(deployContracts);
    
    // Mint ticket and check event
    await expect(exhibitNFT.connect(owner).mintTicket(buyer1.address))
      .to.emit(exhibitNFT, "TicketMinted")
      .withArgs(exhibitNFT.target, buyer1.address, 0);
  });

  it("should correctly set and get baseURI", async function() {
    const { exhibitNFT, owner } = await loadFixture(deployContracts);
    
    const newBaseURI = "https://api.example.com/newexhibit/";
    await exhibitNFT.connect(owner).setBaseURI(newBaseURI);
    
    // Mint a token to check tokenURI
    await exhibitNFT.connect(owner).mintTicket(owner.address);
    
    // Check tokenURI uses the new baseURI
    expect(await exhibitNFT.tokenURI(0)).to.equal(newBaseURI + "0");
  });

  it("should correctly handle multiple ticket purchases", async function() {
    const { 
      paymentHandler, 
      exhibitNFT, 
      usdtToken, 
      buyer1, 
      buyer2, 
      owner 
    } = await loadFixture(deployContracts);
    
    // Enable ticketing
    await paymentHandler.connect(owner).setTicketingEnabled(true, exhibitNFT.target);
    
    // Process payment for buyer1
    const ticketPrice = ethers.parseUnits("50", 6);
    await usdtToken.connect(buyer1).approve(paymentHandler.target, ticketPrice);
    await paymentHandler.connect(buyer1).processPayment(usdtToken.target, ticketPrice, 1);
    
    // Process payment for buyer2
    await usdtToken.connect(buyer2).approve(paymentHandler.target, ticketPrice);
    await paymentHandler.connect(buyer2).processPayment(usdtToken.target, ticketPrice, 1);
    
    // Check tickets minted
    expect(await exhibitNFT.balanceOf(buyer1.address)).to.equal(1);
    expect(await exhibitNFT.balanceOf(buyer2.address)).to.equal(1);
    
    // Verify token IDs
    expect(await exhibitNFT.ownerOf(0)).to.equal(buyer1.address);
    expect(await exhibitNFT.ownerOf(1)).to.equal(buyer2.address);
  });

  it("should revert when processing payment with amount 0", async function() {
    const { paymentHandler, usdtToken, buyer1 } = await loadFixture(deployContracts);
    
    await expect(
      paymentHandler.connect(buyer1).processPayment(usdtToken.target, 0, 1)
    ).to.be.revertedWith("Amount must be > 0");
  });

  it("should emit PaymentProcessed and PaymentDistributed events", async function() {
    const { 
      paymentHandler, 
      exhibitNFT, 
      usdtToken, 
      buyer1, 
      owner, 
      beneficiary1, 
      beneficiary2, 
      beneficiary3 
    } = await loadFixture(deployContracts);
    
    // Enable ticketing
    await paymentHandler.connect(owner).setTicketingEnabled(true, exhibitNFT.target);
    
    // Process payment
    const ticketPrice = ethers.parseUnits("50", 6);
    await usdtToken.connect(buyer1).approve(paymentHandler.target, ticketPrice);
    
    // Check events
    await expect(paymentHandler.connect(buyer1).processPayment(usdtToken.target, ticketPrice, 1))
      .to.emit(paymentHandler, "PaymentProcessed")
      .withArgs(buyer1.address, ticketPrice, usdtToken.target, 1)
      .to.emit(paymentHandler, "PaymentDistributed")
      .withArgs(beneficiary1.address, ticketPrice * BigInt(50) / BigInt(100), usdtToken.target, 1)
      .to.emit(paymentHandler, "PaymentDistributed")
      .withArgs(beneficiary2.address, ticketPrice * BigInt(30) / BigInt(100), usdtToken.target, 1)
      .to.emit(paymentHandler, "PaymentDistributed")
      .withArgs(beneficiary3.address, ticketPrice * BigInt(20) / BigInt(100), usdtToken.target, 1)
      .to.emit(paymentHandler, "TicketMinted")
      .withArgs(buyer1.address);
  });
});