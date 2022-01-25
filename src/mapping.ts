import {
  Deposit,
  Withdraw
} from "../generated/MasterChef/MasterChef"
import { Balance, Snapshot } from "../generated/schema"
import { getBalance, getSnapshot } from "./helpers";
import { log, store } from "@graphprotocol/graph-ts";
import { BIGINT_ZERO } from "./constants";

export function handleDeposit(event: Deposit): void {
  let balance: Balance = getBalance(event.params.user, event.params.pid, event.block.timestamp);
  // update balance
  balance.balance = balance.balance.plus(event.params.amount);
  // update end time for last snapshot
  let lastSnapshot = Snapshot.load(balance.latestSnapShotId);
  if(lastSnapshot != null) {
    lastSnapshot.endTime = event.block.timestamp;
    lastSnapshot.save();
  }
  // create latest snapshot
  let latestSnapshot = getSnapshot(event.params.user, event.params.pid, event.transaction.hash.toHexString());
  latestSnapshot.startTime = event.block.timestamp;
  latestSnapshot.balance = balance.balance;
  latestSnapshot.save();
  // add latest snapshot
  let snapshots = balance.snapshots;
  snapshots.push(latestSnapshot.id);
  // update balance with latest snapshot
  balance.snapshots = snapshots;
  balance.latestSnapShotId = latestSnapshot.id;
  balance.save();
}

export function handleWithdraw(event: Withdraw): void {
  if(event.params.amount.equals(BIGINT_ZERO)) {
    return;
  }
  let balance: Balance = getBalance(event.params.user, event.params.pid, event.block.timestamp);
  // update balance
  balance.balance = balance.balance.minus(event.params.amount);
  // update end time for last snapshot
  let lastSnapshot = Snapshot.load(balance.latestSnapShotId);
  if(lastSnapshot != null) {
    lastSnapshot.endTime = event.block.timestamp;
    lastSnapshot.save();
  }
  // remove snapshots which are higher
  let snapshots = balance.snapshots;
  let i = snapshots.length - 1
  for(; i >= 0; i--) {
    let snapshot = Snapshot.load(snapshots[i]);

    if(snapshot == null) {
      continue;
    }

    if(snapshot.balance.gt(balance.balance)) {
      store.remove("Snapshot", snapshots[i]);
      snapshots.splice(i, 1);
    }
  }

  let latestSnapshot = getSnapshot(event.params.user, event.params.pid, event.transaction.hash.toHexString());
  latestSnapshot.startTime = event.block.timestamp;
  latestSnapshot.balance = balance.balance;
  latestSnapshot.save();
  // add latest snapshot
  snapshots.push(latestSnapshot.id);
  // update balance with latest snapshot
  balance.snapshots = snapshots;
  balance.latestSnapShotId = latestSnapshot.id;
  balance.save();
}
