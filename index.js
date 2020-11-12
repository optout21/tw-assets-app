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
const { createOAuthAppAuth } = require("@octokit/auth-oauth-app");

const appScopes = "public_repo%20read:user";
const gitHub = "https://github.com";

dotenv.config();
const port = process.env.PORT || 3000;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
if (!clientId) {
    console.log("Missing CLIENT_ID!");
} else {
    console.log("ClientId:", clientId);
}
if (!clientSecret) { console.log("Missing CLIENT_SECRET!"); }

var access_token = null;

const packageJson = require('./package.json');
const version = packageJson.version;

function retrieveVersion(request, response) {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end(version);
}

function githubLoginRedirect(request, response) {
    var githubAuthUrl = `${gitHub}/login/oauth/authorize?scope=${appScopes}&client_id=${clientId}`;
    response.writeHead(302, { 'Location': githubAuthUrl });
    response.end('');
}

async function handleCallback(request, response) {
    console.log(`Callback url ${request.url}`);
    const queryObject = url.parse(request.url, true).query;
    const code = queryObject["code"];
    console.log(`code: ${code}`);
    if (!code) {
        response.writeHead(500, { 'Content-Type': 'text/html' });
        response.end(`Code not found`);
        return;
    }
    access_token = null;

    const auth = createOAuthAppAuth({
        clientId: clientId,
        clientSecret: clientSecret,
        code: code
    });
    const tokenAuthentication = await auth({
        type: "token",
        code: code,
        state: "mystate123",
    });
    console.log(JSON.stringify(tokenAuthentication));

    const token = tokenAuthentication["token"];
    console.log(`token: ${token}`);
    if (!token) {
        response.writeHead(500, { 'Content-Type': 'text/html' });
        response.end(`Could not retrieve token from code, code: ${code}`);
        return;
    }
    access_token = token;
    console.log(`Saved token: ${access_token}`);

    const redir = `/index.html?token=${access_token}`;
    response.writeHead(302, { 'Location': redir });
    response.end('');
}

var serve = serveStatic("./static-files");

var httpServer = http.createServer(async function (req, res) {
    try {
        console.log(`req.url ${req.url}`)
        if (req.url === "/get-version") {
            retrieveVersion(req, res);
        } else if (req.url === "/githubLoginRedirect") {
            githubLoginRedirect(req, res);
            return;
        } else if (req.url === "/callback" || req.url.startsWith("/callback?")) {
            handleCallback(req, res);
            return;
        }
        var done = finalhandler(req, res);
        serve(req, res, done);
    } catch (error) {
        console.log("ERROR: ", error);
    }
});

console.log("About to listen, port", port);
httpServer.listen(port);
