# Vault Introduction

# Vault Libraries
## Kovan
|Function|Address|Desc|
|:-----|:-----|:-----|
| Address|0xB7698b86b3DF067E7F5Bb0076b3B86bd27b1279c| 地址类型功能库 |
| SafeMath|0xfb5de616D50C80B6045EbF9b3F9562380cafC3E1| 计算功能库 |
| SafeERC20|| ERC20安全交易库 |
| EnumerableSet|0x359c04F38Dca0EAb7eAd7F6a59113c04337Ac28D| Set集合类型库
| SafeMathExtends|0x9Adf0EE72644C63A59B7E51864B320258095d8F3| 计算功能扩展库 |
| ERC20Extends|| ERC20交互扩展库 |
| UniV3PMExtends|| UniV3仓位管理库 |
| UniV3SwapExtends|| UniV3交易库 |


# Vault Contracts
|Function|Address|Desc|
|:-----|:-----|:-----|
| BasicVault|0x0| 机枪池基础合约，定义基本功能与属性 |
| Vault|0x0| 机枪池合约，提供申购赎回 |
| UniV3Liquidity|0x0| 向Uniswap V3 提供流动性| 
| UniV3LiquidityStaker|0x0| 向Uniswap V3 提供流动性升级版,增加流动性挖矿功能| 
| AutoLiquidity|0xEdf2818C44C0CAD3B719Bb31c52630AEe967E0B5| 全自动提供流动性| 
| ProxyPausable|| 代理合约| 

> KFUNLF upgrade to 0x75b45aec1253ed80f669136b28c85457ba0b782c



# Vault Develop

## Init
```
npm install
```

## Build
```
truffle compile
```

## Test
```
truffle test --network dev
```