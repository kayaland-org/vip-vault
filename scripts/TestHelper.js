const {BN} = require('@openzeppelin/test-helpers');

const IWETH = artifacts.require('interfaces/weth/IWETH');
const ISwapRouter = artifacts.require('interfaces/uniswap-v3/ISwapRouter');
const Path = require("./Path");

let WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

function calcTickLower(x, y, tp) {
    let log = Math.log(y) / Math.log(x);
    return Math.floor(log / tp) * tp;
}

function calcTickUpper(x, y, tp) {
    let log = Math.log(y) / Math.log(x);
    return Math.ceil(log / tp) * tp;
}

function calcTickPrice(tick, d0, d1) {
    return 1.0001 ** (tick) * 10 ** (d0 - d1);
}

async function calcManagementFee(vault, totalSupply, startTime, endTime) {
    let fee = await vault.getFee(2);
    let denominator = new BN(fee.denominator.toString() === '0' ? 1000 : fee.denominator.toString());
    if (startTime === 0) return 0;
    let diff = new BN(endTime.toString()).sub(new BN(startTime.toString()));
    return totalSupply.mul(diff).mul(new BN(fee.ratio.toString())).div(denominator.mul(new BN('31557600')));
}

async function calcPerformanceFee(vault, balance, oldNet, newNet) {
    if (newNet.toString() === '0') return new BN();
    let diff = newNet > oldNet ? newNet.sub(oldNet) : 0;
    let fee = await vault.getFee(3);
    let denominator = new BN(fee.denominator.toString() === '0' ? 1000 : fee.denominator.toString());
    let cash = diff.mul(balance).mul(new BN(fee.ratio.toString())).div(denominator);
    return cash.div(newNet);
}

async function calcRatioFee(vault, feeType, vaultAmount) {
    let fee = await vault.getFee(feeType);
    let denominator = new BN(fee.denominator.toString() === '0' ? 1000 : fee.denominator.toString());
    let amountRatio = vaultAmount.div(denominator);
    return amountRatio.mul(new BN(fee.ratio.toString()));
}


async function convertWeth(amount) {
    let iweth = await IWETH.at(WETH);
    await iweth.deposit({value: amount});
}

async function swapExactInput(fromToken, toToken, fee, amountIn, to) {
    let srAddress="0xE592427A0AEce92De3Edee1F18E0157C05861564";
    let sr = await ISwapRouter.at(srAddress);
    let ep = Path.encodePath([fromToken, toToken], [fee]);
    let currentTime = Math.floor(Date.now() / 1000);
    let erc20 = await IWETH.at(fromToken);
    await erc20.approve(srAddress,amountIn);
    await sr.exactInput([ep, to,currentTime+1000, amountIn, 0]);
}

module.exports = {
    calcTickLower,
    calcTickUpper,
    calcTickPrice,
    calcManagementFee,
    calcPerformanceFee,
    calcRatioFee,
    convertWeth,
    swapExactInput
};







