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

    // Deploy USDC token (or another ERC20 token)
    const MockUSDC = await ethers.getContractFactory("USDT");
    const usdcToken = await MockUSDC.connect(buyer).deploy(ethers.parseUnits("200", 6));

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

    // Create exhibit info struct for Exhibit1
    const exhibitInfo1 = {
      name: "ExhibitName",
      symbol: "EXB",
      ticketPrice: ethers.parseUnits("50", 6),
      baseURI: "https://api.example.com/nft/",
      location: "Lusaka,Zambia",
      artifactNFTAddress: artifactNFT.target,
      details: "Lusaka Art Gallery"
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
      location: "Lusaka,Zambia",
      artifactNFTAddress: artifactNFT.target,
      details: "Lusaka Art Gallery2"
    };

    // Create revenue config struct for Exhibit2
    const revenueConfig2 = {
      beneficiaries: [beneficiary1.address, beneficiary2.address, funder.address],
      shares: [50, 50, 50]
    };

    // Organize exhibits
    await organizerService.organizeExhibit(
      "Exhibit1",
      exhibitInfo1,
      revenueConfig1
    );

    await organizerService.organizeExhibit(
      "Exhibit2",
      exhibitInfo2,
      revenueConfig2
    );

    const exhibit1NFTAddress = await organizerService.exhibits("Exhibit1");
    const exhibit2NFTAddress = await organizerService.exhibits("Exhibit2");
    
    // Curate exhibit in museum
    await museum.connect(owner).curateExhibit("WestWing", exhibit1NFTAddress);

    return {
      museum,
      organizerService,
      beneficiary1,
      beneficiary2,
      exhibit1NFTAddress,
      exhibit2NFTAddress,
      owner,
      buyer,
      usdcToken,
      funder
    };
  }

  it("should correctly deploy a mock erc20 token", async function() {
    const { owner } = await loadFixture(deployContracts);

    const MockUSDC = await ethers.getContractFactory("USDT");
    const usdcToken = await MockUSDC.connect(owner).deploy(ethers.parseUnits("200", 6));
    
    // Define the ERC20 interface for type checking
    const erc20Interface = new ethers.Interface([
      "function symbol() view returns (string)",
      "function name() view returns (string)",
      "function decimals() view returns (uint8)",
      "function balanceOf(address) view returns (uint256)"
    ]);
    
    const typedToken = new ethers.Contract(usdcToken.target, erc20Interface, owner);
    
    expect(await typedToken.symbol()).to.equal("USDCM");
    expect(await typedToken.name()).to.equal("USDC Mock");
    expect(await typedToken.decimals()).to.equal(18);
    expect(await typedToken.balanceOf(owner.address)).to.equal(ethers.parseUnits("200", 6));
  });

  it("should correctly curate an exhibit", async function() {
    const { museum, owner, exhibit2NFTAddress } = await loadFixture(deployContracts);

    await museum.connect(owner).curateExhibit("EastWing", exhibit2NFTAddress);
    expect(await museum.exhibits("EastWing")).to.equal(exhibit2NFTAddress);
  });

  it("should override an existing exhibit if owner", async function() {
    const { museum, owner, exhibit1NFTAddress, exhibit2NFTAddress } = await loadFixture(deployContracts);
    
    await museum.connect(owner).curateExhibit("WestWing", exhibit2NFTAddress);
    expect(await museum.exhibits("WestWing")).to.equal(exhibit2NFTAddress);
  });

  it("should NOT override an existing exhibit if not owner", async function() {
    const { museum, buyer, exhibit1NFTAddress, exhibit2NFTAddress } = await loadFixture(deployContracts);
    
    await expect(
      museum.connect(buyer).curateExhibit("WestWing", exhibit2NFTAddress)
    ).to.be.revertedWithCustomError(museum, "OwnableUnauthorizedAccount");
    
    expect(await museum.exhibits("WestWing")).to.equal(exhibit1NFTAddress);
  });

  it("should verify ticket ownership", async function() {
    const { museum, buyer, usdcToken, exhibit1NFTAddress } = await loadFixture(deployContracts);

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
    const typedToken = new ethers.Contract(usdcToken.target, erc20Interface, buyer);
    
    // Approve tokens for payment
    await typedToken.approve(paymentHandlerAddress, ethers.parseUnits("50", 6));
    
    // Process payment and mint ticket
    await paymentHandler.processPayment(
      usdcToken.target,
      ethers.parseUnits("50", 6),
      1 // 1 = Ticket Sale
    );
    
    // Verify ticket ownership
    expect(await museum.verifyTicketOwnership("WestWing", buyer.address)).to.be.true;
  });

  it("should correctly update the payment handler balance after ticket purchase", async function() {
    const { museum, buyer, usdcToken, exhibit1NFTAddress } = await loadFixture(deployContracts);

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
    const typedToken = new ethers.Contract(usdcToken.target, erc20Interface, buyer);
    
    // Check initial balance
    const initialBalance = await typedToken.balanceOf(paymentHandlerAddress);
    
    // Approve tokens for payment
    await typedToken.approve(paymentHandlerAddress, ethers.parseUnits("50", 6));
    
    // Process payment
    await paymentHandler.processPayment(
      usdcToken.target,
      ethers.parseUnits("50", 6),
      1 // 1 = Ticket Sale
    );
    
    // The balance should be 0 since funds are immediately distributed to beneficiaries
    const finalBalance = await typedToken.balanceOf(paymentHandlerAddress);
    expect(finalBalance).to.equal(0);
  });

  it("should correctly distribute funds to beneficiaries", async function() {
    const { museum, buyer, usdcToken, exhibit1NFTAddress, beneficiary1, beneficiary2 } = await loadFixture(deployContracts);

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
    const typedToken = new ethers.Contract(usdcToken.target, erc20Interface, buyer);
    
    // Get initial balances
    const initialBalance1 = await typedToken.balanceOf(beneficiary1.address);
    const initialBalance2 = await typedToken.balanceOf(beneficiary2.address);
    
    // Approve tokens for payment
    await typedToken.approve(paymentHandlerAddress, ethers.parseUnits("50", 6));
    
    // Process payment
    await paymentHandler.processPayment(
      usdcToken.target,
      ethers.parseUnits("50", 6),
      1 // 1 = Ticket Sale
    );
    
    // Check beneficiary balances after distribution
    const finalBalance1 = await typedToken.balanceOf(beneficiary1.address);
    const finalBalance2 = await typedToken.balanceOf(beneficiary2.address);
    
    // Each beneficiary should receive 50% of the payment
    expect(finalBalance1.sub(initialBalance1)).to.equal(ethers.parseUnits("25", 6));
    expect(finalBalance2.sub(initialBalance2)).to.equal(ethers.parseUnits("25", 6));
  });
});
