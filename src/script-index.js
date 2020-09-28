// Collection of dependency libs, to be bundled

import * as assetsLib from "../node_modules/tw-assets-lib/dist/assetsLib";
const octokit = require("@octokit/request");

export const assets = assetsLib;
export const octoRequest = octokit.request;
