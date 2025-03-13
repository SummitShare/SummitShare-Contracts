// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* Category: Smart Contract
   Purpose: Manages Non-Fungible Tokens (NFTs) representing individual exhibits, ensuring ownership and access rights for event participants. */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./PaymentHandler.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ExhibitNFT is ERC721, Ownable {
    uint256 public ticketPrice;
    PaymentHandler public paymentHandler;
    uint256 private totalMinted;
    string public baseURI;

    string public location;
    address public artifactNFTAddress;
    string public details;

    event TicketMinted(address exhibit, address to, uint256 tokenId);
    // Define the event
    event ExhibitCreated(
        string name,
        string symbol,
        uint256 ticketPrice,
        PaymentHandler paymentHandler,
        address owner,
        string baseURI,
        string location,
        address artifactNFTAddress,
        string details
    );

    constructor(
        string memory name,
        string memory symbol,
        uint256 _ticketPrice,
        address _paymentHandler,
        address _owner,
        string memory _baseURI,
        string memory _location,
        address _artifactNFTAddress,
        string memory _details
    ) ERC721(name, symbol) Ownable(_owner) {
        ticketPrice = _ticketPrice;
        paymentHandler = PaymentHandler(_paymentHandler);
        baseURI = _baseURI;
        totalMinted = 0;

        location = _location;
        artifactNFTAddress = _artifactNFTAddress;
        details = _details;

        // Emit the event
        emit ExhibitCreated(
            name,
            symbol,
            _ticketPrice, 
            paymentHandler,
            _owner,
            _baseURI,
            _location,
            _artifactNFTAddress,
            _details
        );
    }

    function mintTicket(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = totalMinted++;
        _mint(to, tokenId);
        emit TicketMinted(address(this), to, tokenId);
        return tokenId;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        baseURI = newBaseURI;
    }
}