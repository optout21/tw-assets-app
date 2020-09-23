/// Class holding info of a token
export class TokenInfo {
    type: string = "";
    contract: string = "";
    logoUrl: string = "";
    // the logo contents, in base64.  If set, it is used, if empty, Url is used.
    logoStream: string = "";
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

function typeFromType(tokenType: string) {
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
            return "unknown"
    }
}

export async function tokenInfoOfExistingToken(tokenType: string, contract: string, fetchInfoJson: boolean = false): Promise<TokenInfo> {
    let ti = new TokenInfo();
    ti.type = typeFromType(tokenType);
    ti.contract = contract;
    const chain = chainFromType(tokenType);
    ti.logoUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${ti.contract}/logo.png`;
    ti.infoUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${ti.contract}/info.json`;
    if (fetchInfoJson) {
        // read info.json
        let resp = await fetch(ti.infoUrl);
        if (resp.status == 200) {
            ti.infoString = await resp.text();
        }
    }
    return ti;
}

/// Class for entering input for a token
export class TokenInput {
    name: string = "";
    type: string = "";
    contract: string = "";
    logoStream: string = "";
    website: string = "";
    explorerUrl: string = "";
    description: string = "";

    toTokenInfo() {
        let tokenInfo = new TokenInfo();
        tokenInfo.type = this.type;
        tokenInfo.contract = this.contract;
        tokenInfo.logoUrl = "";
        tokenInfo.logoStream = this.logoStream;
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
