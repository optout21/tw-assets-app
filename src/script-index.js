// Collection of dependency libs, to be bundled

import * as assetsLib from "../assetsLib/dist/assetsLib.js";
const octokit = require("@octokit/request");
export const assets = assetsLib;
export const octoRequest = octokit.request;

