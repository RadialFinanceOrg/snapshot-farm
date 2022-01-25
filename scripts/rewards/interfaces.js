const { ethers } = require("ethers");
const FormatTypes = ethers.utils.FormatTypes;

const IVesting = () => {
    const abi = [
        "function begin(address[] vesters, uint192[] amounts)"
    ];
    const interface = new ethers.utils.Interface(abi);
    return interface;
}

const IyVault = () => {
    const abi = [
        "function pricePerShare() returns(uint256)",
        "function token() returns(address)"
    ];
    const interface = new ethers.utils.Interface(abi);
    return interface;
}

const IxScream = () => {
    const abi = [
        "function getShareValue() returns(uint256)",
        "function scream() returns(address)"
    ];
    const interface = new ethers.utils.Interface(abi);
    return interface;
}

const IxTarot = () => {
    const abi = [
        "function shareValuedAsUnderlying(uint256 share) returns(uint256)",
        "function underlying() returns(address)"
    ];
    const interface = new ethers.utils.Interface(abi);
    return interface;
}

const IxCredit = () => {
    const abi = [
        "function getShareValue() returns(uint256)",
        "function token() returns(address)"
    ];
    const interface = new ethers.utils.Interface(abi);
    return interface;
}

module.exports = {
    IVesting,
    IyVault,
    IxScream,
    IxTarot,
    IxCredit
}