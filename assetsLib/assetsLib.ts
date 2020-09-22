/// Class holding info of a token
export class TokenInfo {
    type: string = "";
    contract: string = "";
    logoUrl: string = "";
    logoStream: string = "";
    infoUrl: string = "";
    info: unknown = {};
    infoString: string = "{}";

    explorerUrl() {
        switch (this.type) {
            case "erc20":
                if (this.contract) {
                    return `https://etherscan.io/token/${this.contract}`;
                }
                break;
        }
        return "";
    }
};

/// Class for entering input for a token
export class TokenInput {
    name: string = "";
    type: string = "";
    contract: string = "";
    logoUrl: string = "";
    website: string = "";
    explorerUrl: string = "";
    description: string = "";

    toTokenInfo() {
        let tokenInfo = new TokenInfo();
        tokenInfo.type = this.type;
        tokenInfo.contract = this.contract;
        tokenInfo.logoUrl = this.logoUrl;
        tokenInfo.logoStream = "";
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
