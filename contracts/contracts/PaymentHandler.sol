// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PaymentHandler
 * @dev This contract handles ERC20 token payments (USDT, DAI, USDC) and automatically splits
 * the funds among beneficiaries based on predefined shares. The contract is designed for multi-chain
 * deployment, where each instance operates on its own chain.
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PaymentHandler {
    using SafeERC20 for IERC20;

    address[] public beneficiaries;
    mapping(address => uint256) public shares;
    uint256 public totalShares;

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

    /**
     * @dev Constructor to initialize beneficiaries and their corresponding shares.
     * @param _beneficiaries Array of beneficiary addresses.
     * @param _shares Array of shares corresponding to each beneficiary.
     */
    constructor(
        address[] memory _beneficiaries,
        uint256[] memory _shares
        ) {
        require(_beneficiaries.length == _shares.length, "Length mismatch");
        require(_beneficiaries.length > 0, "No beneficiaries provided");

        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            beneficiaries.push(_beneficiaries[i]);
            shares[_beneficiaries[i]] = _shares[i];
            totalShares += _shares[i];
        }
        emit PaymentHandlerDeployed(_beneficiaries, _shares, totalShares);
    }

     /**
     * @dev Internal function to split tokens among beneficiaries based on their shares.
     * @param token The ERC20 token being processed.
     * @param amount The total token amount to split.
     * @param paymentType The type of payment.
     */
    function _splitTokens(IERC20 token, uint256 amount, uint256 paymentType) internal {
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address beneficiary = beneficiaries[i];
            uint256 payment = (amount * shares[beneficiary]) / totalShares;
            token.safeTransfer(beneficiary, payment);

            emit PaymentDistributed(beneficiary, payment, address(token), paymentType);
        }
    }

    /**
     * @dev Process an ERC20 token payment and automatically split funds among beneficiaries.
     * The user must have pre-approved this contract to spend the token.
     * @param token The ERC20 token to be used (e.g., USDT, DAI, or USDC).
     * @param amount The total amount of tokens to split.
     * @param paymentType A flag indicating the type of payment (1 for ticket sale, 2 for donation).
     */
    function processPayment(IERC20 token, uint256 amount, uint256 paymentType) external {
        require(amount > 0, "Amount must be > 0");
        token.safeTransferFrom(msg.sender, address(this), amount);
        _splitTokens(token, amount, paymentType);

        emit PaymentProcessed(msg.sender, amount, address(token), paymentType);
    }

    /**
     * @dev Fallback function to reject any native ETH transfers.
     */
    fallback() external payable {
        revert("This contract only accepts ERC20 tokens");
    }

    /**
     * @dev Receive function to reject any native ETH transfers.
     */
    receive() external payable {
        revert("This contract only accepts ERC20 tokens");
    }
}
