import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";

describe("Museum Contract Tests", function() {
  async function deployContracts() {
    const [
      owner,
      controller,
      beneficiary1,
      beneficiary2,
      funder,
      buyer
    ] = await ethers.getSigners();

    // Deploy USDT token
    const MockUSDT = await ethers.getContractFactory("USDT");
    const usdtToken = await MockUSDT.connect(buyer).deploy(ethers.parseUnits("200", 6));

    // Deploy Museum contract
    const Museum = await ethers.getContractFactory("Museum");
    const museum = await Museum.connect(owner).deploy();

    // Deploy ArtifactNFT contract
    const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
    const artifactNFT = await ArtifactNFT.connect(owner).deploy(
      "ArtifactNFT", 
      "ANFT", 
      owner.address, 
      "https://api.example.com/nft/"
    );
 
    // Deploy EventOrganizerService with the deployed Museum
    const EventOrganizerService = await ethers.getContractFactory("EventOrganizerService");
    const organizerService = await EventOrganizerService.deploy(museum.target);

    // Transfer ownership of Museum to EventOrganizerService
    await museum.transferOwnership(organizerService.target);

    // Create exhibit info struct for Exhibit1
    const exhibitInfo1 = {
      name: "ExhibitName",
      symbol: "EXB",
      ticketPrice: ethers.parseUnits("50", 6),
      baseURI: "https://api.example.com/nft/",
      artifactNFTAddress: artifactNFT.target
    };

    // Create revenue config struct for Exhibit1
    const revenueConfig1 = {
      beneficiaries: [beneficiary1.address, beneficiary2.address],
      shares: [50, 50]
    };

    // Create exhibit info struct for Exhibit2
    const exhibitInfo2 = {
      name: "ExhibitName2",
      symbol: "EX2",
      ticketPrice: ethers.parseUnits("50", 6),
      baseURI: "https://api.example.com/nft/",
      artifactNFTAddress: artifactNFT.target
    };

    // Create revenue config struct for Exhibit2
    const revenueConfig2 = {
      beneficiaries: [beneficiary1.address, beneficiary2.address, funder.address],
      shares: [33, 33, 34]
    };

    const location1 = "Lusaka,Zambia";
    const details1 = "Lusaka Art Gallery";
    
    const location2 = "New York,USA";
    const details2 = "Lusaka Art Gallery2";

    // Organize exhibits
    await organizerService.connect(owner).organizeExhibit(
      "Exhibit1",
      exhibitInfo1,
      revenueConfig1,
      location1,
      details1
    );

    await organizerService.connect(owner).organizeExhibit(
      "Exhibit2",
      exhibitInfo2,
      revenueConfig2,
      location2,
      details2
    );

    const exhibit1NFTAddress = await organizerService.getExhibitNFTAddress("Exhibit1");
    const exhibit2NFTAddress = await organizerService.getExhibitNFTAddress("Exhibit2");

    return {
      museum,
      organizerService,
      beneficiary1,
      beneficiary2,
      exhibit1NFTAddress,
      exhibit2NFTAddress,
      owner,
      buyer,
      usdtToken,
      funder
    };
  }

  it("should correctly deploy a mock erc20 token", async function() {
    const { owner } = await loadFixture(deployContracts);

    const MockUSDT = await ethers.getContractFactory("USDT");
    const usdtToken = await MockUSDT.connect(owner).deploy(ethers.parseUnits("200", 6));
    
    // Define the ERC20 interface for type checking
    const erc20Interface = new ethers.Interface([
      "function symbol() view returns (string)",
      "function name() view returns (string)",
      "function decimals() view returns (uint8)",
      "function balanceOf(address) view returns (uint256)"
    ]);
    
    const typedToken = new ethers.Contract(usdtToken.target, erc20Interface, owner);
    
    // Updated expectations to match the actual token
    expect(await typedToken.symbol()).to.equal("USDT");
    expect(await typedToken.name()).to.equal("USDT");
    expect(await typedToken.decimals()).to.equal(18);
    expect(await typedToken.balanceOf(owner.address)).to.equal(ethers.parseUnits("200", 6));
  });

  it("should correctly curate an exhibit through the EventOrganizerService", async function() {
    const { museum, organizerService, owner, exhibit2NFTAddress } = await loadFixture(deployContracts);

    // Create a new exhibit via EventOrganizerService
    // We need to create a new exhibit info and revenue config
    const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
    const artifactNFT = await ArtifactNFT.connect(owner).deploy(
      "NewArtifact", 
      "NART", 
      owner.address, 
      "https://api.example.com/nft/"
    );

    const [beneficiary1, beneficiary2] = await ethers.getSigners();
    
    const newExhibitInfo = {
      name: "NewExhibit",
      symbol: "NEW",
      ticketPrice: ethers.parseUnits("60", 6),
      baseURI: "https://api.example.com/nft/",
      artifactNFTAddress: artifactNFT.target
    };

    const newRevenueConfig = {
      beneficiaries: [beneficiary1.address, beneficiary2.address],
      shares: [50, 50]
    };

    await organizerService.connect(owner).organizeExhibit(
      "EastWing",
      newExhibitInfo,
      newRevenueConfig,
      "Berlin,Germany",
      "Berlin Art Gallery"
    );

    // Get the new exhibit NFT address
    const newExhibitNFTAddress = await organizerService.getExhibitNFTAddress("EastWing");
    
    // Verify the exhibit was properly curated in the museum
    expect(await museum.exhibits("EastWing")).to.equal(newExhibitNFTAddress);
  });

  it("should organize multiple exhibits through EventOrganizerService", async function() {
    const { museum, organizerService, owner, exhibit1NFTAddress, exhibit2NFTAddress } = await loadFixture(deployContracts);
    
    // Check that both exhibits were properly organized
    expect(await organizerService.getExhibitNFTAddress("Exhibit1")).to.equal(exhibit1NFTAddress);
    expect(await organizerService.getExhibitNFTAddress("Exhibit2")).to.equal(exhibit2NFTAddress);
    
    // Verify they're in the museum
    expect(await museum.exhibits("Exhibit1")).to.equal(exhibit1NFTAddress);
    expect(await museum.exhibits("Exhibit2")).to.equal(exhibit2NFTAddress);
  });

  it("should NOT allow direct museum curation if not owner", async function() {
    const { museum, organizerService, owner, buyer, exhibit1NFTAddress, exhibit2NFTAddress } = await loadFixture(deployContracts);
    
    // Try to directly curate an exhibit with a non-owner account
    await expect(
      museum.connect(buyer).curateExhibit("WestWing", exhibit2NFTAddress)
    ).to.be.revertedWithCustomError(museum, "OwnableUnauthorizedAccount");
    
    // Also try with the original owner (who is no longer the owner)
    await expect(
      museum.connect(owner).curateExhibit("WestWing", exhibit2NFTAddress)
    ).to.be.revertedWithCustomError(museum, "OwnableUnauthorizedAccount");
  });

  it("should verify ticket ownership", async function() {
    const { museum, buyer, usdtToken, exhibit1NFTAddress } = await loadFixture(deployContracts);

    // Get the ExhibitNFT contract
    const exhibitNFT = await ethers.getContractAt("ExhibitNFT", exhibit1NFTAddress);
    
    // Get the PaymentHandler address
    const paymentHandlerAddress = await exhibitNFT.paymentHandler();
    
    // Define interfaces for type checking
    const paymentHandlerInterface = new ethers.Interface([
      "function processPayment(address token, uint256 amount, uint256 paymentType) external"
    ]);
    
    const erc20Interface = new ethers.Interface([
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function balanceOf(address account) view returns (uint256)"
    ]);
    
    // Create typed contracts
    const paymentHandler = new ethers.Contract(paymentHandlerAddress, paymentHandlerInterface, buyer);
    const typedToken = new ethers.Contract(usdtToken.target, erc20Interface, buyer);
    
    // Approve tokens for payment
    await typedToken.approve(paymentHandlerAddress, ethers.parseUnits("50", 6));
    
    // Process payment and mint ticket
    await paymentHandler.processPayment(
      usdtToken.target,
      ethers.parseUnits("50", 6),
      1 // 1 = Ticket Sale
    );
    
    // Verify ticket ownership
    expect(await museum.verifyTicketOwnership("Exhibit1", buyer.address)).to.be.true;
  });

  it("should correctly update the payment handler balance after ticket purchase", async function() {
    const { museum, buyer, usdtToken, exhibit1NFTAddress } = await loadFixture(deployContracts);

    // Get the ExhibitNFT contract
    const exhibitNFT = await ethers.getContractAt("ExhibitNFT", exhibit1NFTAddress);
    
    // Get the PaymentHandler address
    const paymentHandlerAddress = await exhibitNFT.paymentHandler();
    
    // Define interfaces for type checking
    const paymentHandlerInterface = new ethers.Interface([
      "function processPayment(address token, uint256 amount, uint256 paymentType) external"
    ]);
    
    const erc20Interface = new ethers.Interface([
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function balanceOf(address account) view returns (uint256)"
    ]);
    
    // Create typed contracts
    const paymentHandler = new ethers.Contract(paymentHandlerAddress, paymentHandlerInterface, buyer);
    const typedToken = new ethers.Contract(usdtToken.target, erc20Interface, buyer);
    
    // Check initial balance
    const initialBalance = await typedToken.balanceOf(paymentHandlerAddress);
    
    // Approve tokens for payment
    await typedToken.approve(paymentHandlerAddress, ethers.parseUnits("50", 6));
    
    // Process payment
    await paymentHandler.processPayment(
      usdtToken.target,
      ethers.parseUnits("50", 6),
      1 // 1 = Ticket Sale
    );
    
    // The balance should be 0 since funds are immediately distributed to beneficiaries
    const finalBalance = await typedToken.balanceOf(paymentHandlerAddress);
    expect(finalBalance).to.equal(0);
  });

  it("should correctly distribute funds to beneficiaries", async function() {
    const { museum, buyer, usdtToken, exhibit1NFTAddress, beneficiary1, beneficiary2 } = await loadFixture(deployContracts);

    // Get the ExhibitNFT contract
    const exhibitNFT = await ethers.getContractAt("ExhibitNFT", exhibit1NFTAddress);
    
    // Get the PaymentHandler address
    const paymentHandlerAddress = await exhibitNFT.paymentHandler();
    
    // Define interfaces for type checking
    const paymentHandlerInterface = new ethers.Interface([
      "function processPayment(address token, uint256 amount, uint256 paymentType) external"
    ]);
    
    const erc20Interface = new ethers.Interface([
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function balanceOf(address account) view returns (uint256)"
    ]);
    
    // Create typed contracts
    const paymentHandler = new ethers.Contract(paymentHandlerAddress, paymentHandlerInterface, buyer);
    const typedToken = new ethers.Contract(usdtToken.target, erc20Interface, buyer);
    
    // Get initial balances
    const initialBalance1 = await typedToken.balanceOf(beneficiary1.address);
    const initialBalance2 = await typedToken.balanceOf(beneficiary2.address);
    
    // Approve tokens for payment
    await typedToken.approve(paymentHandlerAddress, ethers.parseUnits("50", 6));
    
    // Process payment
    await paymentHandler.processPayment(
      usdtToken.target,
      ethers.parseUnits("50", 6),
      1 // 1 = Ticket Sale
    );
    
    // Check beneficiary balances after distribution
    const finalBalance1 = await typedToken.balanceOf(beneficiary1.address);
    const finalBalance2 = await typedToken.balanceOf(beneficiary2.address);
    
    // Each beneficiary should receive 50% of the payment
    const difference1 = finalBalance1 - initialBalance1;
    const difference2 = finalBalance2 - initialBalance2;
    expect(difference1).to.equal(ethers.parseUnits("25", 6));
    expect(difference2).to.equal(ethers.parseUnits("25", 6));
  });
});