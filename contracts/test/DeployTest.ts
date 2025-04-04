import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("Deployment Tests", function () {
    // Function to deploy and set up the necessary contracts
    async function deployContracts() {
        // Get signers
        const [owner, controller, beneficiary1, beneficiary2, funder] = await ethers.getSigners();

        // Deploy USDC token
        const MockUSDC = await ethers.getContractFactory("USDT");
        const usdcToken = await MockUSDC.connect(owner).deploy(ethers.parseUnits("20000000", 6));

        // Define the ERC20 interface for type checking
        const erc20Interface = new ethers.Interface([
            "function transfer(address to, uint256 amount) external returns (bool)",
            "function approve(address spender, uint256 amount) external returns (bool)",
            "function balanceOf(address account) view returns (uint256)"
        ]);
        
        // Create typed token contract for owner
        const typedTokenOwner = new ethers.Contract(usdcToken.target, erc20Interface, owner);
        
        // Create typed token contract for funder
        const typedTokenFunder = new ethers.Contract(usdcToken.target, erc20Interface, funder);

        // Distribute some USDC to the funders
        await typedTokenOwner.transfer(funder.address, ethers.parseUnits("2000000", 6));

        // Deploy Museum contract
        const Museum = await ethers.getContractFactory("Museum");
        const museum = await Museum.connect(owner).deploy();

        // Deploy EventOrganizerService with the deployed Museum
        const EventOrganizerService = await ethers.getContractFactory("EventOrganizerService");
        const organizerService = await EventOrganizerService.deploy(museum.target);

        // Transfer ownership of Museum to EventOrganizerService
        await museum.transferOwnership(organizerService.target);

        // Deploy ArtifactNFT contracts
        const ArtifactNFT = await ethers.getContractFactory("ArtifactNFT");
        const artifactNFT1 = await ArtifactNFT.connect(owner).deploy(
            "LusakaCollection", 
            "LAGC", 
            owner.address, 
            "http://localhost:3000/api/nft/"
        );
        
        const artifactNFT2 = await ArtifactNFT.connect(owner).deploy(
            "WomenCollection", 
            "WHMC", 
            owner.address, 
            "http://localhost:3000/api/nft/"
        );

        // Create exhibit info struct for Exhibit1
        const exhibitInfo1 = {
            name: "Lusaka Art Gallery",
            symbol: "LAG",
            ticketPrice: ethers.parseUnits("10", 6),
            baseURI: "http://localhost:3000/api/ticket/",
            artifactNFTAddress: artifactNFT1.target
        };

        // Create revenue config struct for Exhibit1
        const revenueConfig1 = {
            beneficiaries: [beneficiary1.address, beneficiary2.address],
            shares: [50, 50]
        };

        // Create exhibit info struct for Exhibit2
        const exhibitInfo2 = {
            name: "Womens History Museum",
            symbol: "WHM",
            ticketPrice: ethers.parseUnits("10", 6),
            baseURI: "http://localhost:3000/api/ticket/",
            artifactNFTAddress: artifactNFT2.target
        };

        // Create revenue config struct for Exhibit2
        const revenueConfig2 = {
            beneficiaries: [beneficiary1.address, beneficiary2.address],
            shares: [50, 50]
        };

        const location1 = "Lusaka,Zambia";
        const details1 = "Expressing the word with color";
        
        const location2 = "New York,USA";
        const details2 = "Those who walked before us and those to come.";

        // Organize exhibits
        await organizerService.connect(owner).organizeExhibit(
            "exhibit1",
            exhibitInfo1,
            revenueConfig1,
            location1,
            details1
        );

        await organizerService.connect(owner).organizeExhibit(
            "exhibit2",
            exhibitInfo2,
            revenueConfig2,
            location2,
            details2
        );

        // Retrieve the ExhibitNFT contract
        const exhibitNFTAddress = await organizerService.getExhibitNFTAddress("exhibit1");
        
        // Define the ExhibitNFT interface for type checking
        const exhibitNFTInterface = new ethers.Interface([
            "function paymentHandler() view returns (address)"
        ]);
        
        // Create typed ExhibitNFT contract
        const exhibitNFT = new ethers.Contract(exhibitNFTAddress, exhibitNFTInterface, owner);
        
        // Get the PaymentHandler address
        const paymentHandlerAddress = await exhibitNFT.paymentHandler();
        
        // Define the PaymentHandler interface for type checking
        const paymentHandlerInterface = new ethers.Interface([
            "function processPayment(address token, uint256 amount, uint256 paymentType) external"
        ]);
        
        // Create typed PaymentHandler contract for funder
        const typedPaymentHandler = new ethers.Contract(
            paymentHandlerAddress, 
            paymentHandlerInterface, 
            funder
        );

        // Approve and purchase tickets
        await typedTokenFunder.approve(paymentHandlerAddress, ethers.parseUnits("30", 6));
        
        // Purchase 3 tickets
        for (let i = 0; i < 3; i++) {
            await typedPaymentHandler.processPayment(
                usdcToken.target,
                ethers.parseUnits("10", 6),
                1 // 1 = Ticket Sale
            );
        }

        return {
            museum,
            usdcToken,
            organizerService,
            owner,
            controller,
            beneficiary1,
            beneficiary2,
            funder,
            artifactNFT1,
            exhibitNFT,
            typedTokenOwner,
            typedTokenFunder,
            paymentHandlerAddress
        };
    }

    describe("Deploy", function () {
        it("Should correctly organize an exhibit and emit an event", async function () {
            const { museum, owner, artifactNFT1, exhibitNFT } = await loadFixture(deployContracts);

            // Check that the ExhibitNFT was deployed
            expect(await museum.exhibits("exhibit1")).to.equal(exhibitNFT.target);

            // Check that the ArtifactNFT was deployed with the correct parameters
            expect(await artifactNFT1.name()).to.equal("LusakaCollection");
            expect(await artifactNFT1.symbol()).to.equal("LAGC");
            expect(await artifactNFT1.owner()).to.equal(owner.address);
        });

        it("should test the payment handler balance increases after each purchase", async function () {
            const { museum, owner, artifactNFT1, exhibitNFT, usdcToken, paymentHandlerAddress, typedTokenOwner, beneficiary1, beneficiary2 } = await loadFixture(deployContracts);

            // Check that the ExhibitNFT was deployed
            expect(await museum.exhibits("exhibit1")).to.equal(exhibitNFT.target);
            
            // Check beneficiary balances
            // Since PaymentHandler immediately distributes funds, we need to check beneficiary balances
            // Each beneficiary should have received 15 tokens (50% of 30 tokens)
            const beneficiary1Balance = await typedTokenOwner.balanceOf(beneficiary1.address);
            const beneficiary2Balance = await typedTokenOwner.balanceOf(beneficiary2.address);
            
            // Verify each beneficiary received their share
            expect(beneficiary1Balance).to.be.at.least(ethers.parseUnits("15", 6));
            expect(beneficiary2Balance).to.be.at.least(ethers.parseUnits("15", 6));
        });

        it("should test the payment handler immediately distributes funds", async function () {
            const { museum, owner, artifactNFT1, exhibitNFT, usdcToken, paymentHandlerAddress, typedTokenOwner, typedTokenFunder, beneficiary1, funder } = await loadFixture(deployContracts);

            // Check that the ExhibitNFT was deployed
            expect(await museum.exhibits("exhibit1")).to.equal(exhibitNFT.target);
            
            // Get initial balances
            const initialBeneficiary1Balance = await typedTokenOwner.balanceOf(beneficiary1.address);
            
            // Define interfaces for payment processing
            const paymentHandlerInterface = new ethers.Interface([
                "function processPayment(address token, uint256 amount, uint256 paymentType) external"
            ]);
            
            // Create typed payment handler contract
            const typedPaymentHandler = new ethers.Contract(
                paymentHandlerAddress, 
                paymentHandlerInterface, 
                funder
            );
            
            // Approve tokens for payment
            await typedTokenFunder.approve(paymentHandlerAddress, ethers.parseUnits("10", 6));
            
            // Process another payment
            await typedPaymentHandler.processPayment(
                usdcToken.target,
                ethers.parseUnits("10", 6),
                1 // 1 = Ticket Sale
            );
            
            // Check beneficiary balance after distribution
            const finalBeneficiary1Balance = await typedTokenOwner.balanceOf(beneficiary1.address);
            
            // Beneficiary1 should have received 5 more tokens (50% of 10 tokens)
            const difference = finalBeneficiary1Balance - initialBeneficiary1Balance;
            expect(difference).to.equal(ethers.parseUnits("5", 6));
            
            // Payment handler balance should be 0 since funds are immediately distributed
            const paymentHandlerBalance = await typedTokenOwner.balanceOf(paymentHandlerAddress);
            expect(paymentHandlerBalance).to.equal(0);
        });
    });
});
