const axios = require("axios");
const BigNumber = require("bignumber.js");
const config = require("./config.json");
const fs = require("fs");

const query = async (queryString) => {
    const data = JSON.stringify({
        query: queryString
    });

    const reqConfig = {
        method: 'post',
        url: config.subgraph.lobsters,
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

const getLobsterQueryString = (skip) => {
    return `{
        lobsters(first: 1000, skip: ${skip}, where: {
            tokens_not:[]
        }, block: {
            number: ${config.snapshot.lobsters.endBlock}
        }) {
            address
            tokens
        }
    }
    `;
}

const processData = async (data) => {
    const totalLobsters = data.length;
    let totalReward = BigNumber(0);
    const rewardData = {};
    const rewardPerUser = BigNumber(config.snapshot.lobsters.reward).div(totalLobsters).toFixed(0, 1);
    for(let i=0; i < data.length; i++) {
        const address = data[i].address;
        totalReward = totalReward.plus(rewardPerUser);
        rewardData[address] = rewardPerUser;
    }
    console.log("Distributing ", totalReward.toString(), "RDL to", totalLobsters);
    return rewardData;
}

const getLobsters = async () => {
    let skip = 0;
    let isQueryComplete = false;
    const allData = [];

    while(!isQueryComplete) {
        const queryString = getLobsterQueryString(skip);
        const data = (await query(queryString)).lobsters;
        if(data.length == 1000) {
            skip += 1000;
        } else {
            skip += data.length
            isQueryComplete = true
        }
        allData.push(...data);
    }
    const rewardData = await processData(allData);
    fs.writeFileSync("./lobsterRewards.json", JSON.stringify(rewardData, null, 2));
}

getLobsters();