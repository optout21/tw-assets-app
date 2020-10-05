import { TokenInfo, normalizeType, ImageDimensionsCalculator } from "./tokenInfo";
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

    clone(): TokenInput {
        let ti2 = new TokenInput();
        ti2.name = this.name;
        ti2.type = this.type;
        ti2.contract = this.contract;
        ti2.logoStream = this.logoStream;
        ti2.logoStreamSize = this.logoStreamSize;
        ti2.logoStreamType = this.logoStreamType;
        ti2.website = this.website;
        ti2.explorerUrl = this.explorerUrl;
        ti2.description = this.description;
        return ti2;
    }
}

// Check tokenInput for validity: everything is filled, logo is OK, etc.
// returns error if there is, fixed version if can be auto-fixed
export async function checkTokenInput(tokenInput: TokenInput, imgDimsCalc: ImageDimensionsCalculator): Promise<[string, TokenInput | null]> {
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
        return ["Short description cannot be empty", null];
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

    try {
        const logoDimension = imgDimsCalc.get(null, tokenInput.logoStream);
        if (logoDimension.x == 0 && logoDimension.y == 0) {
            return [`Could not retrieve logo dimensions`, null];
        } else if (logoDimension.x > 512 || logoDimension.y > 512) {
            return [`Logo dimensions too large ${logoDimension.x}x${logoDimension.y}`, null];
        } else if (logoDimension.x < 64 || logoDimension.y < 64) {
            return [`Logo dimensions too small ${logoDimension.x}x${logoDimension.y}`, null];
        } else {
            //oks.push(`Logo dimensions OK (${logoDimension.x}x${logoDimension.y})`);
        }
    } catch (error) {
        return [`Could not retrieve logo dimensions`, null];
    }

    if (tokenInput.type.toLowerCase() === "erc20") {
        if (!isEthereumAddress(tokenInput.contract)) {
            return [`Contract is not a valid Ethereum address!`, null];
        }
        const inChecksum = toChecksum(tokenInput.contract);
        if (inChecksum !== tokenInput.contract) {
            let fixed = tokenInput.clone();
            fixed.contract = inChecksum;
            return [`Contract is not in checksum format, should be ${inChecksum}`, fixed];
        }
    }
    if (tokenInput.explorerUrl) {
        try {
            const result = await fetch(tokenInput.explorerUrl);
            if (result.status != 200) {
                return [`ExplorerUrl does not exist, status ${result.status}, url ${tokenInput.explorerUrl}`, null];
            }
        } catch (error) {
            return [`ExplorerUrl does not exist, error ${error}, url ${tokenInput.explorerUrl}`, null];
        }
    }
    if (tokenInput.website) {
        try {
            const result = await fetch(tokenInput.website);
            if (result.status != 200) {
                return [`Website does not exist, status ${result.status}, url ${tokenInput.website}`, null];
            }
        } catch (error) {
            return [`Website does not exist, error ${error}, url ${tokenInput.website}`, null];
        }
    }

    return ["", null];
}
