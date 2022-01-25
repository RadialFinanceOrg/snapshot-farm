const BigNumber = require("bignumber.js");
const fs = require("fs");

const userRewardsFile = "./userRewards.json";
const lobsterRewardsFile = "./lobsterRewards.json";

const combineRewards = async () => {
    let rewards = JSON.parse(fs.readFileSync(userRewardsFile));
    let lobsterRewards = JSON.parse(fs.readFileSync(lobsterRewardsFile));

    for(let user in lobsterRewards) {
        if(!rewards[user]) {
            rewards[user] = 0;
        } else {
            console.log(rewards[user])
        }

        rewards[user] = BigNumber(rewards[user]).plus(lobsterRewards[user]);
        console.log(lobsterRewards[user], rewards[user].toString());
    }
    fs.writeFileSync("./UsersForLobsterRewards.json", JSON.stringify(Object.keys(lobsterRewards), null, 2));
    fs.writeFileSync("./Rewards.json", JSON.stringify(rewards, null, 2));
}

combineRewards();