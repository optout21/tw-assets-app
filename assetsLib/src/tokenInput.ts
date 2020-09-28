import { TokenInfo, normalizeType } from "./tokenInfo";
import { isEthereumAddress, toChecksum } from "./eth-address";
//import * as image_size from "image-size";

//const getImageDimensions = (path: string) => image_size.imageSize(path);

/// Class for entering input for a token
export class TokenInput {
    name: string = "";
    type: string = "";
    contract: string = "";
    // base64-encoded logo image stream
    logoStream: string = "";
    logoStreamSize: number = 0;
    logoStreamType: string = "";
    website: string = "";
    explorerUrl: string = "";
    description: string = "";

    toTokenInfo() {
        let tokenInfo = new TokenInfo();
        tokenInfo.type = this.type;
        tokenInfo.contract = this.contract;
        tokenInfo.logoUrl = "";
        tokenInfo.logoStream = this.logoStream;
        tokenInfo.logoStreamSize = this.logoStreamSize;
        tokenInfo.logoStreamType = this.logoStreamType;
        tokenInfo.infoUrl = "";
        tokenInfo.info = {
            name: this.name,
            website: this.website,
            short_description: this.description,
            explorer: this.explorerUrl,
        };
        tokenInfo.infoString = JSON.stringify(tokenInfo.info, null, 4);
        return tokenInfo;
    }
}

// Check tokenInput for validity: everything is filled, logo is OK, etc.
// returns error if there is, fixed version if can be auto-fixed
export function checkTokenInput(tokenInput: TokenInput): [string, TokenInput | null] {
    if (!tokenInput.name) {
        return ["Name cannot be empty", null];
    }
    if (!normalizeType(tokenInput.type)) {
        return [`Invalid token type ${tokenInput.type}`, null];
    }
    if (!tokenInput.contract) {
        return ["Contract/ID cannot be empty", null];
    }
    if (!tokenInput.website) {
        return ["Website cannot be empty", null];
    }
    if (!tokenInput.explorerUrl) {
        return ["Explorer cannot be empty", null];
    }
    if (!tokenInput.description) {
        return ["Description cannot be empty", null];
    }
    if (!tokenInput.logoStream || tokenInput.logoStream.length < 10) {
        return ["Logo image may not be missing", null];
    }
    if (tokenInput.logoStreamType && tokenInput.logoStreamType.toLowerCase() != "image/png") {
        return [`Logo image must be PNG image (not ${tokenInput.logoStreamType})`, null];
    }
    if (tokenInput.logoStreamSize > 100000) {
        return [`Logo image too large, max 100 kB, current ${tokenInput.logoStreamSize / 1000} kB`, null];
    }
    if (tokenInput.type.toLowerCase() === "erc20") {
        if (!isEthereumAddress(tokenInput.contract)) {
            return [`Contract is not a valid Ethereum address!`, null];
        }
        const inChecksum = toChecksum(tokenInput.contract);
        if (inChecksum !== tokenInput.contract) {
            let fixed = tokenInput;
            fixed.contract = inChecksum;
            return [`Contract is not in checksum format, should be ${inChecksum}`, fixed];
        }
    }
    //const isize = getImageDimensions("x");//tokenInput.logoStream);
    //alert(isize);

    return ["", null];
}
