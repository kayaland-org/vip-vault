// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../interfaces/IVault.sol";

contract MockAssetManager {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public ioToken;

    constructor(address _ioToken) {
        ioToken = IERC20(_ioToken);
    }

    function assets() public view returns (uint256){
        return ioToken.balanceOf(address(this));
    }

    function withdraw(address to, uint256 amount, uint256 scale) external {
        _withdraw(to,amount,scale);
    }

    function withdrawOfUnderlying(address to, uint256 scale) external {
        _withdraw(to,ioToken.balanceOf(address(this)),scale);
    }

    function _withdraw(address to, uint256 amount, uint256 scale)internal{
        uint256 balance=ioToken.balanceOf(address(this));
        if(balance<amount){
            amount=balance;
        }
        amount=balance.mul(scale).div(1e18);
        ioToken.safeTransfer(to, amount);
    }

}
