// Collection of dependency libs, to be bundled

import * as assetsLib from "../assetsLib/dist/assetsLib";
const octokit = require("@octokit/request");
export const UIkit = require('uikit');
import Icons from 'uikit/dist/js/uikit-icons';

export const assets = assetsLib;
export const octoRequest = octokit.request;

// loads the Icon plugin
UIkit.use(Icons);
// components can be called from the imported UIkit reference
//UIkit.notification('Hello world.');
