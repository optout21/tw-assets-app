// Copyright © 2020-2020 Trust Wallet.
//
// This file is part of Trust. The full Trust copyright notice, including
// terms governing use, modification, and redistribution, is contained in the
// file LICENSE at the root of the source code distribution tree.

const http = require('http');
const url = require('url');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
//const { octokit } = require("@octokit/rest");
//const { createOAuthAppAuth } = require("@octokit/auth");
const { createOAuthAppAuth } = require("@octokit/auth-oauth-app");
const appName = 'tw-assets-app';

var access_token = null;

function log (text) {
    console.log('[' + appName + ' ' + (new Date()).toISOString() + ']: ' + text);
}

const clientId = "b9ff96b9717574ee8189";
const clientSecret = "fd107ac0d0a52c3513b7e29bf10e528079b334fe";

async function retrieveToken(code) {
    const url = "https://github.com/login/oauth/access_token";
    let resp = await fetch(url, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: code
        })
    });
    if (resp.status != 200) {
        alert(`Error from ${url}, status ${resp.status} ${resp.statusText}`);
        return null;
    }
    const respJson = await resp.json();
    //console.log(respJson);
    return respJson["access_token"];
}

async function handleCallback(request, response) {
    console.log(`Callback url ${request.url}`);
    const queryObject = url.parse(request.url, true).query;
    const code = queryObject["code"];
    console.log(`code: ${code}`);
    if (!code) {
        response.writeHead(500, {'Content-Type': 'text/html'});
        response.end(`Code not found`);
        return;
    }
    access_token = null;

    const auth = createOAuthAppAuth({
        clientId: clientId,
        clientSecret: clientSecret,
        code: code
    });
    /*
    const appAuthentication = await auth({
        type: "oauth-app",
    });
    console.log(JSON.stringify(appAuthentication));
    */
    const tokenAuthentication = await auth({
        type: "token",
        code: code,
        state: "mystate123",
    });
    console.log(JSON.stringify(tokenAuthentication));

    const token = tokenAuthentication["token"];
    console.log(`token: ${token}`);
    if (!token) {
        response.writeHead(500, {'Content-Type': 'text/html'});
        response.end(`Could not retrieve token from code, code: ${code}`);
        return;
    }
    access_token = token;
    console.log(`Saved token: ${access_token}`);

    const redir = `/index.html?token=${access_token}`;
    response.writeHead(300, {'Location': redir});
    response.end('');
}

// Runs right after startup
async function start() {
    dotenv.config();

    log('App ' + appName + ' started')

    if (!process.env.GITHUB_APP_IDENTIFIER) { log('ERROR: Missing GITHUB_APP_IDENTIFIER in env'); return; }
    if (!process.env.GITHUB_PRIVATE_KEY) { log('ERROR: Missing GITHUB_PRIVATE_KEY in env'); return; }
    //if (!process.env.APP_INSTANCE_ID) { log('ERROR: Missing APP_INSTANCE_ID in env'); return }
    if (!process.env.REPO_OWNER) { log('ERROR: Missing REPO_OWNER in env'); return }
    if (!process.env.REPO_NAME) { log('ERROR: Missing REPO_NAME in env'); return; }
    if (!process.env.GITHUB_WEBHOOK_SECRET) { log('ERROR: Missing GITHUB_WEBHOOK_SECRET in evn'); return; }

    const appInstallationId = 11830095
    process.env.APP_INSTANCE_ID = appInstallationId;
    log(`APP_INSTANCE_ID: ${process.env.APP_INSTANCE_ID}`);
    const owner = process.env.REPO_OWNER;
    const repo = process.env.REPO_NAME;
    log(`owner: ${owner}  repo: ${repo}`);

    // remove new lines
    const privateKey = process.env.GITHUB_PRIVATE_KEY.replace("\\n", "\n");

    const options = {
        id: process.env.GITHUB_APP_IDENTIFIER,
        privateKey: privateKey,
        secret: process.env.GITHUB_WEBHOOK_SECRET
    };
    /*
    export interface Options {
        privateKey?: string;
        githubToken?: string;
        id?: number;
        Octokit?: typeof ProbotOctokit;
        log?: Logger;
        redisConfig?: Redis.RedisOptions;
        secret?: string;
        webhookPath?: string;
        cache?: LRUCache<number, string>;
        octokit?: InstanceType<typeof ProbotOctokit>;
        throttleOptions?: any;
        webhooks?: Webhooks;
    }
    */
    var app = new probot.Application(options);
    gitHubApi = await app.auth(appInstallationId, null);
    if (!gitHubApi) { log('ERROR: Could not obtain gitHubApi'); return; }

    // create a context on our own
    defaultContext = {
        payload: {
            repository: {
                name: repo,
                full_name: owner + '/' + repo,
                owner: {
                    login: owner
                }
            }
        },
        github: gitHubApi
    }

    const prs = await queryPulls(gitHubApi, defaultContext);
    console.log('prs', prs);
}

//start();

var serve = serveStatic("./static");

var httpServer = http.createServer(async function (req, res) {
    console.log(`req.url ${req.url}`)
    //res.writeHead(200, {'Content-Type': 'text/plain'});
    //res.end('Hello World!');
    if (req.url === "/callback" || req.url.startsWith("/callback?")) {
        handleCallback(req, res);
        return;
    }
    var done = finalhandler(req, res);
    serve(req, res, done);
});
httpServer.listen(3000); 
