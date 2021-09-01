const {BN, ether, constants, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const Path = require("../scripts/Path");

const IERC20 = artifacts.require('@openzeppelin/contracts/token/ERC20/IERC20');
const IWETH = artifacts.require('interfaces/weth/IWETH');
const INonfungiblePositionManager = artifacts.require('interfaces/uniswap-v3/INonfungiblePositionManager');

const UniV3PMExtends = artifacts.require('libraries/UniV3PMExtends');
const UniV3SwapExtends = artifacts.require('libraries/UniV3SwapExtends');
const MockUniV3Extends = artifacts.require('mock/MockUniV3Extends');

contract('MockUniV3Extends', (accounts) => {

    let mockUniV3Extends;
    let pm;


    let positionManager = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';

    let USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    let WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    let WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
    let DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

    let iusdt;
    let iweth;
    let iwbtc;

    before(async () => {
        let uniV3PMExtends = await UniV3PMExtends.new();
        await MockUniV3Extends.link('uniV3PMExtends', uniV3PMExtends.address);
        let uniV3SwapExtends = await UniV3SwapExtends.new();
        await MockUniV3Extends.link('UniV3SwapExtends', uniV3SwapExtends.address);
        mockUniV3Extends = await MockUniV3Extends.new();
        pm = await INonfungiblePositionManager.at(positionManager);
        iusdt = await IERC20.at(USDT);
        iweth = await IWETH.at(WETH);
        iwbtc = await IERC20.at(WBTC);
        let wethAmount = new ether('10');
        await iweth.deposit({value: wethAmount});
        await iweth.transfer(mockUniV3Extends.address, wethAmount);
    });

    describe('MockUniV3Extends.test', async () => {

        it('Call settingSwapPath should work', async () => {
            let paths = [
                [[WETH, WBTC], [3000]],
                [[WBTC, WETH], [3000]],
                [[WETH, USDT], [3000]],
                [[USDT, WETH], [3000]],
                [[USDT, WETH, WBTC], [3000, 3000]],
                [[USDT, WETH, DAI], [3000, 3000]]
            ];
            for (var i = 0; i < paths.length; i++) {
                let ep = Path.encodePath(paths[i][0], paths[i][1]);
                await mockUniV3Extends.settingSwapRoute(ep);
                let sp = await mockUniV3Extends.swapRoute(paths[i][0][0], paths[i][0][paths[i][0].length - 1]);
                assert.equal(ep, sp, 'sp fail');
            }
        });

        it('Call estimateAmountOut should work', async () => {
            let amountOut = await mockUniV3Extends.estimateAmountOut(WETH, WBTC, 0);
            assert.equal(amountOut, 0, 'estimateAmountOut fail');
            let amountIn = await iweth.balanceOf(mockUniV3Extends.address);
            amountOut = await mockUniV3Extends.estimateAmountOut(WETH, WBTC, amountIn);
            assert.equal(amountOut > 0, true, 'estimateAmountOut fail');
            assert.notEqual(amountIn, amountOut, 'estimateAmountOut fail');
        });

        it('Call estimateAmountIn should work', async () => {
            let amountIn = await mockUniV3Extends.estimateAmountIn(WETH, WBTC, 0);
            assert.equal(amountIn, 0, 'estimateAmountIn fail');
            let amountOut = new BN(1e8);
            amountIn = await mockUniV3Extends.estimateAmountIn(WETH, WBTC, amountOut);
            assert.equal(amountIn > 0, true, 'estimateAmountIn fail');
            assert.notEqual(amountIn, amountOut, 'estimateAmountIn fail');
        });

        it('Call exactInput should work', async () => {
            let wethBefore = await iweth.balanceOf(mockUniV3Extends.address);
            let wbtcBefore = await iwbtc.balanceOf(mockUniV3Extends.address);
            let weth_wbtc = await mockUniV3Extends.exactInput(WETH, WBTC, wethBefore, mockUniV3Extends.address, 0);
            let wethAfter0 = await iweth.balanceOf(mockUniV3Extends.address);
            let wbtcAfter0 = await iwbtc.balanceOf(mockUniV3Extends.address);
            expectEvent(weth_wbtc, 'Swap', {
                amountIn: wethBefore.sub(wethAfter0),
                amountOut: wbtcAfter0.sub(wbtcBefore)
            });

            let wbtc_weth = await mockUniV3Extends.exactInput(WBTC, WETH, wbtcAfter0, mockUniV3Extends.address, 0);
            let wethAfter1 = await iweth.balanceOf(mockUniV3Extends.address);
            let wbtcAfter1 = await iwbtc.balanceOf(mockUniV3Extends.address);
            expectEvent(wbtc_weth, 'Swap', {
                amountIn: wbtcAfter0.sub(wbtcAfter1),
                amountOut: wethAfter1.sub(wethAfter0)
            });
        });

        it('Call exactOutput should work', async () => {
            let wethBefore = await iweth.balanceOf(mockUniV3Extends.address);
            let usdtBefore = await iusdt.balanceOf(mockUniV3Extends.address);
            let usdtAmountOut = new BN(100e6);
            let weth_usdt = await mockUniV3Extends.exactOutput(WETH, USDT, mockUniV3Extends.address, usdtAmountOut, wethBefore);
            let wethAfter0 = await iweth.balanceOf(mockUniV3Extends.address);
            let usdtAfter0 = await iusdt.balanceOf(mockUniV3Extends.address);
            assert.equal(usdtAmountOut.toString(), usdtAfter0.sub(usdtBefore), 'usdtAmountOut fail');
            expectEvent(weth_usdt, 'Swap', {
                amountIn: wethBefore.sub(wethAfter0),
                amountOut: usdtAmountOut
            });
            let wethAmountOut = new ether('0.00001');
            let usdt_weth = await mockUniV3Extends.exactOutput(USDT, WETH, mockUniV3Extends.address, wethAmountOut, usdtAfter0);
            let wethAfter1 = await iweth.balanceOf(mockUniV3Extends.address);
            let usdtAfter1 = await iusdt.balanceOf(mockUniV3Extends.address);
            assert.equal(wethAmountOut, wethAfter1.sub(wethAfter0).toString(), 'wethAmountOut fail');
            expectEvent(usdt_weth, 'Swap', {
                amountIn: usdtAfter0.sub(usdtAfter1),
                amountOut: wethAmountOut
            });
        });

        it('Call getAmountsForLiquidity should work', async () => {
            let curTokenId = new BN(116709);
            let positions = await pm.positions(curTokenId);
            let getAmountsForAllLiquidity=await mockUniV3Extends.getAmountsForLiquidity(
                WETH,
                USDT,
                3000,
                -196600,
                -195290,
                new BN('159774882527197840')
            );
            let hasLquidity=positions.liquidity>0;
            let amount0=getAmountsForAllLiquidity.amount0;
            let amount1=getAmountsForAllLiquidity.amount1;
            let hasAmount=amount0>0||amount1>0;
            assert.equal((!hasLquidity&&!hasAmount)||(hasLquidity&&hasAmount),true,'getAmountsForLiquidity fail');
        });

        it('Call getFeesForLiquidity should work', async () => {
            let curTokenId = new BN(116709);
            let positions = await pm.positions(curTokenId);
            let getFeesForLiquidity = await mockUniV3Extends.getFeesForLiquidity(curTokenId);
            let hasLquidity=positions.liquidity>0;
            let fee0=getFeesForLiquidity.fee0;
            let fee1=getFeesForLiquidity.fee1;
            let hasAmount=fee0>0||fee1>0;
            assert.equal((!hasLquidity&&!hasAmount)||(hasLquidity&&hasAmount),true,'getFeesForLiquidity fail');
        });


    });
});
