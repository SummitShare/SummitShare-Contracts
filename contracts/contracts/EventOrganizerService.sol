// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Museum.sol";
import "./ArtifactNFT.sol";
import "./ExhibitNFT.sol";
import "./PaymentHandler.sol";

contract EventOrganizerService is Ownable {
    Museum public museum;
    mapping(string => address) public exhibits;

    event ExhibitNFTDeployed(
        string exhibitId,
        address indexed exhibitNFTAddress,
        address indexed paymentHandlerAddress,
        address indexed museumAddress
    );
    event ArtifactNFTDeployed(
        address indexed artifactNFTAddress,
        string name,
        string symbol,
        address indexed ownerAddress,
        string baseURI
    );

    /**
     * @dev Constructor sets the Museum contract.
     * @param _museum Address of the deployed Museum contract.
     */
    constructor(Museum _museum) Ownable(msg.sender) {
        museum = _museum;
    }

    /**
     * @dev Deploy a new ArtifactNFT contract.
     * @param name Name of the artifact.
     * @param symbol Symbol of the artifact.
     * @param owner Owner address.
     * @param baseURI Base URI for metadata.
     */
    function deployArtifactNFT(
        string memory name,
        string memory symbol,
        address owner,
        string memory baseURI
    ) public {
        ArtifactNFT newArtifact = new ArtifactNFT(name, symbol, owner, baseURI);
               emit ArtifactNFTDeployed(
            address(newArtifact),
            name,
            symbol,
            owner,
            baseURI
        );
    }

    /**
     * @dev Organize a new exhibit by deploying PaymentHandler and ExhibitNFT contracts.
     * Automatically configures the PaymentHandler with the ExhibitNFT address for ticketing.
     * @param exhibitId Unique exhibit identifier.
     * @param name Name of the exhibit.
     * @param symbol NFT symbol for ticketing.
     * @param ticketPrice Predefined ticket price.
     * @param beneficiaries Array of beneficiary addresses.
     * @param shares Array of corresponding shares.
     * @param baseURI Base URI for NFT metadata.
     * @param location Exhibit location.
     * @param artifactNFTAddress Associated ArtifactNFT address.
     * @param details Additional exhibit details.
     */
    function organizeExhibit(
        string memory exhibitId,
        string memory name,
        string memory symbol,
        uint256 ticketPrice,
        address[] memory beneficiaries,
        uint256[] memory shares,
        string calldata baseURI,
        string calldata location,
        address artifactNFTAddress,
        string calldata details
    ) public onlyOwner {
        // Ensure the exhibitId is unique via the museum registry.
        require(address(museum.exhibits(exhibitId)) == address(0), "ExhibitID already taken");

        // Deploy PaymentHandler for this exhibit.
        PaymentHandler paymentHandler = new PaymentHandler(beneficiaries, shares);

        // Deploy ExhibitNFT for on-chain ticketing.
        ExhibitNFT exhibitNFT = new ExhibitNFT(
            name,
            symbol,
            ticketPrice,
            address(paymentHandler),
            owner(),
            baseURI,
            location,
            artifactNFTAddress,
            details
        );

        // Automatically configure PaymentHandler to use ExhibitNFT as the ticketing contract.
        paymentHandler.setTicketingEnabled(true, address(exhibitNFT));

        // Register the exhibit with the Museum.
        museum.curateExhibit(exhibitId, exhibitNFT);

        // Save the ExhibitNFT address in the mapping.
        exhibits[exhibitId] = address(exhibitNFT);

        emit ExhibitNFTDeployed(
            exhibitId,
            address(exhibitNFT),
            address(paymentHandler),
            address(museum)
        );
    }

    function getExhibitNFTAddress(
        string memory _id
    ) public view returns (address) {
        return address(exhibits[_id]);
    }
}