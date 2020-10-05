// Copyright © 2020-2020 Trust Wallet.
//
// This file is part of Trust. The full Trust copyright notice, including
// terms governing use, modification, and redistribution, is contained in the
// file LICENSE at the root of the source code distribution tree.

const http = require('http');
const url = require('url');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
//const dotenv = require('dotenv');
const { createOAuthAppAuth } = require("@octokit/auth-oauth-app");

const clientId = "b9ff96b9717574ee8189";
const clientSecret = "fd107ac0d0a52c3513b7e29bf10e528079b334fe";
const port = 3000;

var access_token = null;

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

var serve = serveStatic("./static-files");

var httpServer = http.createServer(async function (req, res) {
    try {
        console.log(`req.url ${req.url}`)
        if (req.url === "/callback" || req.url.startsWith("/callback?")) {
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
