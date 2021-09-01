// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "../interfaces/erc20/IERC20Metadata.sol";
import "../storage/SmartPoolStorage.sol";

pragma abicoder v2;
interface ISmartPool is IERC20Metadata{

    function token()external view returns(address);

    function getNet(address investor) external view returns (uint256);

    function getCap() external view returns (uint256);

    function getRewards() external view returns (address);

    function getStrategist() external view returns (address);

    function getGovernance() external view returns (address);

    function getFee(SmartPoolStorage.FeeType ft) external view returns (SmartPoolStorage.Fee memory);
}
