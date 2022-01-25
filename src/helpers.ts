import { BigInt, Address } from "@graphprotocol/graph-ts";

import { Balance, Snapshot } from "../generated/schema";
import { BIGINT_ZERO } from "./constants";

export function getBalance(user: Address, pid: BigInt, timestamp: BigInt): Balance{
    let id = user.toHexString() + pid.toString();
    let balance = Balance.load(id);

    if(balance == null) {
        balance = new Balance(id);
        balance.address = user.toHexString();
        balance.pid = pid;
        balance.balance = BIGINT_ZERO;

        let snapshot = getSnapshot(user, pid, "0x00");
        snapshot.endTime = timestamp;
        snapshot.save();

        balance.snapshots = [snapshot.id];
        balance.latestSnapShotId = snapshot.id;
        balance.save();
    }
    return balance;
}

export function getSnapshot(user: Address, pid: BigInt, txHash: string): Snapshot  {
    let id = user.toHexString() + pid.toHexString() + txHash;
    let snapshot = Snapshot.load(id);

    if(snapshot == null) {
        snapshot = new Snapshot(id);
        snapshot.balance = BIGINT_ZERO;
        snapshot.startTime = BIGINT_ZERO;
        snapshot.save();
    }
    return snapshot;
}