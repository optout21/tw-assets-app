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

    const [contrResNum, contrResMsg, contrFix] = checkTokenInputContract(tokenInput);
    if (contrFix) {
        if (!fixed) { fixed = tokenInput.clone(); }
        fixed.contract = contrFix;
    }
    res.push({res: contrResNum, msg: contrResMsg});

    (await checkTokenInputLogoInternal(tokenInput, imgDimsCalc)).forEach(r => res.push({res: r[0], msg: r[1]}));

    const [webResNum, webResMsg, webFix] = await checkTokenInputWebsite(tokenInput);
    if (webFix) {
        if (!fixed) { fixed = tokenInput.clone(); }
        fixed.website = webFix;
    }
    res.push({res: webResNum, msg: webResMsg});

    const [explResNum, explResMsg, explFix] = await checkTokenInputExplorer(tokenInput);
    if (explFix) {
        if (!fixed) { fixed = tokenInput.clone(); }
        fixed.explorerUrl = explFix;
    }
    res.push({res: explResNum, msg: explResMsg});

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

export function checkTokenInputContract(tokenInput: TokenInput): [number, string, string] {
    if (!tokenInput.contract) {
        return [2, "Contract/ID cannot be empty", null];
    }
    if (tokenInput.type.toLowerCase() === "erc20" || tokenInput.type.toLowerCase() === "bep20") {
        if (!isEthereumAddress(tokenInput.contract)) {
            return [2, `Contract is not a valid Ethereum address!`, null];
        }
        const inChecksum = toChecksum(tokenInput.contract);
        if (inChecksum !== tokenInput.contract) {
            return [2, `Contract is not in checksum format, should be ${inChecksum}`, inChecksum];
        }
    }
    return [0, `Contract/ID is OK`, null];
}

export async function checkTokenInputWebsite(tokenInput: TokenInput): Promise<[number, string, string]> {
    if (!tokenInput.website) {
        return [2, "Website cannot be empty", null];
    }
    var website = tokenInput.website;
    // should start with http
    const prefix = 'https://';
    if (!website.startsWith(prefix.substring(0, website.length))) {
        const fixed = prefix + website;
        return [2, `Website should start with '${prefix}', ${website}`, fixed];
    }
    try {
        const result = await fetch(website);
        if (result.status == 404) {
            return [2, `Website does not exist, status ${result.status}, url ${website}`, null];
        }
        if (result.status != 200) {
            return [1, `Could not check website availability, status ${result.status}, url ${website}`, null];
        }
    } catch (error) {
        // may be CORS, treat only as warning
        return [1, `Could not check website availability, error ${error}, url ${website}`, null];
    }
    return [0, `Website OK`, null];
}

export async function checkTokenInputExplorer(tokenInput: TokenInput): Promise<[number, string, string]> {
    if (!tokenInput.explorerUrl) {
        return [2, "Explorer cannot be empty", null];
    }
    const explorer = tokenInput.explorerUrl;
    try {
        const result = await fetch(explorer);
        if (result.status == 404) {
            return [2, `ExplorerUrl does not exist, status ${result.status}, url ${explorer}`, null];
        }
        if (result.status != 200) {
            return [1, `Could not check if ExplorerUrl exists, status ${result.status}, url ${tokenInput.explorerUrl}`, null];
        }
        // check if explorer is what we would think
        const guessedExplorer = explorerUrl(tokenInput.type, tokenInput.contract);
        if (explorer != guessedExplorer) {
            return [1, `Recommended ExplorerUrl is ${guessedExplorer} instead of ${explorer}`, guessedExplorer];
        }
    } catch (error) {
        // may be CORS, treat only as warning
        return [1, `Could not check if ExplorerUrl exists, error ${error}, url ${explorer}`, null];
    }
    return [0, `ExplorerUrl OK`, null];
}

async function checkTokenInputLogoInternal(tokenInput: TokenInput, imgDimsCalc: ImageDimensionsCalculator): Promise<[number, string][]> {
    let res: [number, string][] = [];

    if (!tokenInput.logoStream || tokenInput.logoStream.length < 10) {
        return [[2, "Logo image may not be missing"]];
    }

    if (tokenInput.logoStreamType && tokenInput.logoStreamType.toLowerCase() != "image/png") {
        return [[2, `Logo image must be PNG image (not ${tokenInput.logoStreamType})`]];
    }
    res.push([0, `Logo image type is OK (${tokenInput.logoStreamType})`]);

    if (tokenInput.logoStreamSize > 100000) {
        res.push([2, `Logo image too large, max 100 kB, current ${tokenInput.logoStreamSize / 1000} kB`]);
    } else {
        res.push([0, `Logo image size is OK (${tokenInput.logoStreamSize / 1000} kB)`]);
    }

    try {
        const logoDimension = await imgDimsCalc.get(null, tokenInput.logoStream);
        if (logoDimension.x == 0 && logoDimension.y == 0) {
            res.push([2, `Could not retrieve logo dimensions`]);
        } else if (logoDimension.x > 512 || logoDimension.y > 512) {
            res.push([2, `Logo should be 256x256 pixels, it is too large ${logoDimension.x}x${logoDimension.y}`]);
        } else if (logoDimension.x < 128 || logoDimension.y < 128) {
            res.push([2, `Logo should be 256x256 pixels, it is too small ${logoDimension.x}x${logoDimension.y}`]);
        } else {
            res.push([0, `Logo dimensions OK (${logoDimension.x}x${logoDimension.y})`]);
        }
    } catch (error) {
        res.push([2, `Could not retrieve logo dimensions (${error})`]);
    }

    return res;
}

export async function checkTokenInputLogo(tokenInput: TokenInput, imgDimsCalc: ImageDimensionsCalculator): Promise<[number, string]> {
    const logoRes = await checkTokenInputLogoInternal(tokenInput, imgDimsCalc);
    let res2: { res: number, msg: string }[] = [];
    logoRes.forEach((r) => res2.push({res: r[0], msg: r[1]}));
    const [resnum, resmsg] = AggregateCheckResults(res2);
    return [resnum, resmsg];
}
