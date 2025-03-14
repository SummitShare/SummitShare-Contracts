// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ITicketing {
    function mintTicket(address to) external;
}

contract PaymentHandler is Ownable {
    uint256 public totalShares;
    bool public onChainTicketingEnabled;
    address public ticketingContract;
    address[] public beneficiaries;
    mapping(address => uint256) public shares;

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

    constructor(address[] memory _beneficiaries, uint256[] memory _shares) Ownable(msg.sender) {
        require(_beneficiaries.length == _shares.length, "Length mismatch");
        require(_beneficiaries.length > 0, "No beneficiaries provided");
        
        totalShares = 0; // Explicitly initialize
        
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
    function setTicketingEnabled(bool _enabled, address _ticketingContract) external onlyOwner {
        require(_ticketingContract != address(0) || !_enabled, "Invalid ticketing contract");
        onChainTicketingEnabled = _enabled;
        ticketingContract = _ticketingContract;
    }

    /**
     * @dev Split tokens among beneficiaries according to their shares.
     * @param token The ERC20 token to distribute.
     * @param amount The total amount to distribute.
     * @param paymentType The type of payment (1 = Ticket, 2 = Donation).
     */
    function _splitTokens(IERC20 token, uint256 amount, uint256 paymentType) internal {
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address beneficiary = beneficiaries[i];
            uint256 payment = (amount * shares[beneficiary]) / totalShares;
            
            if (payment > 0) { // Skip zero payments to save gas
                bool success = token.transfer(beneficiary, payment);
                require(success, "Token transfer failed");
                emit PaymentDistributed(beneficiary, payment, address(token), paymentType);
            }
        }
    }

    /**
     * @dev Process a payment, split funds, and mint ticket if applicable.
     * @param token The ERC20 token used for payment.
     * @param amount The amount being paid.
     * @param paymentType The type of payment (1 = Ticket, 2 = Donation).
     */
    function processPayment(IERC20 token, uint256 amount, uint256 paymentType) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer tokens first
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");
        
        // Split tokens to beneficiaries
        _splitTokens(token, amount, paymentType);
        
        // Mint ticket if applicable
        if (paymentType == 1 && onChainTicketingEnabled && ticketingContract != address(0)) {
            ITicketing(ticketingContract).mintTicket(msg.sender);
            emit TicketMinted(msg.sender);
        }
        
        emit PaymentProcessed(msg.sender, amount, address(token), paymentType);
    }
}
