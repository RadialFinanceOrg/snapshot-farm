const BigNumber = require("bignumber.js");
const { getBalances } = require("./data");
const { getPrice } = require("./price");
const tokens = require("./tokens.json");
const config = require("./config.json");
const { IVesting } = require("./interfaces");
const fs = require("fs");

const getTokenData = async () => {
    let tokenData = {};
    for(let token in tokens) {
        let price = await getPrice(tokens[token].address, tokens[token].type);
        if(!price) {
            console.log(`Price for token ${token} doesn't exist`);
        }  else {
            console.log(`Price for token ${token} is ${price}`);
            tokenData[tokens[token].poolId] = {
                price,
                decimals: tokens[token].decimals
            };
        }
    }
    return tokenData;
}

const getRewardData = async () => {
    const rewardData = {};
    let totalRewardWeight = BigNumber(0);
    const tokenData = await getTokenData();
    const weights = await getBalances();
    for(let tokenId in weights) {
        const DENOMINATOR = BigNumber(10).pow(tokenData[tokenId].decimals);
        const TOKEN_PRICE = tokenData[tokenId].price;
        const tokenWeights = weights[tokenId];
        const totalTokenWeight = tokenWeights.totalWeightInTokens.div(DENOMINATOR).times(TOKEN_PRICE);
        totalRewardWeight = totalRewardWeight.plus(totalTokenWeight);
        delete tokenWeights.totalWeightInTokens;
        for(let address in tokenWeights) {
            if(!rewardData[address]) {
                rewardData[address] = BigNumber(0);
            }
            const userTokenWeight = BigNumber(tokenWeights[address]).div(DENOMINATOR).times(TOKEN_PRICE)
            rewardData[address] = rewardData[address].plus(userTokenWeight);
        }
    }
    console.log("totalRewardWeight", totalRewardWeight.toString())
    return {rewardData, totalRewardWeight};
}

const getUserRewards = async () => {
    const {rewardData, totalRewardWeight} = await getRewardData();
    const TOTAL_REWARD = BigNumber(config.snapshot.rewards.totalAmount);

    const userRewards = {};
    let totalRewards = BigNumber(0);

    for(let address in rewardData) {
        if(rewardData[address].eq(BigNumber(0))) {
            continue;
        }
        const userReward = rewardData[address].times(TOTAL_REWARD).div(totalRewardWeight).toFixed(0, 1);
        userRewards[address] = userReward;
        totalRewards = totalRewards.plus(userReward);
    }
    fs.writeFileSync("./userRewards.json", JSON.stringify(userRewards, null, 2));
    console.log(totalRewards.toString())
    return userRewards;
}

const createTxData = async (writeToFile) => {
    const userRewards = await getUserRewards();
    const addresses = [];
    const rewards = [];
    for(let address in userRewards) {
        addresses.push(address);
        rewards.push(userRewards[address]);
    }
    if(writeToFile) {
        fs.writeFileSync("./rewards.json", JSON.stringify({addresses, rewards}, null, 2));
    }
    return {
        addresses,
        rewards
    };
}

const allocateRewards = async (vestingContractAddress, adminAddress) => {
    const vestingContract = new ethers.Contract(vestingContractAddress, IVesting());
    vestingContract = vestingContract.attach(adminAddress);
    const txData = await createTxData();
    const tx = await vestingContract.begin(txData.addresses, txData.rewards);
    console.log(`Vesting data submitted in tx ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(receipt);
}

getUserRewards();

module.exports = {
    allocateRewards,
    createTxData
}