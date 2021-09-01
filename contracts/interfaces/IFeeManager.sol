// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "../storage/SmartPoolStorage.sol";

pragma abicoder v2;
/// @title Fee Manager - The fee manager interface
/// @notice Defines the rules to collect fees
interface IFeeManager {

    /// @notice Get fee by type
    /// @dev (0=JOIN_FEE,1=EXIT_FEE,2=MANAGEMENT_FEE,3=PERFORMANCE_FEE)
    /// @param ft Fee type
    function getFee(SmartPoolStorage.FeeType ft) external view returns (SmartPoolStorage.Fee memory);


    /// @notice Calculate management fee
    /// @dev The management fee is calculated from the time the last management fee is collected
    function calcManagementFee()external view returns(uint256);

    /// @notice Calculate the performance fee
    /// @dev Performance fee is collected by each address. New net worth line of the address is updated when the performance is collected
    /// @param target Account address
    /// @param newNet New net worth
    function calcPerformanceFee(address target,uint256 newNet)external view returns(uint256);

    /// @notice Calculate the fee by ratio
    /// @dev The fee is calculate by ratio of the vault amount
    /// @param ft Fee type
    /// @param vaultAmount Vault amount
    function calcRatioFee(SmartPoolStorage.FeeType ft,uint256 vaultAmount)external view returns(uint256);

    /// @notice Collect outstanding management fee
    /// @dev Outstanding managemnt fee is collected from the last time management is collected
    function takeOutstandingManagementFee()external returns(uint256);

    /// @notice Collect outstanding performance fee
    /// @dev Outstanding performance fee is collect by each address
    /// @param target Account address to collect fee
    function takeOutstandingPerformanceFee(address target)external returns(uint256);

}
