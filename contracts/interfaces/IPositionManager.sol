// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

pragma abicoder v2;
/// @title Position Manager Interface
/// @notice This contract manages the underlying vault asset. Only authrized function calls are allowed. This contract is intended to increase the net worth of the vault.
interface IPositionManager {

    /// @notice Total asset
    /// @dev This function calculates the net worth or AUM
    /// @return Total asset
    function assets() external view returns (uint256);

    /// @notice Check current position
    /// @dev Check the current UniV3 position by pool token ID.
    /// @param token0 Token0 contract address
    /// @param token1 Token1 contract address
    /// @param fee Provider fee rate
    /// @param tickLower Tick lower bound
    /// @param tickUpper Tick upper bound
    /// @return atWork Position status
    /// @return has Check if the position ID exist
    /// @return tokenId Position ID
    function checkPos(
        address token0,
        address token1,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper
    ) external view returns (bool atWork, bool has, uint256 tokenId);


    /// @notice Authorize UniV3 contract to move vault asset
    /// @dev Only allow governance and strategist identities to execute authorized functions to reduce miner fee consumption
    /// @param token Authorized target token
    function safeApproveAll(address token) external;

    /// @notice Multiple functions of the contract can be executed at the same time
    /// @dev Only the governance and strategist identities are allowed to execute multiple function calls, and the execution of multiple functions can ensure the consistency of the execution results
    /// @param data Encode data of multiple execution functions
    /// @return results Execution result
    function multicall(bytes[] calldata data) external returns (bytes[] memory results);

    /// @notice Set asset swap route
    /// @dev Only the governance identity is allowed to set the asset swap path, and the firstToken and lastToken contained in the path will be used as the underlying asset token address by default
    /// @param path Swap path byte code
    function settingSwapRoute(bytes memory path) external;

    /// @notice Set the underlying asset token address
    /// @dev Only allow the governance identity to set the underlying asset token address
    /// @param ts The underlying asset token address array to be added
    function setUnderlyings(address[] memory ts) external;

    /// @notice Delete the underlying asset token address
    /// @dev Only allow the governance identity to delete the underlying asset token address
    /// @param ts The underlying asset token address array to be deleted
    function removeUnderlyings(address[] memory ts) external;

    /// @notice Estimated to obtain the target token amount
    /// @dev Only allow the asset transaction path that has been set to be estimated
    /// @param from Source token address
    /// @param to Target token address
    /// @param amountIn Source token amount
    /// @return amountOut Target token amount
    function estimateAmountOut(
        address from,
        address to,
        uint256 amountIn
    ) external view returns (uint256 amountOut);

    /// @notice Estimate the amount of source tokens that need to be provided
    /// @dev Only allow the governance identity to set the underlying asset token address
    /// @param from Source token address
    /// @param to Target token address
    /// @param amountOut Expect to get the target token amount
    /// @return amountIn Source token amount
    function estimateAmountIn(
        address from,
        address to,
        uint256 amountOut
    ) external view returns (uint256 amountIn);


    /// @notice Swaps `amountIn` of one token for as much as possible of another token 
    /// @dev Initiate a transaction with a known input amount and return the output amount
    /// @param tokenIn Token in address
    /// @param tokenOut Token out address
    /// @param amountIn Token in amount
    /// @param amountOutMinimum Expected to get minimum token out amount
    /// @return amountOut Return token out amount
    function exactInput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external returns (uint256 amountOut);

    /// @notice Swaps as little as possible of one token for `amountOut` of another token
    /// @dev Initiate a transaction with a known output amount and return the input amount
    /// @param tokenIn Token in address
    /// @param tokenOut Token out address
    /// @param amountOut Token out amount
    /// @param amountInMaximum Expect to get the maximum amount of tokens
    /// @return amountIn Return token in amount
    function exactOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 amountInMaximum
    ) external returns (uint256 amountIn);

    /// @notice Create position
    /// @dev Repeated creation of the same position will cause an error, you need to change tickLower Or tickUpper
    /// @param token0 Liquidity pool token 0 contract address
    /// @param token1 Liquidity pool token 1 contract address
    /// @param fee Target liquidity pool rate
    /// @param tickLower Expect to place the lower price boundary of the target liquidity pool
    /// @param tickUpper Expect to place the upper price boundary of the target liquidity pool
    /// @param amount0Desired Desired token 0 amount
    /// @param amount1Desired Desired token 1 amount
    function mint(
        address token0,
        address token1,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0Desired,
        uint256 amount1Desired
    ) external;

    /// @notice Increase liquidity
    /// @dev Use checkPos to check the position ID
    /// @param tokenId Position ID
    /// @param amount0 Desired Desired token 0 amount
    /// @param amount1 Desired Desired token 1 amount
    /// @param amount0Min Minimum token 0 amount
    /// @param amount1Min Minimum token 1 amount
    /// @return liquidity Return the amount of liquidity
    /// @return amount0 Actual token 0 amount being added
    /// @return amount1 Actual token 1 amount being added
    function increaseLiquidity(
        uint256 tokenId,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min
    ) external returns (
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    /// @notice Decrease liquidity
    /// @dev Use checkPos to query the position ID
    /// @param tokenId Position ID
    /// @param liquidity Expected reduction amount of liquidity
    /// @param amount0Min Minimum amount of token 0 to be reduced
    /// @param amount1Min Minimum amount of token 1 to be reduced
    /// @return amount0 Actual amount of token 0 being reduced
    /// @return amount1 Actual amount of token 1 being reduced
    function decreaseLiquidity(
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0Min,
        uint256 amount1Min
    ) external returns (uint256 amount0, uint256 amount1);

    /// @notice Collect position asset
    /// @dev Use checkPos to check the position ID
    /// @param tokenId Position ID
    /// @param amount0Max Maximum amount of token 0 to be collected
    /// @param amount1Max Maximum amount of token 1 to be collected
    /// @return amount0 Actual amount of token 0 being collected
    /// @return amount1 Actual amount of token 1 being collected
    function collect(
        uint256 tokenId,
        uint128 amount0Max,
        uint128 amount1Max
    ) external returns (uint256 amount0, uint256 amount1);
}
