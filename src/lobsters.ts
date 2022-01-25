import { Lobster } from "../generated/schema"
import { Transfer } from "../generated/Lobsters/LobstersNFT"
import { log, store } from "@graphprotocol/graph-ts";
import { ZERO_ADDRESS } from "./constants";

export function handleTransfer(event: Transfer): void {
    let from = event.params.from.toHexString();
    let to = event.params.to.toHexString();
    let tokenId = event.params.tokenId;

    if(from != ZERO_ADDRESS) {
        let fromLobster = Lobster.load(from);

        if(fromLobster == null) {
            log.critical("Lobster magically appeared", []);
            return;
        }

        let tokens = fromLobster.tokens;
        let index = tokens.indexOf(tokenId);
        if(index == -1) {
            log.critical("Token magically disappered", []);
            return;
        }
        tokens.splice(index, 1);
        fromLobster.tokens = tokens;
        fromLobster.save();
        
        if(tokens.length == 0) {
            store.remove("Lobster", from);
        }
    }

    if(to != ZERO_ADDRESS) {
        let toLobster = Lobster.load(to);

        if(toLobster == null) {
            toLobster = new Lobster(to);
            toLobster.address = to;
            toLobster.tokens = [];
        }

        let tokens = toLobster.tokens;
        tokens.push(tokenId);
        toLobster.tokens = tokens;
        toLobster.save();
    }
}