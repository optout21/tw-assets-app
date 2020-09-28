// Collection of dependency libs, to be bundled

import * as assetsLib from "../assetsLib/dist/assetsLib.js";

export const assets = {
    TokenInfo: assetsLib.TokenInfo,
    TokenInput: assetsLib.TokenInput,
    tokenIdsFromFiles: assetsLib.tokenIdsFromFiles,
    tokenInfoOfExistingToken: assetsLib.tokenInfoOfExistingToken,
    tokenInfoOfExistingTokenInRepo: assetsLib.tokenInfoOfExistingTokenInRepo,
    checkTokenInput: assetsLib.checkTokenInput,
    chainFromType: assetsLib.chainFromType
};
export const octoRequest = require("@octokit/request").request;

