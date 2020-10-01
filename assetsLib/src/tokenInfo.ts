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
    const types: string[] = ["erc20", "bep2", "bep20", "trc10", "trc20"];
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

// Check tokenInfo for validity: contract is OK, logo is OK, etc.
// returns error or empty, all check results
export async function checkTokenInfo(tokenInfo: TokenInfo): Promise<[string, string[]]> {
    let oks: string[] = [];
    if (!normalizeType(tokenInfo.type)) {
        return [`Invalid token type ${tokenInfo.type}`, oks];
    }
    if (!tokenInfo.contract) {
        return ["Contract/ID cannot be empty", oks];
    }
    if (!tokenInfo.logoStream && !tokenInfo.logoUrl) {
        return ["Logo image may not be missing", oks];
    }
    let logoStreamSize = tokenInfo.logoStreamSize;
    let logoStreamType = tokenInfo.logoStreamType;
    if (!tokenInfo.logoStream) {
        try {
            const response = await fetch(tokenInfo.logoUrl);
            if (response.status != 200) {
                return [`Could not retrieve logo from url ${tokenInfo.logoUrl}, status ${status}`, oks];
            }
            logoStreamSize = (await response.arrayBuffer()).byteLength;
            logoStreamType = response.headers.get('Content-Type');
        } catch (error) {
            return [`Could not retrieve logo from url ${tokenInfo.logoUrl}, error ${error}`, oks];
        }
    }
    if (logoStreamType.toLowerCase() != "image/png") {
        return [`Logo image must be PNG image (not ${logoStreamType})`, oks];
    }
    if (logoStreamSize > 100000) {
        return [`Logo image too large, max 100 kB, current ${logoStreamSize / 1000} kB`, oks];
    } else {
        oks.push(`Logo image size is OK (${logoStreamSize / 1000} kB)`);
    }
    if (tokenInfo.type.toLowerCase() === "erc20") {
        if (!isEthereumAddress(tokenInfo.contract)) {
            return [`Contract is not a valid Ethereum address!`, oks];
        }
        const inChecksum = toChecksum(tokenInfo.contract);
        if (inChecksum !== tokenInfo.contract) {
            return [`Contract is not in checksum format, should be ${inChecksum}`, oks];
        }
        oks.push(`Contract is in checksum format`);
    }
    if (!tokenInfo.infoString || !tokenInfo.info) {
        return ["Info.json must not be missing", oks];
    }
    if (!tokenInfo.info["website"]) {
        return ["Website cannot be empty", oks];
    }
    if (!tokenInfo.info["explorer"]) {
        return ["Explorer cannot be empty", oks];
    }
    if (!tokenInfo.info["short_description"]) {
        return ["Short description cannot be empty", oks];
    }
    if (tokenInfo.info["explorer"]) {
        const explorerUrl = tokenInfo.info["explorer"];
        try {
            const result = await fetch(explorerUrl);
            if (result.status != 200) {
                return [`ExplorerUrl does not exist, status ${result.status}, url ${explorerUrl}`, oks];
            }
        } catch (error) {
            return [`ExplorerUrl does not exist, error ${error}, url ${explorerUrl}`, oks];
        }
        oks.push(`Explorer URL exists`);
    }
    if (tokenInfo.info["website"]) {
        const website = tokenInfo.info["website"];
        try {
            const result = await fetch(website);
            if (result.status != 200) {
                return [`Website does not exist, status ${result.status}, url ${website}`, oks];
            }
        } catch (error) {
            return [`Website does not exist, error ${error}, url ${website}`, oks];
        }
        oks.push(`Website exists`);
    }

    return ["", oks];
}
