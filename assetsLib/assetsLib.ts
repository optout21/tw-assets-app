/// Class holding info of a token
export class TokenInfo {
    type: string = "";
    contract: string = "";
    logoUrl: string = "";
    logoStream: string = "";
    info: unknown = {};
    infoString: string = "{}";
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

    toTokenInfo(tokenInput: TokenInput) {
        let tokenInfo = new TokenInfo();
        tokenInfo.type = tokenInput.type;
        tokenInfo.contract = tokenInput.contract;
        tokenInfo.logoUrl = tokenInput.logoUrl;
        tokenInfo.logoStream = "";
        tokenInfo.info = {
            name: tokenInput.name,
            website: tokenInput.website,
            short_description: tokenInput.description,
            explorer: tokenInput.explorerUrl,
        };
        tokenInfo.infoString = JSON.stringify(tokenInfo.info, null, 4);
        return tokenInfo;
    }
}
