
async function increaseBlockTime(time){
    await web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time],
        id: 0
    },function () {

    });
    await web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_mine",
        params: [],
        id: 0
    },function () {

    });
}

async function getBlock(blockNumber){
    return await web3.eth.getBlock(blockNumber);
}

async function getBlockTime(blockNumber){
    let block= await web3.eth.getBlock(blockNumber);
    return block.timestamp;
}

module.exports = {
    increaseBlockTime,
    getBlock,
    getBlockTime
};







