// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ExhibitNFT.sol";

contract Museum is Ownable {
    // Mapping from exhibit ID to its ExhibitNFT contract.
    mapping(string => ExhibitNFT) public exhibits;

    event ExhibitCurated(
        address museumAddress,
        string exhibitId,
        address exhibitAddress
        );

    event MuseumCreated(
        address museumAddress,
        address ownerAddress
        );

    constructor() Ownable(msg.sender) {
        emit MuseumCreated(address(this), owner());
    }
 
    /**
     * @dev Register (curate) a new exhibit.
     * @param exhibitId Unique identifier for the exhibit.
     * @param exhibit The ExhibitNFT contract for the exhibit.
     */
    function curateExhibit(string memory exhibitId, ExhibitNFT exhibit) external onlyOwner {
        exhibits[exhibitId] = exhibit;
        emit ExhibitCurated(address(this), exhibitId, address(exhibit));
    }
 
    /**
     * @dev Verify ticket ownership for an exhibit.
     * @param exhibitId Unique identifier for the exhibit.
     * @param user Address of the user.
     */
    function verifyTicketOwnership(string memory exhibitId, address user) external view returns (bool) {
        ExhibitNFT exhibit = exhibits[exhibitId];
        return exhibit.balanceOf(user) > 0;
    }
}
