const axios = require("axios");
const { ethers } = require("ethers");
const tokens = require("./tokens.json");
const config = require("./config.json");
const { IyVault, IxScream, IxTarot, IxCredit } = require("./interfaces");
const BigNumber = require("bignumber.js");

const provider = new ethers.providers.JsonRpcProvider(config.rpc.url);

const priceUrl = (address) => {
    address = address.toLowerCase();
    return `https://api.coingecko.com/api/v3/coins/fantom/contract/${address}/market_chart/range?vs_currency=usd&from=${config.snapshot.end.timestamp}&to=${config.snapshot.end.timestamp + 60*30}`;
}

const getDecimals = async (address) => {
    for(let token in tokens) {
        if(tokens[token].address.toLowerCase() == address.toLowerCase()) {
            return tokens[token].decimals;
        }
    }
    console.error(`decimals for token ${address} not found`);
    process.exit();
}

const getPrice = async (address, type) => {
    if(type == "direct") {
        const priceData = await axios.get(priceUrl(address));
        const price = priceData.data.prices[0][1];
        if(price) {
            return BigNumber(price);
        }
        return price;
    } else if(type == "yVault") {
        const yVault = new ethers.Contract(address, IyVault(), provider);
        let sharePriceInToken = await yVault.callStatic.pricePerShare({
            blockTag: config.snapshot.end.block
        });
        const tokenDecimals = await getDecimals(address);
        sharePriceInToken = BigNumber(sharePriceInToken.toString()).div(BigNumber(10).pow(tokenDecimals.toString()));
        let token = await yVault.callStatic.token();
        let tokenPrice = await getPrice(token, "direct");
        let sharePrice = sharePriceInToken.times(BigNumber(tokenPrice));
        return sharePrice;
    } else if(type == "xSCREAM") {
        const xScream = new ethers.Contract(address, IxScream(), provider);
        let sharePriceInToken = await xScream.callStatic.getShareValue({
            blockTag: config.snapshot.end.block
        });
        const tokenDecimals = await getDecimals(address);
        sharePriceInToken = BigNumber(sharePriceInToken.toString()).div(BigNumber(10).pow(tokenDecimals.toString()));
        let token = await xScream.callStatic.scream();
        let tokenPrice = await getPrice(token, "direct");
        let sharePrice = sharePriceInToken.times(BigNumber(tokenPrice));
        return sharePrice;
    } else if(type == "xTAROT") {
        const xTarot = new ethers.Contract(address, IxTarot(), provider);
        const SCALER = BigNumber(10).pow(20);
        let sharePriceInToken = await xTarot.callStatic.shareValuedAsUnderlying(SCALER.toString(), {
            blockTag: config.snapshot.end.block
        });
        sharePriceInToken = BigNumber(sharePriceInToken.toString()).div(SCALER);
        let token = await xTarot.callStatic.underlying();
        let tokenPrice = await getPrice(token, "direct");
        let sharePrice = sharePriceInToken.times(BigNumber(tokenPrice));
        return sharePrice;
    } else if(type == "xCREDIT") {
        const xCredit = new ethers.Contract(address, IxCredit(), provider);
        let sharePriceInToken = await xCredit.callStatic.getShareValue({
            blockTag: config.snapshot.end.block
        });
        const tokenDecimals = await getDecimals(address);
        sharePriceInToken = BigNumber(sharePriceInToken.toString()).div(BigNumber(10).pow(tokenDecimals.toString()));
        let token = await xCredit.callStatic.token();
        let tokenPrice = await getPrice(token, "direct");
        let sharePrice = sharePriceInToken.times(BigNumber(tokenPrice));
        return sharePrice;
    } else if(type == "fBEETS") {
        return BigNumber("0.62");
    }
}

module.exports = {
    getPrice,
    getDecimals
}