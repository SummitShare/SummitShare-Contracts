// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* Category: Smart Contract
   Purpose: Manages Non-Fungible Tokens (NFTs) representing individual exhibits, ensuring ownership and access rights for event participants. */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./PaymentHandler.sol";
import "./ExhibitStructs.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ExhibitNFT is ERC721, Ownable, ITicketing {
    uint256 public immutable ticketPrice;
    address public immutable paymentHandler;
    uint256 private totalMinted;
    string public baseURI;
    string public location;
    address public immutable artifactNFTAddress;
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
    ExhibitInfo memory info,
    address _paymentHandler,
    address _owner,
    string memory _location,
    string memory _details
) ERC721(info.name, info.symbol) Ownable(_owner) {
    require(_paymentHandler != address(0), "Invalid payment handler");
    
    ticketPrice = info.ticketPrice;
    paymentHandler = _paymentHandler;
    baseURI = info.baseURI;
    totalMinted = 0;
    artifactNFTAddress = info.artifactNFTAddress;
    location = _location;
    details = _details;

    emit ExhibitCreated(
        info.name,
        info.symbol,
        info.ticketPrice, 
        _paymentHandler,
        _owner,
        info.artifactNFTAddress
    );
}


    /**
     * @dev Mint a new ticket NFT.
     * @param to Address to mint the ticket to.
     * @return tokenId The ID of the minted token.
     */
    function mintTicket(address to) external override returns (uint256) {
        if (msg.sender != paymentHandler && msg.sender != owner()) {
            revert("Not authorized");
        }
        
        uint256 tokenId = totalMinted;
        _mint(to, tokenId);
        totalMinted++;
        
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