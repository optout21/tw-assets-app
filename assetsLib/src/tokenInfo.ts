import { isEthereumAddress, toChecksum } from "./eth-address";

/// Class holding info of a token
export class TokenInfo {
    type: string = "";
    contract: string = "";
    logoUrl: string = "";
    // the logo contents, in base64.  If set, it is used, if empty, Url is used.
    logoStream: string = "";
    logoStreamSize: number = 0;
    logoStreamType: string = "";
    infoUrl: string = "";
    info: unknown = {};
    infoString: string = "{}";

    explorerUrl(): string {
        return explorerUrl(this.type, this.contract);
    }
}

export function explorerUrl(type: string, contract: string): string {
    if (contract) {
        switch (type.toLowerCase()) {
            case "erc20":
                return `https://etherscan.io/token/${contract}`;
            case "trc10":
                return `https://tronscan.io/#/token/${contract}`;
            case "trc20":
                return `https://tronscan.io/#/token20/${contract}`;
            case "bep2":
                return `https://explorer.binance.org/asset/${contract}`;
            case "bep20":
                return `https://bscscan.com/token/${contract}`;
            case "thundertoken":
                return `https://viewblock.io/thundercore/address/${contract}`;
        }
    }
    return "";
}

export function chainFromType(tokenType: string) {
    switch (tokenType.toLowerCase()) {
        case "erc20":
            return "ethereum";
        case "trc10":
            return "tron";
        case "trc20":
            return "tron";
        case "bep2":
            return "binance";
        case "bep8":
            return "binance";
        case "bep20":
            return "smartchain";
        case "thundertoken":
            return "thundertoken";
        default:
            return "unknown"
    }
}

export function normalizeType(tokenType: string) {
    switch (tokenType.toLowerCase()) {
        case "erc20":
            return "ERC20";
        case "trc10":
            return "TRC10";
        case "trc20":
            return "TRC20";
        case "bep2":
            return "BEP2";
        case "bep8":
            return "BEP8";
        case "bep20":
            return "BEP20";
        default:
            return ""
    }
}

const mainRepoOwner = "trustwallet";
const mainRepoName = "assets";
const mainMasterBranch = "master";

// Construct TokenInfo for an existing token, specified by type and contract.
export async function tokenInfoOfExistingToken(tokenType: string, contract: string, fetchInfoJson: boolean = false): Promise<TokenInfo> {
    return await tokenInfoOfExistingTokenInRepo(tokenType, contract, mainRepoOwner, mainRepoName, mainMasterBranch, fetchInfoJson);
}

// Construct TokenInfo for an existing token, specified by type and contract, possible form another repo (typically from a pull request)
export async function tokenInfoOfExistingTokenInRepo(tokenType: string, contract: string, repoOwner: string, repoName: string, branch: string, fetchInfoJson: boolean = false): Promise<TokenInfo> {
    let ti = new TokenInfo();
    ti.type = normalizeType(tokenType);
    ti.contract = contract;
    const chain = chainFromType(tokenType);
    ti.logoUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/blockchains/${chain}/assets/${ti.contract}/logo.png`;
    ti.infoUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/blockchains/${chain}/assets/${ti.contract}/info.json`;
    
    if (fetchInfoJson) {
        // read info.json
        ti.infoString = "";
        let resp = await fetch(ti.infoUrl);
        if (resp.status == 200) {
            ti.infoString = await resp.text();
            try {
                ti.info = JSON.parse(ti.infoString);
            } catch (error) {
                ti.info = {};
            }
        }
    }

    return ti;
}

// Infer token ID from a logo filename.
// Input: filename, such as "blockchains/ethereum/assets/0x439662426153C4fCB9c6988962FB16475D13d95B/logo.png"
// Output: [type, id], like ["erc20", "0x439662426153C4fCB9c6988962FB16475D13d95B"]
export function tokenIdFromFile(filename: string): [string, string] {
    const types: string[] = ["erc20", "bep2", "bep20", "trc10", "trc20", "thundertoken"];
    let id: [string, string] = ["", ""];
    types.forEach(type => {
        const chain = chainFromType(type);
        const prefix = `blockchains/${chain}/assets/`;
        const suffix = "/logo.png";
        if (filename.startsWith(prefix)) {
            if (filename.endsWith(suffix)) {
                id = [type, filename.substring(prefix.length, filename.length - suffix.length)];
            }
        }
    });
    // special for TRC10/20 -- both have same 'tron' folder
    if (id[0] && id[0] == "trc20" && id[1].startsWith("10")) {
        id[0] = "trc10";
    }
    return id;
}

// Infer token IDs from a logo filenames.
// Input: array with filenames, such as ["blockchains/ethereum/assets/0x439662426153C4fCB9c6988962FB16475D13d95B/logo.png"]
// Output: array of token IDs, [type, id], like [["erc20", "0x439662426153C4fCB9c6988962FB16475D13d95B"]]
export function tokenIdsFromFiles(filenames: string[]): [string, string][] {
    let ids: [string, string][] = [];
    filenames.forEach(file => {
        const [type, id] = tokenIdFromFile(file);
        if (type && id) {
            ids.push([type, id]);
        }
    });
    return ids;
}

export interface ImageDimensionsCalculator {
    get(imageUrl: string, imageStream: string): Promise<{ x: number, y: number }>;
}

// Check tokenInfo for validity: contract is OK, logo is OK, etc.
// returns:
// - result: 0 for all OK, 1 for at least on warning, 2 for at least on error
// - a multi-line string with the detailed results
export async function checkTokenInfo(tokenInfo: TokenInfo, imgDimsCalc: ImageDimensionsCalculator): Promise<[number, string]> {
    let res: { res: number, msg: string }[] = [];

    if (!tokenInfo.type || !normalizeType(tokenInfo.type)) {
        res.push({ res: 2, msg: `Invalid token type ${tokenInfo.type}` });
    } else {
        res.push({ res: 0, msg: `Token type OK (${tokenInfo.type})` });
    }

    res.push(checkTokenInfoContract(tokenInfo));

    (await checkTokenInfoLogo(tokenInfo, imgDimsCalc)).forEach(r => res.push(r));

    if (!tokenInfo.info) {
        res.push({ res: 2, msg: "Info.json must not be missing" });
    } else {
        if (!tokenInfo.info["website"]) {
            res.push({ res: 2, msg: "Website cannot be empty" });
        } else {
            const website = tokenInfo.info["website"];
            try {
                const result = await fetch(website);
                if (result.status != 200) {
                    res.push({ res: 2, msg: `Website does not exist, status ${result.status}, url ${website}` });
                } else {
                    res.push({ res: 0, msg: `Website OK` });
                }
            } catch (error) {
                res.push({ res: 2, msg: `Website does not exist, error ${error}, url ${website}` });
            }
        }

        if (!tokenInfo.info["explorer"]) {
            res.push({ res: 2, msg: "Explorer cannot be empty" });
        } else {
            const explorerUrl = tokenInfo.info["explorer"];
            try {
                const result = await fetch(explorerUrl);
                if (result.status != 200) {
                    res.push({ res: 2, msg: `ExplorerUrl does not exist, status ${result.status}, url ${explorerUrl}` });
                } else {
                    res.push({ res: 0, msg: `Explorer URL OK` });
                }
            } catch (error) {
                res.push({ res: 2, msg: `ExplorerUrl does not exist, error ${error}, url ${explorerUrl}` });
            }
        }

        if (!tokenInfo.info["short_description"]) {
            res.push({ res: 2, msg: "Short description cannot be empty" });
        } else {
            res.push({ res: 0, msg: "Description OK" });
        }
    }

    // circulation
    const holders = await getTokenCirculation(tokenInfo.type, tokenInfo.info["explorer"], tokenInfo.contract);
    res.push(checkHoldersLimit(holders));
    
    return AggregateCheckResults(res);
}

// Aggregate results: max and string
export function AggregateCheckResults(res: { res: number, msg: string }[]): [number, string] {
    let maxres = 0;
    let msg = "";
    res.forEach(r => maxres = Math.max(r.res, maxres));
    // Error first, warnings, OKs
    res.forEach(r => { if (r.res >= 2) { msg += "❌  " + r.msg + "\n"; } });
    res.forEach(r => { if (r.res == 1) { msg += "!  " + r.msg + "\n"; } });
    res.forEach(r => { if (r.res == 0) { msg += "✓  " + r.msg + "\n"; } });
    return [maxres, msg];
}

function checkTokenInfoContract(tokenInfo: TokenInfo): { res: number, msg: string } {
    if (!tokenInfo.contract) {
        return { res: 2, msg: "Contract/ID cannot be empty" };
    }
    if (tokenInfo.type.toLowerCase() === "erc20" || tokenInfo.type.toLowerCase() === "bep20") {
        if (!isEthereumAddress(tokenInfo.contract)) {
            return { res: 2, msg: `Contract is not a valid Ethereum address!` };
        }
        const inChecksum = toChecksum(tokenInfo.contract);
        if (inChecksum !== tokenInfo.contract) {
            return { res: 2, msg: `Contract is not in checksum format, should be ${inChecksum}` };
        }
    }
    return { res: 0, msg: `Contract/ID is OK` };
}

async function checkTokenInfoLogo(tokenInfo: TokenInfo, imgDimsCalc: ImageDimensionsCalculator): Promise<{ res: number, msg: string }[]> {
    let res: { res: number, msg: string }[] = [];

    if (!tokenInfo.logoStream && !tokenInfo.logoUrl) {
        return [{ res: 2, msg: "Logo image may not be missing" }];
    }
    let logoStreamSize = tokenInfo.logoStreamSize;
    let logoStreamType = tokenInfo.logoStreamType;
    if (!tokenInfo.logoStream) {
        try {
            const response = await fetch(tokenInfo.logoUrl);
            if (response.status != 200) {
                return [{ res: 2, msg: `Could not retrieve logo from url ${tokenInfo.logoUrl}, status ${status}` }];
            }
            logoStreamSize = (await response.arrayBuffer()).byteLength;
            logoStreamType = response.headers.get('Content-Type');
        } catch (error) {
            return [{ res: 2, msg: `Could not retrieve logo from url ${tokenInfo.logoUrl}, error ${error}` }];
        }
    }
    if (logoStreamType.toLowerCase() != "image/png") {
        return [{ res: 2, msg: `Logo image must be PNG image (not ${logoStreamType})` }];
    }
    res.push({ res: 0, msg: `Logo image type is OK (${logoStreamType})` });

    if (logoStreamSize > 100000) {
        res.push({ res: 2, msg: `Logo image too large, max 100 kB, current ${logoStreamSize / 1000} kB` });
    } else {
        res.push({ res: 0, msg: `Logo image size is OK (${logoStreamSize / 1000} kB)` });
    }

    try {
        const logoDimension = await imgDimsCalc.get(tokenInfo.logoUrl, tokenInfo.logoStream);
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

export async function getTokenCirculation(tokenType: string, explorer: string, tokenAddress: string) {
    try
    {
        switch (tokenType.toLowerCase()) {
            case 'erc20':
            case 'bep20':
                return await getTokenCirculationEth(tokenType, explorer, tokenAddress);
            default:
                // not supported
                return '';
        }
    } catch (error) {
        return '';
    }
}

async function getTokenCirculationEth(tokenType: string, explorer: string, tokenAddress: string) {
    let explorerUrl2 = explorer;
    if (!explorerUrl2) {
        // if no explorerUrl, use default
        explorerUrl2 = explorerUrl(tokenType, tokenAddress);
        if (!explorerUrl2) {
            return "";
        }
    }
    //console.log("explorerUrl2", explorerUrl2);
    // erc20
    const httpResult = await fetch(explorerUrl2);
    if (httpResult.status != 200) {
        return "";
    }
    const fragment2 = " addresses</div>";
    const fragment1 = 'col-md-8">\n';
    const resultPage = await httpResult.text();
    const idx2 = resultPage.indexOf(fragment2);
    if (idx2 < 30) {
        //console.log("ERROR: framgment2 not found", "etherscanPage", etherscanPage.length, "etherscanUrl", etherscanUrl);
        return "";
    }
    const idx1 = resultPage.substring(idx2 - 30).indexOf(fragment1);
    //console.log("idx1", idx1);
    if (idx1 < 0) {
        //console.log("ERROR: framgment1 not found");
        return "";
    }
    let holdersString = resultPage.substring(idx2 - 30 + idx1 + fragment1.length, idx2);
    // remove any , or .
    holdersString = holdersString.replace(',', '').replace('.', '');
    //console.log(explorerUrl2, holdersString);
    return holdersString;
}

const CirculationHoldersLimit = 2500;

export function checkHoldersLimit(holders: string): {res: number, msg: string} {
    if (!holders) {
        // could not check
        return {res: 1, msg: "Could not obtain no. of holders"};
    }
    const holdersNum = parseInt(holders, 10);
    if (holdersNum >= 0 && holdersNum < CirculationHoldersLimit) {
        return {res: 2, msg: `Low token circulation: no. of holders is ${holdersNum}, below limit of ${CirculationHoldersLimit}`};
    }
    return {res: 0, msg: `Token circulation OK (no. of holders: ${holdersNum})`};
}
