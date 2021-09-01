const {BN, ether, constants, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const TestHelper = require("../scripts/TestHelper");
const ChainHelper = require("../scripts/ChainHelper");
const Path = require("../scripts/Path");

const IERC20 = artifacts.require('@openzeppelin/contracts/token/ERC20/IERC20');
const INonfungiblePositionManager = artifacts.require('interfaces/uniswap-v3/INonfungiblePositionManager');
const IUniswapV3Factory = artifacts.require('interfaces/uniswap-v3/IUniswapV3Factory');
const IWETH = artifacts.require('interfaces/weth/IWETH');
const UniV3PMExtends = artifacts.require('libraries/UniV3PMExtends');
const MockStaker = artifacts.require('positions/MockStaker');

contract('MockStaker', (accounts) => {

    let mockStaker;
    let uniV3PM;

    let USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    let WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

    let positionManager = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
    let factory = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
    let pool;


    let iusdt;
    let iweth;

    let tickLower = TestHelper.calcTickLower(1.0001, 2300 * 1e6 / 1e18, 60);
    let tickUpper = TestHelper.calcTickUpper(1.0001, 2720 * 1e6 / 1e18, 60);

    before(async () => {
        //create PM
        let uniV3PMExtends = await UniV3PMExtends.new();
        await MockStaker.link('UniV3PMExtends', uniV3PMExtends.address);
        mockStaker = await MockStaker.new();

        //other
        iusdt = await IERC20.at(USDT);
        iweth = await IWETH.at(WETH);
        uniV3PM = await INonfungiblePositionManager.at(positionManager);
        let iUniswapV3Factory = await IUniswapV3Factory.at(factory);
        pool = await iUniswapV3Factory.getPool(WETH, USDT, 3000);
    });

    async function exactInput(fromToken, toToken, amountIn) {
        let iToToken = await IERC20.at(toToken);
        let toTokenBalBefore = await iToToken.balanceOf(mockStaker.address);
        await expectRevert(mockStaker.exactInput(fromToken, toToken, amountIn, 0, {from: accounts[1]}),
            'UniV3Liquidity.onlyAuthorize: !authorize');
        let tx = await mockStaker.exactInput(fromToken, toToken, amountIn, 0);
        let toTokenBalAfter = await iToToken.balanceOf(mockStaker.address);
        expectEvent(tx, 'Swap', {amountIn: amountIn, amountOut: toTokenBalAfter.sub(toTokenBalBefore)});
    }

    async function exactOutput(fromToken, toToken, amountOut) {
        let iFromToken = await IERC20.at(fromToken);
        let fromTokenBalBefore = await iFromToken.balanceOf(mockStaker.address);
        let iToToken = await IERC20.at(toToken);
        let toTokenBalBefore = await iToToken.balanceOf(mockStaker.address);
        await expectRevert(mockStaker.exactOutput(fromToken, toToken, amountOut, fromTokenBalBefore, {from: accounts[1]}),
            'UniV3Liquidity.onlyAuthorize: !authorize');
        let tx = await mockStaker.exactOutput(fromToken, toToken, amountOut, fromTokenBalBefore);
        let fromTokenBalAfter = await iFromToken.balanceOf(mockStaker.address);
        let toTokenBalAfter = await iToToken.balanceOf(mockStaker.address);
        assert.equal(amountOut.toString(), toTokenBalAfter.sub(toTokenBalBefore).toString(), 'amountOut fail');
        expectEvent(tx, 'Swap', {amountIn: fromTokenBalBefore.sub(fromTokenBalAfter), amountOut: amountOut});
    }

    describe('MockStaker Setting Test', async () => {

        it('Call safeApproveAll should work', async () => {
            await expectRevert(mockStaker.safeApproveAll(USDT, {from: accounts[1]}),
                'GovIdentity.onlyGovernance: !governance');
            await mockStaker.safeApproveAll(USDT);
            await mockStaker.safeApproveAll(WETH);
            await mockStaker.safeApproveStaker(USDT);
            await mockStaker.safeApproveStaker(WETH);
        });

        it('Call settingSwapRoute should work', async () => {
            let weth_usdt_before = Path.encodePath([WETH, USDT], [3000]);
            await expectRevert(mockStaker.settingSwapRoute(weth_usdt_before, {from: accounts[1]}),
                'GovIdentity.onlyAdminOrGovernance: !governance and !admin');
            await mockStaker.settingSwapRoute(weth_usdt_before);
            let weth_usdt_after = await mockStaker.swapRoute(WETH, USDT);
            assert.equal(weth_usdt_before, weth_usdt_after, 'weth_usdt fail');

            let usdt_weth_before = Path.encodePath([USDT, WETH], [3000]);
            await mockStaker.settingSwapRoute(usdt_weth_before);
            let usdt_weth_after = await mockStaker.swapRoute(USDT, WETH);
            assert.equal(usdt_weth_before, usdt_weth_after, 'usdt_weth fail');
        });
        it('Call setTokenLimit should work', async () => {
            await expectRevert(mockStaker.setTokenLimit(accounts[0],WETH,new ether("1000"), {from: accounts[1]}),
                'GovIdentity.onlyAdminOrGovernance: !governance and !admin');
            await mockStaker.setTokenLimit(accounts[0],WETH,new ether("1000"));
            let wethLimit=await mockStaker.tokenLimit(accounts[0],WETH);
            assert.equal(wethLimit.toString(),new ether("1000").toString(),'setTokenLimit fail')
        });
    });

    describe('MockStaker Position Init Test', async () => {

        it('Call exactInput should work', async () => {

            //convert eth->weth
            let wethAmount = new ether('10');
            await iweth.deposit({value: wethAmount});
            await iweth.transfer(mockStaker.address, wethAmount);

            //WETH->USDT
            let iFromToken0 = await IERC20.at(WETH);
            let balance0 = await iFromToken0.balanceOf(mockStaker.address);
            await exactInput(WETH, USDT, balance0);

            //USDT->WETH
            let iFromToken1 = await IERC20.at(USDT);
            let balance1 = await iFromToken1.balanceOf(mockStaker.address);
            await exactInput(USDT, WETH, balance1.div(new BN(2)));
        });

        it('Call exactOutput should work', async () => {
            //convert eth->weth
            let wethAmount = new ether('10');
            await iweth.deposit({value: wethAmount});
            await iweth.transfer(mockStaker.address, wethAmount);

            //WETH->USDT
            await exactOutput(WETH, USDT, new BN(1000e6));

            //USDT->WETH
            await exactOutput(USDT, WETH, new ether('0.1'));
        });

        it('Call mint should work', async () => {
            let amount0Desired = await iweth.balanceOf(mockStaker.address);
            let amount1Desired = await iusdt.balanceOf(mockStaker.address);
            await expectRevert(mockStaker.mint(WETH, USDT, 3000, tickLower, tickUpper, amount0Desired, amount1Desired, {from: accounts[1]}),
                'UniV3Liquidity.onlyAuthorize: !authorize');
            let mint = await mockStaker.mint(WETH, USDT, 3000, tickLower, tickUpper, amount0Desired, amount1Desired);
            expectEvent(mint, 'Mint');
            let checkPos = await mockStaker.checkPos(pool, tickLower, tickUpper);
            let pos = await uniV3PM.positions(checkPos.tokenId);
            assert.equal(pos.liquidity > 0, true, 'liquidity fail');
        });
    });


    describe('MockStaker Staker Test', async () => {

        let staker = "0x1f98407aaB862CdDeF78Ed252D6f557aA5b0f00d";
        let checkPos;
        let incentveKey;
        before(async () => {
            //convert eth->weth
            let wethAmount = new ether('10');
            await iweth.deposit({value: wethAmount});
            await iweth.transfer(mockStaker.address, wethAmount);
            checkPos = await mockStaker.checkPos(pool, tickLower, tickUpper);
            let currentTime = Math.floor(Date.now() / 1000);
            incentveKey = [WETH, pool, currentTime + 600, currentTime + 6000, mockStaker.address];
        });

        it('Call createIncentive should work', async () => {
            await mockStaker.createIncentive(incentveKey[0], incentveKey[1], incentveKey[2], incentveKey[3], 1000000);
            let isStaker = await mockStaker.checkStakers(checkPos.tokenId);
            assert.equal(isStaker, false, 'checkStakers fail');
            let owner = await uniV3PM.ownerOf(checkPos.tokenId);
            assert.equal(mockStaker.address, owner, 'createIncentive fail');
            await ChainHelper.increaseBlockTime(600);
        });

        it('Call stakerNFT should work', async () => {
            let stakerNFT = await mockStaker.stakerNFT(checkPos.tokenId);
            expectEvent(stakerNFT, 'Staker');
            let isStaker = await mockStaker.checkStakers(checkPos.tokenId);
            assert.equal(isStaker, true, 'checkStakers fail');
            let owner = await uniV3PM.ownerOf(checkPos.tokenId);
            assert.equal(staker, owner, 'stakerNFT fail');
        });

        it('Call stakeToken should work', async () => {
            await mockStaker.stakeToken(incentveKey[0], incentveKey[1], incentveKey[2], incentveKey[3], checkPos.tokenId);
            let isStaker = await mockStaker.checkStakers(checkPos.tokenId);
            assert.equal(isStaker, true, 'checkStakers fail');
        });

        it('Call unStakeToken should work', async () => {
            await mockStaker.unStakeToken(incentveKey[0], incentveKey[1], incentveKey[2], incentveKey[3], checkPos.tokenId);
            let isStaker = await mockStaker.checkStakers(checkPos.tokenId);
            assert.equal(isStaker, true, 'checkStakers fail');
        });

        it('Call claimReward should work', async () => {
            await mockStaker.claimReward(USDT);
            let isStaker = await mockStaker.checkStakers(checkPos.tokenId);
            assert.equal(isStaker, true, 'checkStakers fail');
        });

        it('Call withdrawToken should work', async () => {
            let data = web3.eth.abi.encodeParameters([], []);
            let stakerCall = await mockStaker.withdrawToken(checkPos.tokenId, data);
            let owner = await uniV3PM.ownerOf(checkPos.tokenId);
            assert.equal(mockStaker.address, owner, 'withdrawToken fail');
            expectEvent(stakerCall, 'UnStaker');
            let isStaker = await mockStaker.checkStakers(checkPos.tokenId);
            assert.equal(isStaker, false, 'checkStakers fail');
        });

        it('Call endIncentive should work', async () => {
            await ChainHelper.increaseBlockTime(6000);
            await mockStaker.endIncentive(incentveKey[0], incentveKey[1], incentveKey[2], incentveKey[3]);
            let isStaker = await mockStaker.checkStakers(checkPos.tokenId);
            assert.equal(isStaker, false, 'checkStakers fail');
            let owner = await uniV3PM.ownerOf(checkPos.tokenId);
            assert.equal(mockStaker.address, owner, 'createIncentive fail');
        });
    });
});

