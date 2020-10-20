import {
    TokenInfo,
    normalizeType,
    ImageDimensionsCalculator,
    explorerUrl,
    AggregateCheckResults,
    getTokenCirculation,
    checkHoldersLimit
} from "./tokenInfo";
import { isEthereumAddress, toChecksum } from "./eth-address";

/// Class for entering input for a token
export class TokenInput {
    name: string = "";
    type: string = "erc20";
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
// returns:
// - result: 0 for all OK, 1 for at least on warning, 2 for at least on error
// - a multi-line string with the detailed results
// - fixed version if can be auto-fixed
export async function checkTokenInput(tokenInput: TokenInput, imgDimsCalc: ImageDimensionsCalculator): Promise<[number, string, TokenInput | null]> {
    let res: { res: number, msg: string }[] = [];
    let fixed: TokenInput | null = null;

    if (!tokenInput.name) {
        res.push({ res: 2, msg: "Name cannot be empty" });
    } else {
        res.push({ res: 0, msg: "Name is set" });
    }

    if (!tokenInput.type || !normalizeType(tokenInput.type)) {
        res.push({ res: 2, msg: `Invalid token type ${tokenInput.type}` });
    } else {
        res.push({ res: 0, msg: `Token type OK (${tokenInput.type})` });
    }

    const [contrRes, contrFix] = checkTokenInputContract(tokenInput);
    if (contrFix) {
        if (!fixed) { fixed = tokenInput.clone(); }
        fixed.contract = contrFix;
    }
    res.push(contrRes);

    (await checkTokenInputLogo(tokenInput, imgDimsCalc)).forEach(r => res.push(r));

    if (!tokenInput.website) {
        res.push({ res: 2, msg: "Website cannot be empty" });
        try {
            const result = await fetch(tokenInput.website);
            if (result.status != 200) {
                res.push({ res: 2, msg: `Website does not exist, status ${result.status}, url ${tokenInput.website}` });
            } else {
                res.push({ res: 0, msg: `Website OK` });
            }
        } catch (error) {
            res.push({ res: 2, msg: `Website does not exist, error ${error}, url ${tokenInput.website}` });
        }
    }

    if (!tokenInput.explorerUrl) {
        res.push({ res: 2, msg: "Explorer cannot be empty" });
    } else {
        try {
            const result = await fetch(tokenInput.explorerUrl);
            if (result.status != 200) {
                res.push({ res: 2, msg: `ExplorerUrl does not exist, status ${result.status}, url ${tokenInput.explorerUrl}` });
            } else {
                // check if explorer is what we would think
                const guessedExplorer = explorerUrl(tokenInput.type, tokenInput.contract);
                if (tokenInput.explorerUrl != guessedExplorer) {
                    res.push({ res: 1, msg: `Recommended ExplorerUrl is ${guessedExplorer} instead of ${tokenInput.explorerUrl}` });
                    if (!fixed) { fixed = tokenInput.clone(); }
                    fixed.explorerUrl = guessedExplorer;
                } else {
                    res.push({ res: 0, msg: `ExplorerUrl OK` });
                }
            }
        } catch (error) {
            res.push({ res: 2, msg: `ExplorerUrl does not exist, error ${error}, url ${tokenInput.explorerUrl}` });
        }
    }

    if (!tokenInput.description) {
        res.push({ res: 2, msg: "Short description cannot be empty" });
    } else {
        res.push({ res: 0, msg: "Short description is present" });
    }

    // circulation
    const holders = await getTokenCirculation(tokenInput.type, tokenInput.explorerUrl, tokenInput.contract);
    res.push(checkHoldersLimit(holders));

    const [resnum, resmsg] = AggregateCheckResults(res);
    return [resnum, resmsg, fixed];
}

function checkTokenInputContract(tokenInput: TokenInput): [{ res: number, msg: string }, string] {
    if (!tokenInput.contract) {
        return [{ res: 2, msg: "Contract/ID cannot be empty" }, null];
    }
    if (tokenInput.type.toLowerCase() === "erc20" || tokenInput.type.toLowerCase() === "bep20") {
        if (!isEthereumAddress(tokenInput.contract)) {
            return [{ res: 2, msg: `Contract is not a valid Ethereum address!` }, null];
        }
        const inChecksum = toChecksum(tokenInput.contract);
        if (inChecksum !== tokenInput.contract) {
            return [{ res: 2, msg: `Contract is not in checksum format, should be ${inChecksum}` }, inChecksum];
        }
    }
    return [{ res: 0, msg: `Contract/ID is OK` }, null];
}

async function checkTokenInputLogo(tokenInput: TokenInput, imgDimsCalc: ImageDimensionsCalculator): Promise<{ res: number, msg: string }[]> {
    let res: { res: number, msg: string }[] = [];

    if (!tokenInput.logoStream || tokenInput.logoStream.length < 10) {
        return [{ res: 2, msg: "Logo image may not be missing" }];
    }

    if (tokenInput.logoStreamType && tokenInput.logoStreamType.toLowerCase() != "image/png") {
        return [{ res: 2, msg: `Logo image must be PNG image (not ${tokenInput.logoStreamType})` }];
    }
    res.push({ res: 0, msg: `Logo image type is OK (${tokenInput.logoStreamType})` });

    if (tokenInput.logoStreamSize > 100000) {
        res.push({ res: 2, msg: `Logo image too large, max 100 kB, current ${tokenInput.logoStreamSize / 1000} kB` });
    } else {
        res.push({ res: 0, msg: `Logo image size is OK (${tokenInput.logoStreamSize / 1000} kB)` });
    }

    try {
        const logoDimension = await imgDimsCalc.get(null, tokenInput.logoStream);
        if (logoDimension.x == 0 && logoDimension.y == 0) {
            res.push({ res: 2, msg: `Could not retrieve logo dimensions` });
        } else if (logoDimension.x > 512 || logoDimension.y > 512) {
            res.push({ res: 2, msg: `Logo dimensions too large ${logoDimension.x}x${logoDimension.y}` });
        } else if (logoDimension.x < 64 || logoDimension.y < 64) {
            res.push({ res: 2, msg: `Logo dimensions too small ${logoDimension.x}x${logoDimension.y}` });
        } else {
            res.push({ res: 0, msg: `Logo dimensions OK (${logoDimension.x}x${logoDimension.y})` });
        }
    } catch (error) {
        res.push({ res: 2, msg: `Could not retrieve logo dimensions (${error})` });
    }

    return res;
}
