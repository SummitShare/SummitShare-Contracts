// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* Category: Smart Contract
   Purpose: Manages Non-Fungible Tokens (NFTs) representing individual exhibits, ensuring ownership and access rights for event participants. */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./PaymentHandler.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ExhibitNFT is ERC721, Ownable {
    uint256 public ticketPrice;
    address public paymentHandler;
    uint256 private totalMinted;
    string public baseURI;
    string public location;
    address public artifactNFTAddress;
    string public details;

    event TicketMinted(address exhibit, address to, uint256 tokenId);

    event ExhibitCreated(
        string name,
        string symbol,
        uint256 ticketPrice,
        address paymentHandler,
        address owner,
        address artifactNFTAddress
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
        paymentHandler = _paymentHandler;
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
            _paymentHandler,
            _owner,
 
            _artifactNFTAddress
        );
    }

    /**
     * @dev Mint a new ticket NFT.
     * @param to Address to mint the ticket to.
     * @return tokenId The ID of the minted token.
     */
    function mintTicket(address to) external returns (uint256) {
        require(msg.sender == paymentHandler || msg.sender == owner(), "Not authorized");
        
        uint256 tokenId = totalMinted++;
        _mint(to, tokenId);
        
        emit TicketMinted(address(this), to, tokenId);
        return tokenId;
    }

    /**
     * @dev Returns the base URI for token metadata.
     * @return The base URI string.
     */
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /**
     * @dev Set a new base URI for token metadata.
     * @param newBaseURI The new base URI to set.
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        baseURI = newBaseURI;
    }
}
