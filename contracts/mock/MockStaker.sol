// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "../positions/UniV3Liquidity.sol";
import "../positions/UniV3LiquidityStaker.sol";

pragma abicoder v2;
contract MockStaker is UniV3Liquidity,UniV3LiquidityStaker{

}
