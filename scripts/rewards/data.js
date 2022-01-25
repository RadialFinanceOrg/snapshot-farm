const axios = require("axios");
const BigNumber = require("bignumber.js");
const config = require("./config.json");

let rewardWeight = {};
const REWARD_START = parseInt(config.snapshot.start.timestamp);
const REWARD_END = parseInt(config.snapshot.end.timestamp);
const START_EPOCH = 0;
const END_EPOCH = 4;
const EPOCH_INTERVAL = (REWARD_END - REWARD_START + 1)/parseFloat(config.snapshot.rewards.intervals);
const EPOCH_REWARD_WEIGHTS = {
    0: 2.0,
    1: 1.75,
    2: 1.5,
    3: 1.25,
    4: 1.0
};

const query = async (queryString) => {
    const data = JSON.stringify({
        query: queryString
    });

    const reqConfig = {
        method: 'post',
        url: config.subgraph.url,
        headers: { 
            'Content-Type': 'application/json'
        },
        data : data
    };

    const resp = await axios(reqConfig)
    .catch(function (error) {
        logger.error(error);
    });
    return resp.data.data;
}

const getBalanceQueryString = (skip) => {
    return `{
        balances(first: 1000, skip: ${skip}, block: {
            number: ${config.snapshot.end.block}
        }) {
            pid
            address
            balance
            snapshots {
                balance
                startTime
                endTime
            }
        }
    }
    `;
}

const calculateWeight = (start, balance) => {
    const startEpoch = parseInt((start - REWARD_START)/EPOCH_INTERVAL);
    const end = REWARD_END;
    const endEpoch = END_EPOCH;

    let weight = BigNumber(0);

    for(let i=startEpoch; i <= endEpoch; i++) {
        let epochStart = i*EPOCH_INTERVAL + REWARD_START;
        let epochEnd = (i+1)*EPOCH_INTERVAL + REWARD_START - 1;
        if(i == startEpoch) {
            epochStart = start;
        }
        if(i == endEpoch) {
            epochEnd = end;
        }
        const cycleWeight = (epochEnd - epochStart)*EPOCH_REWARD_WEIGHTS[i];
        weight = weight.plus(BigNumber(cycleWeight));
    }
    return weight.times(balance);
}

const processUserPerToken = async (data) => {
    if(!rewardWeight[data.pid]) {
        rewardWeight[data.pid] = {
            totalWeightInTokens: BigNumber(0)
        };
    }

    let addressWeight = BigNumber(0);
    let sortedSnapshots = data.snapshots;

    sortedSnapshots.sort((a, b) => {
        return parseInt(a.startTime) - parseInt(b.startTime)
    });
    data.snapshots = sortedSnapshots;

    for(let i=1; i < data.snapshots.length; i++) {
        let lastSnapshot = data.snapshots[i-1];
        let snapshot = data.snapshots[i];
        const weight = calculateWeight(parseInt(lastSnapshot.endTime), BigNumber(snapshot.balance).minus(lastSnapshot.balance));
        addressWeight = addressWeight.plus(weight);
    }

    rewardWeight[data.pid][data.address] = addressWeight.toString();
    rewardWeight[data.pid].totalWeightInTokens = rewardWeight[data.pid].totalWeightInTokens.plus(addressWeight);
}

const processData = async (data) => {
    for(let i=0; i < data.length; i++) {
        await processUserPerToken(data[i]);
    }
}

const getBalances = async () => {
    let skip = 0;
    let isQueryComplete = false;
    rewardWeight = {};

    while(!isQueryComplete) {
        const queryString = getBalanceQueryString(skip);
        const data = (await query(queryString)).balances;
        if(data.length == 1000) {
            skip += 1000;
        } else {
            isQueryComplete = true
        }
        await processData(data);
    }
    return rewardWeight;
}

module.exports = {
    getBalances
}