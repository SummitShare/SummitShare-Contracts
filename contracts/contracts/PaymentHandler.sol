// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ITicketing {
    function mintTicket(address to) external;
}

contract PaymentHandler {

    using SafeERC20 for IERC20;
    address[] public beneficiaries;
    mapping(address => uint256) public shares;
    uint256 public totalShares;

    // optional  on-chain ticketing configuration.
    bool public onChainTicketingEnabled;
    address public ticketingContract; 

    // Payment types: 1 = Ticket Sale, 2 = Donation.
    event PaymentProcessed(
        address indexed payer,
        uint256 amount,
        address token,
        uint256 paymentType
    );
    event PaymentDistributed(
        address beneficiary,
        uint256 amount,
        address token,
        uint256 paymentType
    );
    event PaymentHandlerDeployed(
        address[] beneficiaries,
        uint256[] shares,
        uint256 totalShares
    );
    event TicketMinted(address indexed recipient);

    modifier onlyBeneficiary() {
        require(shares[msg.sender] > 0, "Not a beneficiary");
        _;
    }

    constructor(address[] memory _beneficiaries, uint256[] memory _shares) {
        require(_beneficiaries.length == _shares.length, "Length mismatch");
        require(_beneficiaries.length > 0, "No beneficiaries provided");
       // owner = msg.sender;
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            beneficiaries.push(_beneficiaries[i]);
            shares[_beneficiaries[i]] = _shares[i];
            totalShares += _shares[i];
        }
        emit PaymentHandlerDeployed(_beneficiaries, _shares, totalShares);
    }

    /**
     * @dev Set the on-chain ticketing configuration.
     * @param _enabled Boolean flag to enable or disable ticketing.
     * @param _ticketingContract Address of the ticketing contract (ExhibitNFT).
     */
    function setTicketingEnabled(bool _enabled, address _ticketingContract) external onlyBeneficiary {
        onChainTicketingEnabled = _enabled;
        ticketingContract = _ticketingContract;
    }

        function _splitTokens(IERC20 token, uint256 amount, uint256 paymentType) internal {
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address beneficiary = beneficiaries[i];
            uint256 payment = (amount * shares[beneficiary]) / totalShares;
            token.safeTransfer(beneficiary, payment);
            emit PaymentDistributed(beneficiary, payment, address(token), paymentType);
        }
    }

    function processPayment(IERC20 token, uint256 amount, uint256 paymentType) external {
        require(amount > 0, "Amount must be > 0");
        token.safeTransferFrom(msg.sender, address(this), amount);
        _splitTokens(token, amount, paymentType);

        // For ticket sales, if enabled, mint a ticket.
        if (paymentType == 1 && onChainTicketingEnabled && ticketingContract != address(0)) {
            ITicketing(ticketingContract).mintTicket(msg.sender);
            emit TicketMinted(msg.sender);
        }
        emit PaymentProcessed(msg.sender, amount, address(token), paymentType);
    }
}

//     fallback() external payable {
//         revert("This contract only accepts ERC20 tokens");
//     }

//     receive() external payable {
//         revert("This contract only accepts ERC20 tokens");
//     }
// }
