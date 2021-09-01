const {BN, ether, constants, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const ChainHelper = require("../scripts/ChainHelper");
const TestHelper = require("../scripts/TestHelper");

const IERC20 = artifacts.require('@openzeppelin/contracts/token/ERC20/IERC20');
const ProxyPausable = artifacts.require('migrate/ProxyPausable');
const ISmartPool = artifacts.require('migrate/ISmartPool');
const Vault = artifacts.require('Vault');
const MockAssetManager = artifacts.require('mock/MockAssetManager');


contract('Vault', (accounts) => {

    let USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    let WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    let ioToken = USDT;

    let ioTokenInterface;

    before(async () => {
        //test before ready
        ioTokenInterface = await IERC20.at(USDT);
        await TestHelper.convertWeth(new ether('100'));
    });


    describe('Vault V2 Test', async () => {

        let name = 'KF Uniswap Liquidity Vault';
        let symbol = 'KFUNLF';

        let vault;
        let mockAM;

        before(async () => {
            vault = await Vault.new(name, symbol);
            mockAM = await MockAssetManager.new(ioToken);
            await ioTokenInterface.approve(vault.address, 0, {from: accounts[1]});
            await ioTokenInterface.approve(vault.address, new ether('100'), {from: accounts[1]});
        });

        it('Call bind should work', async () => {
            await expectRevert(vault.bind(ioToken, mockAM.address, {from: accounts[1]}), 'GovIdentity.onlyGovernance: !governance');
            await vault.bind(ioToken, mockAM.address);
            assert.equal(await vault.ioToken(), ioToken, 'ioToken fail');
            assert.equal(await vault.AM(), mockAM.address, 'PM fail');
            // await expectRevert(vault.bind(ioToken, mockAM.address), 'Vault.bind: already bind');
        });

        it('Call setCap should work', async () => {
            let preCap = new ether('1');
            await expectRevert(vault.setCap(preCap, {from: accounts[1]}),
                'GovIdentity.onlyAdminOrGovernance: !governance and !admin');
            let tx = await vault.setCap(preCap);
            let cap = await vault.getCap();
            assert.equal(cap.toString(), preCap.toString(), 'cap fail');
            expectEvent(tx, 'CapChanged', {setter: accounts[0], oldCap: new BN('0'), newCap: preCap});
        });

        it('Call setFee should work', async () => {
            await expectRevert(vault.setFee(0, 1, 1000, 0, {from: accounts[1]}),
                'GovIdentity.onlyAdminOrGovernance: !governance and !admin');
            await expectRevert(vault.setFee(0, 1001, 1000, 0), 'BasicVault.setFee: ratio<=denominator');
            await vault.setFee(0, 1, 1000, 0);
            await vault.setFee(1, 2, 1000, 0);
            await vault.setFee(2, 2, 100, 0);
            let fee4Before = await vault.getFee(3);
            let tx4 = await vault.setFee(3, 20, 100, 0);
            await vault.setFee(4, 5, 10000, 0);
            let fee4After = await vault.getFee(3);
            assert.equal(fee4After.ratio.toString(), '20', 'ratio fail');
            assert.equal(fee4After.denominator.toString(), '100', 'denominator fail');
            assert.equal(fee4After.lastTimestamp > 0, true, 'lastTimestamp fail');
            expectEvent(tx4, 'FeeChanged', {
                setter: accounts[0], oldRatio: fee4Before.ratio, oldDenominator: fee4Before.denominator,
                newRatio: fee4After.ratio, newDenominator: fee4After.denominator
            });
            // await expectRevert(vault.setFee(0, 1, 1000, 0), 'BasicVault.setFee: already set fee');
        });

        describe('Vault V2 Test Join/Exit', async () => {

            let vaultTotalSupplyBefore;
            let expectJXFee;
            let expectPFee;
            let mFeeSetting;
            let tx;
            let userVaultBal0Before;
            let userVaultBal1Before;
            let globalNetValueBefore;
            let userNetValue0Before;
            let userNetValue1Before;

            beforeEach(async () => {
                userVaultBal0Before = await vault.balanceOf(accounts[0]);
                userVaultBal1Before = await vault.balanceOf(accounts[1]);
                mFeeSetting = await vault.getFee(2);
                vaultTotalSupplyBefore = await vault.totalSupply();
                // console.log('vaultTotalSupplyBefore:'+vaultTotalSupplyBefore);
                // let assets=await vault.assets();
                // console.log('assets:'+assets);

                //change netValue
                if (vaultTotalSupplyBefore != 0) {
                    await TestHelper.swapExactInput(WETH, USDT, 3000, new ether('1'), accounts[0]);
                    let depAmount = new BN(10e6);
                    await ioTokenInterface.transfer(mockAM.address, depAmount);
                }

                globalNetValueBefore = await vault.globalNetValue();
                // console.log('globalNetValueBefore:'+globalNetValueBefore);
                userNetValue0Before = await vault.accountNetValue(accounts[0]);
                // console.log('userNetValue0Before:'+userNetValue0Before);
                userNetValue1Before = await vault.accountNetValue(accounts[1]);
                // console.log('userNetValue1Before:'+userNetValue1Before);
            });

            it('Call joinPool should work', async () => {
                await TestHelper.swapExactInput(WETH, USDT, 3000, new ether('1'), accounts[1]);
                let uBalOfPMBefore = await ioTokenInterface.balanceOf(mockAM.address);
                let useAmount = await ioTokenInterface.balanceOf(accounts[1]);
                tx = await vault.joinPool(useAmount, {from: accounts[1]});
                let vaultBalAfter = await vault.balanceOf(accounts[1]);
                let uBalOfPMAfter = await ioTokenInterface.balanceOf(mockAM.address);
                assert.equal(useAmount.toString(), uBalOfPMAfter.sub(uBalOfPMBefore).toString(), 'uBalOfPMAfter fail');
                expectEvent(tx, 'PoolJoined', {
                    investor: accounts[1],
                    amount: vaultBalAfter.sub(userVaultBal1Before)
                });
                let netValue = await vault.accountNetValue(accounts[1]);
                assert.equal(netValue.toString(), new ether('1').toString(), 'netValue fail');
                expectJXFee = await TestHelper.calcRatioFee(vault, 0, useAmount);
            });

            it('Call exitPool should work', async () => {
                let vaultAmount = userVaultBal1Before.div(new BN(2));
                expectJXFee = await TestHelper.calcRatioFee(vault, 1, vaultAmount);
                let surplus1 = userVaultBal1Before.sub(expectJXFee);
                let expectPFee = await TestHelper.calcPerformanceFee(vault, surplus1, userNetValue1Before, globalNetValueBefore);
                let surplus2 = surplus1.sub(expectPFee);
                let actualExit = surplus2 > vaultAmount ? vaultAmount.sub(expectJXFee) : surplus2;
                tx = await vault.exitPool(vaultAmount, {from: accounts[1]});
                expectEvent(tx, 'PoolExited', {
                    investor: accounts[1],
                    amount: actualExit
                });
                let netValue = await vault.accountNetValue(accounts[1]);
                assert.equal(netValue.toString(), globalNetValueBefore.toString(), 'netValue fail');
            });

            it('Call exitPoolOfUnderlying should work', async () => {
                let vaultAmount=userVaultBal1Before;
                expectJXFee = await TestHelper.calcRatioFee(vault, 1, userVaultBal1Before);
                let surplus1 = userVaultBal1Before.sub(expectJXFee);
                let expectPFee = await TestHelper.calcPerformanceFee(vault, surplus1, userNetValue1Before, globalNetValueBefore);
                let surplus2 = surplus1.sub(expectPFee);
                let actualExit = surplus2 > vaultAmount ? vaultAmount.sub(expectJXFee) : surplus2;
                tx = await vault.exitPoolOfUnderlying(vaultAmount, {from: accounts[1]});
                expectEvent(tx, 'PoolExited', {
                    investor: accounts[1],
                    amount: actualExit
                });
                let netValue = await vault.accountNetValue(accounts[1]);
                assert.equal(netValue.toString(), '0', 'netValue fail');
            });

            afterEach(async () => {
                // console.log('expectJXFee:'+expectJXFee);
                let userVaultBal0After = await vault.balanceOf(accounts[0]);
                let blockTime = await ChainHelper.getBlockTime(tx.receipt.blockNumber);
                let expectMFee = await TestHelper.calcManagementFee(vault, vaultTotalSupplyBefore, mFeeSetting.lastTimestamp, blockTime);
                // console.log('expectMFee:'+expectMFee);
                expectPFee = await TestHelper.calcPerformanceFee(vault, userVaultBal1Before.sub(expectJXFee), userNetValue1Before, globalNetValueBefore);
                // console.log('expectPFee:'+expectPFee);
                // assert.equal(expectJXFee.add(expectMFee).add(expectPFee).toString(), userVaultBal0After.sub(userVaultBal0Before).toString(), 'take fee fail');
            });

        });
    });

    // describe('Vault V2 Test Upgrade', async () => {
    //
    //     //KF Uniswap Liquidity Vault
    //     let oldVault = '0x2Ac64f23D5546248F54c48F8E4BCAA94b32De708';
    //     let oldImpl = "0xbb927Ac36050a29F75C57cEDC2C22f5578bF1e87";
    //     let oldHasVaultAccount = '0x8f229613A60FaE024E09172Fb4fD70Df8abDCfda';
    //
    //     let name_before;
    //     let symbol_before;
    //     let decimals_before;
    //     let totalSupply_before;
    //     let balanceOf_before;
    //     let governance_before;
    //     let strategist_before;
    //     let rewards_before;
    //     let cap_before;
    //     let fee0_before;
    //     let fee1_before;
    //     let fee2_before;
    //     let fee3_before;
    //     let net_before;
    //     let token_before;
    //
    //     before(async () => {
    //
    //         let vaultProxy = await ProxyPausable.at(oldVault);
    //         let proxyOwner=await vaultProxy.getProxyOwner();
    //         await vaultProxy.setImplementation(oldImpl, {from: proxyOwner});
    //
    //         let oldVaultLogic = await ISmartPool.at(oldVault);
    //         name_before = await oldVaultLogic.name();
    //         symbol_before = await oldVaultLogic.symbol();
    //         decimals_before = await oldVaultLogic.decimals();
    //         totalSupply_before = await oldVaultLogic.totalSupply();
    //         balanceOf_before = await oldVaultLogic.balanceOf(oldHasVaultAccount);
    //         governance_before = await oldVaultLogic.getGovernance();
    //         strategist_before = await oldVaultLogic.getStrategist();
    //         rewards_before = await oldVaultLogic.getRewards();
    //         cap_before = await oldVaultLogic.getCap();
    //         fee0_before = await oldVaultLogic.getFee(0);
    //         fee1_before = await oldVaultLogic.getFee(1);
    //         fee2_before = await oldVaultLogic.getFee(2);
    //         fee3_before = await oldVaultLogic.getFee(3);
    //         net_before = await oldVaultLogic.getNet(oldHasVaultAccount);
    //         token_before=await oldVaultLogic.token();
    //     });
    //
    //     it('Call bind should work', async () => {
    //         let vaultProxy = await ProxyPausable.at(oldVault);
    //         let proxyOwner=await vaultProxy.getProxyOwner();
    //         let vault = await Vault.new('A', 'B');
    //         await vaultProxy.setImplementation(vault.address, {from: proxyOwner});
    //         let mockAM = await MockAssetManager.new(oldVault);
    //         let newVaultLogic = await Vault.at(oldVault);
    //
    //         let ioTokenBefore=await newVaultLogic.ioToken();
    //         if(ioTokenBefore!=ioToken){
    //             await expectRevert(vault.bind(ioToken, mockAM.address,{from:accounts[1]}),'GovIdentity.onlyGovernance: !governance');
    //             await newVaultLogic.bind(ioToken, mockAM.address,{from: proxyOwner});
    //             assert.equal(await newVaultLogic.ioToken(), ioToken, 'ioToken fail');
    //             assert.equal(await newVaultLogic.AM(), mockAM.address, 'PM fail');
    //         }
    //         await expectRevert(newVaultLogic.bind(ioToken, mockAM.address,{from: proxyOwner}),'Vault.bind: already bind');
    //     });
    //
    //     after(async () => {
    //         let newVaultLogic = await Vault.at(oldVault);
    //         let name_after = await newVaultLogic.name();
    //         // console.log("name:" + name_after);
    //         assert.equal(name_before, name_after, 'Check name fail');
    //         let symbol_after = await newVaultLogic.symbol();
    //         // console.log("symbol:" + symbol_after);
    //         assert.equal(symbol_before, symbol_after, 'Check symbol fail');
    //         let decimals_after = await newVaultLogic.decimals();
    //         // console.log("decimals:" + decimals_after);
    //         assert.equal(decimals_before.toString(), decimals_after.toString(), 'decimals fail');
    //         let totalSupply_after = await newVaultLogic.totalSupply();
    //         // console.log("totalSupply:" + totalSupply_after);
    //         assert.equal(totalSupply_before.toString(), totalSupply_after.toString(), 'totalSupply fail');
    //         let balanceOf_after = await newVaultLogic.balanceOf(oldHasVaultAccount);
    //         // console.log("balanceOf:" + balanceOf_after);
    //         assert.equal(balanceOf_before.toString(), balanceOf_after.toString(), 'balanceOf fail');
    //         let governance_after = await newVaultLogic.getGovernance();
    //         // console.log("governance:" + governance_after);
    //         assert.equal(governance_before.toString(), governance_after.toString(), 'governance fail');
    //         let strategist_after = await newVaultLogic.getStrategist();
    //         // console.log("strategist:" + strategist_after);
    //         assert.equal(strategist_before.toString(), strategist_after.toString(), 'strategist fail');
    //         let rewards_after = await newVaultLogic.getRewards();
    //         // console.log("rewards:" + rewards_after);
    //         assert.equal(rewards_before.toString(), rewards_after.toString(), 'rewards fail');
    //         let cap_after = await newVaultLogic.getCap();
    //         // console.log("cap:" + cap_after);
    //         assert.equal(cap_before.toString(), cap_after.toString(), 'cap fail');
    //         let fee0_after = await newVaultLogic.getFee(0);
    //         // console.log("fee0:" + fee0_after);
    //         assert.equal(fee0_before.toString(), fee0_after.toString(), 'fee0 fail');
    //         let fee1_after = await newVaultLogic.getFee(1);
    //         // console.log("fee1:" + fee1_after);
    //         assert.equal(fee1_before.toString(), fee1_after.toString(), 'fee1 fail');
    //         let fee2_after = await newVaultLogic.getFee(2);
    //         // console.log("fee2:" + fee2_after);
    //         assert.equal(fee2_before.toString(), fee2_after.toString(), 'fee2 fail');
    //         let fee3_after = await newVaultLogic.getFee(3);
    //         // console.log("fee3:" + fee3_after);
    //         assert.equal(fee3_before.toString(), fee3_after.toString(), 'fee3 fail');
    //         let net_after = await newVaultLogic.accountNetValue(oldHasVaultAccount);
    //         // console.log("net:" + net_after);
    //         assert.equal(net_before.toString(), net_after.toString(), 'net fail');
    //         let token_after = await newVaultLogic.ioToken();
    //     });
    // });

});
