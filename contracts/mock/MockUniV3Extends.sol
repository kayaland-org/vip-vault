// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "../libraries/UniV3PMExtends.sol";
import "../libraries/UniV3SwapExtends.sol";
import "../libraries/ERC20Extends.sol";

contract MockUniV3Extends {

    using Path for bytes;
    using UniV3SwapExtends for mapping(address => mapping(address => bytes));

    mapping(address => mapping(address => bytes)) public swapRoute;

    event Swap(uint256 amountIn, uint256 amountOut);

    function settingSwapRoute(bytes memory path) external {
        require(path.valid(), 'MockUniV3PeripheryExtends.settingSwapRoute: path is not valid');
        address fromToken = path.getFirstAddress();
        address toToken = path.getLastAddress();
        swapRoute[fromToken][toToken] = path;
    }

    function estimateAmountOut(
        address from,
        address to,
        uint256 amountIn
    ) external view returns (uint256){
        return swapRoute.estimateAmountOut(from, to, amountIn);
    }

    function estimateAmountIn(
        address from,
        address to,
        uint256 amountOut
    ) external view returns (uint256){
        return swapRoute.estimateAmountIn(from, to, amountOut);
    }

    function exactInput(
        address from,
        address to,
        uint256 amountIn,
        address recipient,
        uint256 amountOutMinimum
    ) external returns (uint256){
        ERC20Extends.safeApprove(from, address( UniV3SwapExtends.SRT), type(uint256).max);
        uint256 amountOut = swapRoute.exactInput(from, to, amountIn, recipient, amountOutMinimum);
        emit Swap(amountIn, amountOut);
        return amountOut;
    }

    function exactOutput(
        address from,
        address to,
        address recipient,
        uint256 amountOut,
        uint256 amountInMaximum
    ) external returns (uint256){
        ERC20Extends.safeApprove(from, address( UniV3SwapExtends.SRT), type(uint256).max);
        uint256 amountIn = swapRoute.exactOutput(from, to, recipient, amountOut, amountInMaximum);
        emit Swap(amountIn, amountOut);
        return amountIn;
    }

    function getAmountsForLiquidity(
        address token0,
        address token1,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) public view returns (uint256 amount0, uint256 amount1) {
        return UniV3PMExtends.getAmountsForLiquidity(
            token0, token1, fee, tickLower, tickUpper, liquidity
        );
    }

    function getFeesForLiquidity(uint256 tokenId) public view returns (uint256 fee0, uint256 fee1) {
        return UniV3PMExtends.getFeesForLiquidity(tokenId);
    }

}
