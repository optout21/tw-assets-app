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
        if (this.contract) {
            switch (this.type.toLowerCase()) {
                case "erc20":
                    return `https://etherscan.io/token/${this.contract}`;
                case "trc10":
                    return `https://tronscan.io/#/token/${this.contract}`;
                case "trc20":
                    return `https://tronscan.io/#/token20/${this.contract}`;
                case "bep2":
                    return `https://explorer.binance.org/asset/${this.contract}`;
            }
        }
        return "";
    }
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
            return "bsc";
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

// Construct TokenInfo for an existing token, specified by type and contract.
export async function tokenInfoOfExistingToken(tokenType: string, contract: string, fetchInfoJson: boolean = false): Promise<TokenInfo> {
    return await tokenInfoOfExistingTokenInRepo(tokenType, contract, mainRepoOwner, mainRepoName, fetchInfoJson);
}

// Construct TokenInfo for an existing token, specified by type and contract, possible form another repo (typically from a pull request)
export async function tokenInfoOfExistingTokenInRepo(tokenType: string, contract: string, repoOwner: string, repoName: string, fetchInfoJson: boolean = false): Promise<TokenInfo> {
    let ti = new TokenInfo();
    ti.type = normalizeType(tokenType);
    ti.contract = contract;
    const chain = chainFromType(tokenType);
    ti.logoUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/master/blockchains/${chain}/assets/${ti.contract}/logo.png`;
    ti.infoUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/master/blockchains/${chain}/assets/${ti.contract}/info.json`;
    if (fetchInfoJson) {
        // read info.json
        ti.infoString = "";
        let resp = await fetch(ti.infoUrl);
        if (resp.status == 200) {
            ti.infoString = await resp.text();
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
    // matched none
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
    export function checkTokenInput(tokenInput: TokenInput): [string, TokenInput|null] {
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
        if (tokenInput.logoStreamSize > 100000) {
            return [`Logo image too large, max 100 kB, current ${tokenInput.logoStreamSize / 1000} kB`, null];
        }
        if (tokenInput.logoStreamType && tokenInput.logoStreamType.toLowerCase() != "image/png") {
            return [`Logo image must be PNG image (not ${tokenInput.logoStreamType})`, null];
        }
        return ["", null];
    }
    