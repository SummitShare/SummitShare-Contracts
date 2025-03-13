// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ExhibitNFT.sol";

/**
 * @title Museum
 * @dev Central hub for curating exhibits and managing ticket verification.
 */
contract Museum is Ownable {
    // Mapping from exhibit ID to its ExhibitNFT contract.
    mapping(string => ExhibitNFT) public exhibits;

    // Optimized events with minimal parameters
    event ExhibitCurated(
        string exhibitId,
        address exhibitAddress
    );

    event MuseumCreated(address museumAddress);

    /**
     * @dev Initializes the Museum contract.
     */
    constructor() Ownable(msg.sender) {
        emit MuseumCreated(address(this));
    }
 
    /**
     * @dev Register (curate) a new exhibit.
     * @param exhibitId Unique identifier for the exhibit.
     * @param exhibit The ExhibitNFT contract for the exhibit.
     */
    function curateExhibit(string memory exhibitId, ExhibitNFT exhibit) external onlyOwner {
        exhibits[exhibitId] = exhibit;
        emit ExhibitCurated(exhibitId, address(exhibit));
    }
 
    /**
     * @dev Verify ticket ownership for an exhibit.
     * @param exhibitId Unique identifier for the exhibit.
     * @param user Address of the user.
     * @return True if the user owns a ticket, false otherwise.
     */
    function verifyTicketOwnership(string memory exhibitId, address user) external view returns (bool) {
        ExhibitNFT exhibit = exhibits[exhibitId];
        // Check if the exhibit exists before checking balance
        if (address(exhibit) == address(0)) {
            return false;
        }
        return exhibit.balanceOf(user) > 0;
    }
}
