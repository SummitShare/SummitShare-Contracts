// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Museum.sol";
import "./ArtifactNFT.sol";
import "./ExhibitNFT.sol";
import "./PaymentHandler.sol";
import "./ExhibitStructs.sol";

contract EventOrganizerService is Ownable {
    Museum public museum;
    mapping(string => address) public exhibits;

    struct RevenueConfig {
        address[] beneficiaries;
        uint256[] shares;
    }

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

    constructor(Museum _museum) Ownable(msg.sender) {
        museum = _museum;
    }

    function deployArtifactNFT(
        string memory name,
        string memory symbol,
        address owner,
        string memory baseURI
    ) external onlyOwner {
        ArtifactNFT newArtifact = new ArtifactNFT(name, symbol, owner, baseURI);
        emit ArtifactNFTDeployed(address(newArtifact), name, symbol, owner, baseURI);
    }

// Organize Exhibit function in EventOrganizerService
    function organizeExhibit(
    string calldata exhibitId,
    ExhibitInfo calldata info,
    RevenueConfig calldata revenue,
    string calldata location,
    string calldata details
    ) external onlyOwner {
    require(address(museum.exhibits(exhibitId)) == address(0), "ExhibitID already taken");

    PaymentHandler paymentHandler = new PaymentHandler(revenue.beneficiaries, revenue.shares);

    // Pass ExhibitInfo struct directly here
    ExhibitNFT exhibitNFT = new ExhibitNFT(
        info,
        address(paymentHandler),
        owner(),
        location,
        details
    );

    paymentHandler.setTicketingEnabled(true, address(exhibitNFT));
    museum.curateExhibit(exhibitId, exhibitNFT);
    exhibits[exhibitId] = address(exhibitNFT);

    emit ExhibitNFTDeployed(exhibitId, address(exhibitNFT), address(paymentHandler), address(museum));
}


    function getExhibitNFTAddress(string memory _id) external view returns (address) {
        return exhibits[_id];
    }
}
