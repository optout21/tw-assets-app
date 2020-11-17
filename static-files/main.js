const appName = "TW Asets Management";
const appNameHtml = `<a href="https://assets.trustwallet.com">${appName}</a>`;
const gitHub = "https://github.com";
const mainRepoOwner = "trustwallet";
const mainRepoName = "assets";
const mainRepoFullName = mainRepoOwner + "/" + mainRepoName;
const mainRepoUrl = `${gitHub}/${mainRepoFullName}.git`;
const prBodyFooter = `\n\nPR created by ${appNameHtml}`;

const sampleEthContract = "0x6d84682C82526E245f50975190EF0Fff4E4fc077";
const testLogoUrls = [
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x47F32f9eBFc49a1434eB6190d5D8a80A2Dc36af5/logo.png",
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x9B9087756eCa997C5D595C840263001c9a26646D/logo.png",
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xd4c435F5B09F855C3317c8524Cb1F586E42795fa/logo.png",
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x86876a5fCAcb52a197f194A2c8b2166Af327a6da/logo.png",
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xD5525D397898e5502075Ea5E830d8914f6F0affe/logo.png"
];

function addLog(message) {
    console.log(message);
    //const newvalue = document.getElementById("log").value + message + "\n"
    //document.getElementById("log").value = newvalue;
}

async function myAlert(message) {
    addLog(message);
    alert(message);
}

function authHeaders(userToken) {
    return { authorization: `token ${userToken}` };
}

function loginActionUrl() {
    return `/githubLoginRedirect`;
}

function getQueryParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function getTokenQP() {
    return getQueryParam("token");
}

function updateQueryParams(newParamName, newValue) {
    var urlParams = new URLSearchParams(window.location.search);
    urlParams.set(newParamName, newValue);
    return urlParams.toString();
}

async function getUser(userToken) {
    const result = await script.octoRequest("GET /user", { headers: authHeaders(userToken) });
    return result.data;
}

async function checkUser(userToken) {
    if (!userToken) {
        return "";
    }
    const user = await getUser(userToken);
    if (!user || !user.login) {
        return "";
    }
    return user.login;
}


async function getUserRepos(userToken) {
    const result = await script.octoRequest("GET /user/repos", { headers: authHeaders(userToken) });
    return result.data;
}

async function getRepo(userToken, owner, repo) {
    const result = await script.octoRequest("GET /repos/:owner/:repo", {
        headers: authHeaders(userToken),
        owner: owner,
        repo: repo
    });
    return result.data;
}

async function checkRepo(userToken, loginName, progressCallback) {
    if (!userToken || !loginName) {
        return null;
    }
    const repos = await getUserRepos(userToken);
    if (!repos || repos.length == 0) {
        addLog(`Warning: No repositories found for user ${loginName}`);
        return null;
    }
    // first try under 'assets' name
    for (const r of repos) {
        try {
            if (progressCallback) { progressCallback(r.name); }
            if (r && r.fork && r.name === mainRepoName) {
                const r2 = await getRepo(userToken, loginName, r.name);
                if (r2 && r2.parent && r2.parent.full_name === mainRepoFullName) {
                    addLog(`Fork repo found, ${loginName} ${r.name}`);
                    return r.name;
                }
            }
        } catch (error) {
            addLog(`Error: ${r.name} ${error}`);
        }
    }
    // try again all others
    for (const r of repos) {
        try {
            if (progressCallback) { progressCallback(r.name); }
            if (r && r.fork) {
                const r2 = await getRepo(userToken, loginName, r.name);
                if (r2 && r2.parent && r2.parent.full_name === mainRepoFullName) {
                    addLog(`Fork repo found, ${loginName} ${r.name}`);
                    return r.name;
                }
            }
        } catch (error) {
            addLog(`Error: ${r.name} ${error}`);
        }
    }
    addLog(`Warning: Fork repo not found, checked ${repos.length} repos of user ${loginName}`);
    return null;
}

// Retrieve the size of an image (url or stream) but placing in a hidden img and retrieving size
async function getImageDimension(url, stream = null) {
    try {
        const img = document.getElementById("image-placeholder-for-size-computation");
        //img.src = "";
        if (stream) {
            img.src = "data:image/gif;base64," + stream;
        } else {
            img.src = url;
        }
        return { x: img.naturalWidth, y: img.naturalHeight };
    } catch (error) {
        console.log("getImageDimension exception", error);
        return { x: 0, y: 0 }
    }
}

// return [ArrayBuffer, content-type]
async function logoStreamFromUrl(testLogoUrl) {
    if (!testLogoUrl) {
        return [null, null];
    }
    const response = await fetch(testLogoUrl);
    if (!response || !response.status == 200) {
        addLog(`Logo stream error ${url}`);
        return [null, null];
    }
    return [await response.arrayBuffer(), response.headers.get('Content-Type')];
}

function arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function createFork(userToken, owner, repo) {
    const result = await script.octoRequest("POST /repos/:owner/:repo/forks", {
        headers: authHeaders(userToken),
        owner: owner,
        repo: repo
    });
    return result.data.full_name;
}

async function doCreateFork(userToken) {
    const res = await createFork(userToken, mainRepoOwner, mainRepoName);
    myAlert(`Fork created: ${res}`);
    // wait a bit before reload
    new Promise(resolve => setTimeout(resolve, 3000));
    // reload
    window.location = window.location;
}

function newBranchName() {
    const today = new Date();
    const date = (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0') +
        '-' + today.getHours().toString().padStart(2, '0') + today.getMinutes().toString().padStart(2, '0') + today.getSeconds().toString().padStart(2, '0');
    return "br" + date;
}

async function getBranchRef(userToken, loginName, repo, branch) {
    const result = await script.octoRequest("GET /repos/{owner}/{repo}/git/ref/{ref}", {
        headers: authHeaders(userToken),
        owner: loginName,
        repo: repo,
        ref: "heads/" + branch
    });
    return result.data.object.sha;
}

async function createBranch(userToken, loginName, repo, branchName) {
    const ref = await getBranchRef(userToken, loginName, repo, "master");
    const result = await script.octoRequest("POST /repos/:owner/:repo/git/refs", {
        headers: authHeaders(userToken),
        owner: loginName,
        repo: repo,
        ref: `refs/heads/${branchName}`,
        sha: ref
    });
    return result.data.ref;
}

async function createBlob(userToken, loginName, repo, content, encoding) {
    const result = await script.octoRequest("POST /repos/:owner/:repo/git/blobs", {
        headers: authHeaders(userToken),
        owner: loginName,
        repo: repo,
        content: content,
        encoding: encoding
    });
    return result.data.sha;
}

async function createFiles(userToken, loginName, repo, basePath, subFolder, logoContents, infoJsonContent) {
    var fileInfos = [];

    const folder = basePath + "/" + subFolder;

    const logoSha = await createBlob(userToken, loginName, repo, logoContents, "base64");
    if (!logoSha) {
        return null;
    }
    fileInfos.push({ path: folder + "/logo.png", sha: logoSha, mode: "100644", type: "blob" });

    fileInfos.push({ path: folder + "/info.json", content: infoJsonContent, mode: "100644", type: "blob" });

    return fileInfos;
}

async function createTree(userToken, loginName, repo, baseSha, fileInfos) {
    const result = await script.octoRequest("POST /repos/:owner/:repo/git/trees", {
        headers: authHeaders(userToken),
        owner: loginName,
        repo: repo,
        tree: fileInfos,
        base_tree: baseSha
    });
    return result.data.sha;
}

async function createCommit(userToken, loginName, repo, baseSha, tree, tokenName) {
    const result = await script.octoRequest("POST /repos/:owner/:repo/git/commits", {
        headers: authHeaders(userToken),
        owner: loginName,
        repo: repo,
        message: `Info for token ${tokenName}`,
        tree: tree,
        parents: [baseSha]
    });
    return result.data.sha;
}

async function updateReference(userToken, loginName, repo, ref, sha) {
    const result = await script.octoRequest("POST /repos/:owner/:repo/git/refs/:ref", {
        headers: authHeaders(userToken),
        owner: loginName,
        repo: repo,
        ref: ref,
        sha: sha
    });
    return result.data.object.sha;
}

async function createPull(userToken, loginName, repo, branchName, tokenName, tokenType, debugPrTargetFork) {
    const title = `Add ${tokenName} (${tokenType})`;
    const text = `Adding info for ${tokenType} token '${tokenName}'.\n\n${prBodyFooter}`;
    var owner1 = mainRepoOwner;
    var repo1 = mainRepoName;
    if (debugPrTargetFork) {
        owner1 = loginName;
        repo1 = repo;
    }
    const result = await script.octoRequest("POST /repos/:owner/:repo/pulls", {
        headers: authHeaders(userToken),
        owner: owner1,
        repo: repo1,
        title: title,
        head: loginName + ":" + branchName,
        base: "master",
        body: text,
        maintainer_can_modify: true,
        draft: false
    });
    return result.data.number;
}

async function getPulls(userToken, owner, repo) {
    const result = await script.octoRequest("GET /repos/:owner/:repo/pulls", {
        headers: authHeaders(userToken),
        owner: owner,
        repo: repo,
        per_page: 100,
    });
    return result.data;
}

async function getPrFiles(userToken, prNum) {
    const url = `https://api.github.com/repos/${mainRepoFullName}/pulls/${prNum}/files`;
    let resp = await fetch(url, { headers: authHeaders(userToken) });
    if (resp.status != 200) {
        myAlert(`Error from ${url}, status ${resp.status} ${resp.statusText}`);
        return [];
    }
    const respJson = await resp.json();
    const files = respJson.map(e => e.filename);
    return files;
}

async function checkUrlByBackend(url) {
    const beUrl = `/checkUrl?url=${encodeURI(url)}`;
    console.log(`checkUrlByBackend ${beUrl}`);
    let resp = await fetch(beUrl);
    return resp.status;
}

function start() {
    // Preview for a single logo, supports url and stream, rounded mask, dimming
    Vue.component('logo-single-preview', {
        props: {
            size: Number,
            logourl: String,
            logostream: String,
            dimmed: Boolean,
            rounded: Boolean
        },
        computed: {
            src: function () {
                if (this.logostream) {
                    // image data inline
                    return "data:image/gif;base64," + this.logostream;
                }
                if (this.logourl) { return this.logourl; }
                // fallback TODO replace with placeholder image
                return "img/emptylogo.png";
            },
            opacity: function () { return this.dimmed ? 0.6 : 1; },
            roundedRadius: function () { return this.rounded ? "48%" : "0%" },
            style: function () { return `max-width: 64; opacity: ${this.opacity}; border-radius: ${this.roundedRadius};`; }
        },
        data: function () {
            return {}
        },
        template: `<img :width="size" :height="size" :src="src" :style="style" />`
    });

    // Token text for preview
    Vue.component('logo-preview-with-name', {
        props: {
            logourl: String,
            logostream: String,
            name: String,
            dimmed: Boolean,
        },
        template:
            `
                <tr>
                    <td style="padding: 5;">
                        <logo-single-preview :size="32" :logourl="logourl" :logostream="logostream" :dimmed="dimmed" :rounded="true" />
                    </td>
                    <td class="wide" style="align: right;">
                        <span style="vertical-align: center; font-size: 70%;">{{name ? name.substring(0, 18) : '(Token)'}}</span>
                    </td>
                </tr>
            `
    });

    // Logo preview  with a few other logos above/below
    Vue.component('logo-column-preview', {
        props: {
            logourl: String,
            logostream: String,
            tokenname: String,
            textcolor: String,
        },
        data: function () {
            return {
                logosBuiltin: {
                    Bitcoin: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png",
                    Trust: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/assets/TWT-8C2/logo.png",
                    Binance: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png",
                    Ethereum: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png"
                }
            }
        },
        template:
            `
                <div style="display: inline-block; padding: 15px; align: right;">
                    <table :style="'color: ' + textcolor + '; width: 130px;'">
                        <logo-preview-with-name :logourl="logosBuiltin['Bitcoin']" name="Bitcoin" :dimmed="true" />
                        <!-- logo-preview-with-name :logourl="logosBuiltin['Trust']" name="Trust" :dimmed="true" / -->
                        <logo-preview-with-name :logourl="logourl" :logostream="logostream" :name="tokenname" :dimmed="false" />
                        <!-- logo-preview-with-name :logourl="logosBuiltin['Binance']" name="Binance" :dimmed="true" / -->
                        <logo-preview-with-name :logourl="logosBuiltin['Ethereum']" name="Ethereum" :dimmed="true" />
                    </table>
                </div>
            `
    });

    // Log preview with a column with light background and one with dark background
    Vue.component('logo-preview', {
        props: {
            logourl: String,
            logostream: String,
            tokenname: String,
        },
        template:
            `
                <div>
                    <table class="center">
                        <tr>
                            <td style="background-color: #E0E0E0;">
                                <logo-column-preview :logourl="logourl" :logostream="logostream" :tokenname="tokenname" textcolor="black" />
                            </td>
                            <td style="background-color: #202020; color: white;">
                                <logo-column-preview :logourl="logourl" :logostream="logostream" :tokenname="tokenname" textcolor="white" />
                            </td>
                        </tr>
                    </table>
                </div>
            `
    });

    Vue.component('token-view', {
        props: {
            tokenInfo: Object
        },
        data: function () {
            return {
                circulationHolders: '',
            }
        },
        updated: async function () {
            this.circulationHolders = await script.assets.getTokenCirculation(this.tokenInfo.type, this.tokenInfo.info['explorer'], this.tokenInfo.contract);
        },
        computed: {
            links: function () {
                if (!this.tokenInfo) { return ""; }
                let links = "";
                if (this.tokenInfo.logoUrl) {
                    links += `<a href="${this.tokenInfo.logoUrl}" target="_blank">Logo</a> `;
                } else {
                    links += "(logo) ";
                }
                if (this.tokenInfo.infoUrl) {
                    links += `<a href="${this.tokenInfo.infoUrl}" target="_blank">Info</a> `;
                } else {
                    links += "(info) ";
                }
                const explorer = this.tokenInfo.explorerUrl();
                if (explorer) {
                    links += `<a href="${explorer}" target="_blank">Explorer</a> `;
                } else {
                    links += "(explorer) ";
                }
                const website = this.tokenInfo.info["website"];
                if (website) {
                    links += `<a href="${website}" target="_blank">Website</a> `;
                } else {
                    links += "(website) ";
                }
                return links;
            }
        },
        methods: {
            checkInfoButton: async function () {
                addLog("starting TokenInfo check...");
                let [resnum, resmsg] = await script.assets.checkTokenInfo(this.tokenInfo,
                    { checkUrl: checkUrlByBackend },
                    { get: getImageDimension });
                if (resnum >= 2) {
                    myAlert("Check result: ERROR \n" + resmsg);
                } else if (resnum >= 1) {
                    myAlert("Check result: Warning \n" + resmsg);
                } else {
                    myAlert("Check OK: \n" + resmsg);
                }
            },
        },
        template: `
            <div id="token-view">
                <div class="margined">
                    <h3>Token View</h3>
                </div>
                <table>
                    <tr>
                        <td>Type:</td>
                        <td><strong>{{tokenInfo.type}}</strong></td>
                    </tr>
                    <tr>
                        <td>Contract:</td>
                        <td><strong>{{tokenInfo.contract}}</strong></td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <div>Logo Preview:</div>
                            <logo-preview :logourl="tokenInfo.logoUrl" :logostream="tokenInfo.logoStream" />
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <textarea class="input wide" id="info.info" readonly="true" rows="8">{{tokenInfo.infoString}}</textarea>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            Links: <span v-html="links"></span>
                        </td>
                    </tr>
                    <tr>
                        <td>Circulation (holders):</td>
                        <td>{{circulationHolders}}</td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <button class="button" type="button" v-on:click="checkInfoButton">Check</button>
                        </td>
                    </tr>
                </table>
            </div>
        `
    });

    Vue.component('pull-label-item', {
        props: {
            label: Object,
        },
        computed: {
            initials: function () {
                const words = this.label.name.split(' ');
                inits = words.map(w => w[0]).join('');
                return inits.substring(0, 3);
            },
        },
        template:
            `
                <span class="pull-label-small" v-bind:style="{ backgroundColor: label.color }"
                    v-bind:title="label.name">{{initials}}
                </span>
            `
    });

    Vue.component('pull-item', {
        props: {
            pull: Object,
        },
        methods: {
            onclick: function () {
                this.$emit('select', this.pull);
            },
        },
        computed: {
            shortTitle: function () {
                const maxlen = 25;
                if (this.pull.title.length <= maxlen) {
                    return this.pull.title;
                }
                return this.pull.title.substring(0, maxlen - 1) + '...';
            }
        },
        template:
            `
                <div class="pull-item selection-item" v-on:click="onclick">
                    <strong>{{pull.number}}</strong>
                    <span v-bind:title="pull.title">{{shortTitle}}</span>
                    <pull-label-item v-for="label in pull.labels" :label="label"></pull-label-item>
                </div>
            `
    });

    Vue.component('pull-content', {
        props: {
            pull: Object,
            tokenIds: Array,
        },
        data: function () {
            return {
                selectedToken: Object,
            }
        },
        async updated() {
            //console.log("pull-content updated", this.tokenIds.length);
            if (!this.tokenIds || this.tokenIds.length == 0) {
                if (this.selectedToken) {
                    this.selectedToken = null;
                    this.$emit('select', this.selectedToken);
                }
            } else if (this.tokenIds && this.tokenIds.length >= 1) {
                if (!this.selectedToken) {
                    this.selectedToken = this.tokenIds[0];
                    this.$emit('select', this.selectedToken);
                }
            }
        },
        methods: {
            onclick: function (e) {
                const token = JSON.parse(e.target.attributes.token.value);
                //console.log("token", token);
                this.selectedToken = token;
                //console.log("selectedToken", this.selectedToken.id, this.selectedToken);
                this.$emit('select', token);
            },
        },
        template:
            `
                <div>
                    <div class="margined">
                        <div class="margined"><a :href="gitHub + '/' + mainRepoFullName + '/pull/' + pull.number" target="_blank" rel="noopener noreferrer"><strong>PR #{{pull.number}}</strong></a>: {{pull.title}}</div>
                        <div class="margined">repo: <a :href="gitHub + '/'+ pull.owner + '/' + pull.repo" target="_blank" rel="noopener noreferrer">{{pull.owner}}/{{pull.repo}}</a>/{{pull.branch}}</div>
                        <div class="margined">Detected token(s) in PR:</div>
                    </div>
                    <div id="pull-content-list" class="selection-list margined ">
                        <div v-for="token in tokenIds" class="selection-item" v-on:click="onclick" :token="JSON.stringify(token)" :tokentype="token.type" :tokenid="token.id"
                            v-bind:class="{'selected-item': token && selectedToken && token.id == selectedToken.id}">{{token.type}}: {{token.id}}</div>
                    </div>
                </div>
            `
    });

    Vue.component('pulls-list', {
        props: {
            userToken: String,
            enabled: String,
        },
        data: function () {
            return {
                pulls: Array,
                selected: Object,
                selectedPullTokenIds: Array,
            }
        },
        async created() {
            // enabled is set delayed, check queryparam here directly
            maintainerMode = getQueryParam("maintainer");
            if (this.enabled || maintainerMode) {
                await this.loadOpenPrs();
            }
        },
        methods: {
            loadOpenPrs: async function () {
                if (!this.userToken) { this.pulls = []; return; }
                const rawPulls = await getPulls(this.userToken, mainRepoOwner, mainRepoName);
                this.pulls = rawPulls.map(p => ({
                    number: p.number,
                    title: p.title,
                    owner: p.head.user ? p.head.user.login : '',
                    repo: p.head.repo ? p.head.repo.name : '',
                    branch: p.head.ref,
                    labels: p.labels.map(l => ({ name: l.name, color: l.color })),
                }));
                if (this.pulls && this.pulls.length >= 1) {
                    await this.onselectpull(this.pulls[0], true);
                }
            },
            onselectpull: async function (pr, silentMode = false) {
                this.selected = pr;
                //console.log(`select ${pr.number}: ${pr.owner}/${pr.repo}/${pr.branch}`);
                this.selectedPullTokenIds = [];
                this.$emit('selecttoken', new script.assets.TokenInfo());

                const files = await getPrFiles(this.userToken, pr.number);
                if (!files || files.length == 0) {
                    myAlert(`Could not retrieve files from PR ${pr.number}`);
                    return;
                }
                const ids = script.assets.tokenIdsFromFiles(files);
                if (!ids || ids.length == 0) {
                    if (!silentMode) {
                        myAlert(`Could not retrieve tokens from PR ${pr.number}`);
                    }
                    return;
                }
                this.selectedPullTokenIds = ids.map(i => ({ type: i[0], id: i[1], owner: pr.owner, repo: pr.repo, branch: pr.branch }));
            },
            onselecttoken: function (token) {
                this.$emit('selecttoken', token);
            },
        },
        template:
            `
                <div>
                    <div class="margined">
                        <button v-on:click="loadOpenPrs()">Search</button>
                        <span>{{pulls.length}} PRs</span>
                    </div>
                    <div id="pulls-list-list" class="selection-list margined">
                        <pull-item v-for="pull in pulls" :pull="pull" v-on:select="onselectpull"
                            v-bind:class="{'selected-item': pull.number == selected.number}"></pull-item>
                    </div>
                    <pull-content :pull="selected" :token-ids="selectedPullTokenIds" v-on:select="onselecttoken"></pull-content>
                </div>
            `
    });

    Vue.component('token-search-item', {
        props: {
            token: Object,
        },
        methods: {
            onclick: function () {
                this.$emit('select', this.token);
            }
        },
        computed: {
            symbol: function () { return this.token.symbol.substring(0, 10); },
            name: function () { return this.token.name.substring(0, 18); },
            type: function () { return this.token.type.toLowerCase(); },
        },
        template:
            `
                <div class="token-search-item selection-item" v-on:click="onclick">
                    <strong>{{symbol}}</strong>
                    {{name}}
                    ({{type}})
                </div>
            `
    });

    Vue.component('token-search', {
        data: function () {
            return {
                queryString: '',
                tokens: Array,
                selected: Object,
            }
        },
        methods: {
            searchButton: async function () {
                if (this.queryString.length < 2) {
                    // too short, do not search
                    return;
                }
                this.tokens = [];
                const coinTypes = "60,195,714,20000714"; // eth, tron, binance, bep20
                const url = `https://api.trustwallet.com/v2/tokens/list?networks=${coinTypes}&query=${this.queryString}`;
                let resp = await fetch(url);
                if (resp.status != 200) {
                    myAlert(`Error from ${url}, status ${resp.status} ${resp.statusText}`);
                    return;
                }
                const respJson = await resp.json();
                var h = '';
                if (respJson && respJson.docs) {
                    this.tokens = respJson.docs.map(t => t);
                }
                if (this.tokens && this.tokens.length >= 1) {
                    await this.onselecttoken(this.tokens[0]);
                }
            },
            onselecttoken: async function (token) {
                this.selected = token;
                this.$emit('selecttoken', this.selected);
            },
        },
        template:
            `
                <div id="token-search">
                    <div class="margined">
                        <input id="search-input" class="input" placeholder="Token" v-on:change="searchButton" v-model="queryString">
                        <button v-on:click="searchButton">Search</button>
                    </div>
                    <div id="token-search-list" class="selection-list margined">
                        <token-search-item v-for="token in tokens" :token="token" v-on:select="onselecttoken"
                            v-bind:class="{'selected-item': token && selected && token.address == selected.address}"></token-search-item>
                    </div>
                </div>
            `
    });

    Vue.component('main-add-token', {
        props: {
            userToken: String,
            loginName: String,
            repo: String,
        },
        data: function () {
            return {
                tokenInput: new script.assets.TokenInput(),
                errorLogo: ' ',
                errorContract: ' ',
                errorWebsite: ' ',
                errorExplorer: ' ',
                fixedContract: null,
                fixedWebsite: null,
                fixedExplorer: null,
                inputLogoFilename: '',
                inputLogoDetails: '',
                debugMode: false,
                debugPrTargetFork: false,
                testLogoIndex: 0,
                tokenInfo: new script.assets.TokenInfo(),
                checkButtonText: '',
                prButtonText: '',
            }
        },
        async created() {
            this.clearInput();
            this.debugMode = getQueryParam("debug");
        },
        methods: {
            clearInput: function () {
                this.tokenInput = new script.assets.TokenInput();
                this.inputLogoSetStream(null, null, 0, null);
            },
            isInputStillEmpty: function () {
                // don't display check result if all inputs are empty
                if (!this.tokenInput.name && !this.tokenInput.contract && !this.tokenInput.logoStream) {
                    return true;
                }
                return false;
            },
            checkInputButton: async function () {
                this.checkButtonText = 'Checking ...';
                addLog("starting TokenInput check...");
                const [resnum, resmsg, fixed] = await script.assets.checkTokenInput(this.tokenInput,
                    { checkUrl: checkUrlByBackend }, { get: getImageDimension });
                if (resnum == 0) {
                    myAlert("Check result: OK\n" + resmsg);
                    this.checkButtonText = '';
                    return resnum;
                }
                if (!fixed) {
                    // cannot be fixed
                    if (resnum >= 2) {
                        myAlert("Check result: ERROR\n" + resmsg);
                        this.checkButtonText = '';
                        return resnum;
                    }
                    myAlert("Check result: Warning\n" + resmsg);
                    this.checkButtonText = '';
                    return resnum;
                }
                // can be fixed
                this.tokenInput = fixed;
                myAlert("Check result: Fixed! \n " + resmsg);
                this.checkButtonText = '';
                return resnum;
            },
            tokenInputLogoChanged: async function () {
                if (this.isInputStillEmpty()) {
                    return;
                }
                const [resnum, resmsg] = await script.assets.checkTokenInputLogo(this.tokenInput, { get: getImageDimension });
                this.errorLogo = ' ';
                if (resnum >= 2) {
                    this.errorLogo = resmsg;
                }
            },
            tokenInputContractChanged: async function () {
                if (this.isInputStillEmpty()) {
                    return;
                }
                // auto-fill explorer
                if (this.tokenInput.contract && !this.tokenInput.explorerUrl) {
                    const explorer = script.assets.explorerUrlForToken(this.tokenInput.type, this.tokenInput.contract);
                    this.tokenInput.explorerUrl = explorer;
                }

                const [resnum, resmsg, fixed] = await script.assets.checkTokenInputContract(this.tokenInput);
                this.fixedContract = fixed;
                this.errorContract = ' ';
                if (resnum >= 2 || fixed) {
                    this.errorContract = resmsg;
                } else {
                    // contract OK, try to preload info from it
                    const tokenInf = await script.assets.getTokenInfo(this.tokenInput.type, this.tokenInput.contract);
                    if (tokenInf) {
                        if (tokenInf.name && tokenInf.symbol && !this.tokenInput.name) { this.tokenInput.name = `${tokenInf.name} (${tokenInf.symbol})`; }
                        if (tokenInf.name && !this.tokenInput.name) { this.tokenInput.name = tokenInf.name; }
                        if (tokenInf.website && !this.tokenInput.website) { this.tokenInput.website = tokenInf.website; }
                    }
                }
            },
            tokenInputNameChanged: async function () {
            },
            tokenInputWebsiteChanged: async function () {
                if (this.isInputStillEmpty()) {
                    return;
                }
                const [resnum, resmsg, fixed] = await script.assets.checkTokenInputWebsite(this.tokenInput, { checkUrl: checkUrlByBackend });
                this.fixedWebsite = fixed;
                this.errorWebsite = ' ';
                if (resnum >= 2 || fixed) {
                    this.errorWebsite = resmsg;
                }
            },
            tokenInputExplorerChanged: async function () {
                if (this.isInputStillEmpty()) {
                    return;
                }
                const [resnum, resmsg, fixed] = await script.assets.checkTokenInputExplorer(this.tokenInput, { checkUrl: checkUrlByBackend });
                this.fixedExplorer = fixed;
                this.errorExplorer = ' ';
                if (resnum >= 2 || fixed) {
                    this.errorExplorer = resmsg;
                }
            },
            tokenInputDescriptionChanged: async function () {
            },
            tokenInputChanged: async function () {
                await this.tokenInputLogoChanged();
                await this.tokenInputContractChanged();
                await this.tokenInputNameChanged();
                await this.tokenInputWebsiteChanged();
                await this.tokenInputExplorerChanged();
                await this.tokenInputDescriptionChanged();
            },
            inputLogoSetStream: function (stream, hintName, hintSize, hintMime) {
                if (!stream) {
                    this.tokenInput.logoStream = null;
                    this.tokenInput.logoStreamSize = 0;
                    this.tokenInput.logoStreamType = null;
                    this.inputLogoFilename = "(no image)";
                    this.inputLogoDetails = "";
                    return;
                }
                this.tokenInput.logoStream = stream;

                this.inputLogoFilename = hintName;

                let details = "(";
                this.tokenInput.logoStreamSize = 0;
                if (hintSize && hintSize > 0) {
                    this.tokenInput.logoStreamSize = hintSize;
                    details += `${hintSize} bytes`;
                } else {
                    details += `${this.tokenInput.logoStream.length} base64 bytes`;
                }
                if (hintName) {
                    details += `, ${hintName}`;
                }
                this.tokenInput.logoStreamType = "";
                if (hintMime) {
                    this.tokenInput.logoStreamType = hintMime;
                    details += `, ${hintMime}`;
                }
                details += ")";
                this.inputLogoDetails = details;
            },
            logoFileSelected: async function () {
                const file = document.getElementById("input.file-selector").files[0];
                if (file) {
                    var reader = new FileReader();
                    reader.readAsArrayBuffer(file);
                    app = this;
                    reader.onload = async function (evt) {
                        var contents = evt.target.result;
                        var base64 = arrayBufferToBase64(contents);
                        app.inputLogoSetStream(base64, file.name, file.size, file.type);
                        await app.tokenInputLogoChanged();
                    }
                    reader.onerror = function (evt) {
                        myAlert(`Error reading file ${file.name}`);
                    }
                }
            },
            createPullError: async function (message) {
                myAlert("PR creation error: " + message);
                this.prButtonText = '';
            },
            createBranchAndPull: async function () {
                if (!this.loginName) {
                    createPullError("Log in first!");
                    return;
                }
                if (!this.repo) {
                    createPullError("Create a fork of the assets repo first!");
                    return;
                }
                if (!this.tokenInput.contract || !this.tokenInput.name || !this.tokenInput.type || !this.tokenInput.logoStream) {
                    createPullError("Fill in all the fields!");
                    return;
                }
                this.tokenInfo = this.tokenInput.toTokenInfo();
                if (!this.tokenInfo) {
                    createPullError("TokenInput error");
                    return;
                }

                this.prButtonText = "creating PR ...";

                const branchName = newBranchName();

                addLog(`name: ${this.tokenInput.name}  type: ${this.tokenInput.type}  contract: ${this.tokenInput.contract}  branch ${branchName}`);

                this.prButtonText = "creating branch ...";
                const branchRef = await createBranch(this.userToken, this.loginName, this.repo, branchName);
                if (!branchRef) {
                    createPullError(`Could not create branch ${branchName}`);
                    return;
                }
                addLog(`Created branch ${this.loginName}/${this.repo}/${branchName}`);

                let stream = null;
                if (this.tokenInput.logoStream && this.tokenInput.logoStream.length > 10) {
                    // stream is there, use that
                    stream = this.tokenInput.logoStream;
                }
                if (!stream) {
                    createPullError(`Could not retrieve logo contents`);
                    return;
                }

                const chain = script.assets.chainFromType(this.tokenInput.type);
                if (!chain || chain == "unknown") {
                    createPullError(`Could not retrieve chain from token type ${this.tokenInput.type}`);
                    return;
                }

                this.prButtonText = "creatinging files ...";
                const fileInfos = await createFiles(this.userToken, this.loginName, this.repo, `blockchains/${chain}/assets`, this.tokenInput.contract, stream, this.tokenInfo.infoString);
                if (!fileInfos || fileInfos.length == 0) {
                    createPullError(`Could not create files`);
                    return;
                }
                addLog(`Created ${fileInfos.length} new files`);

                const branchSha = await getBranchRef(this.userToken, this.loginName, this.repo, branchName);
                if (!branchSha) {
                    createPullError(`Could not get ref for branch ${branchName}`);
                    return;
                }

                const tree = await createTree(this.userToken, this.loginName, this.repo, branchSha, fileInfos);
                if (!tree) {
                    createPullError(`Could not create tree with files`);
                    return;
                }

                this.prButtonText = "creating commit ...";
                const commit = await createCommit(this.userToken, this.loginName, this.repo, branchSha, tree, this.tokenInput.name);
                if (!commit) {
                    createPullError(`Could not create commit`);
                    return;
                }
                addLog(`Created new commit ${commit}`);

                const newBranchSha = await updateReference(this.userToken, this.loginName, this.repo, "heads/" + branchName, commit);
                if (!newBranchSha) {
                    createPullError(`Could not update branch ${branchName} to commit ${commit}`);
                    return;
                }

                this.prButtonText = "creating pull request ...";
                const pullNumber = await createPull(this.userToken, this.loginName, this.repo, branchName, this.tokenInput.name, this.tokenInput.type, this.debugPrTargetFork);  // true for debug
                if (!pullNumber) {
                    createPullError(`Could not create PR`);
                    return;
                }
                this.prButtonText = '';

                var pullOwner = mainRepoOwner;
                var pullRepo = mainRepoName;
                if (this.debugPrTargetFork) {
                    pullOwner = this.loginName;
                    pullRepo = this.repo;
                }
                const pullUrl = `${gitHub}/${pullOwner}/${pullRepo}/pull/${pullNumber}`;
                myAlert(`Created PR ${pullNumber}   ${pullUrl}`);
            },
            createPullButton: async function () {
                checkResult = await this.checkInputButton();
                if (checkResult != 0 && checkResult != 1) {
                    addLog("Not creating PR due to check errors");
                } else {
                    await this.createBranchAndPull(this.userToken, this.loginName, this.repo, this.tokenInput, this.debugPrTargetFork);
                }
            },
            debugTestLogoGetNext: async function () {
                this.testLogoIndex = (this.testLogoIndex + 1) % testLogoUrls.length;
                const [streamArray, mime] = await logoStreamFromUrl(testLogoUrls[this.testLogoIndex]);
                const stream = arrayBufferToBase64(streamArray);
                this.inputLogoSetStream(stream, "test" + this.testLogoIndex, streamArray.byteLength, mime);
            },
            debugFillWithDummyData: async function () {
                this.tokenInput.name = "LegumeToken";
                this.tokenInput.type = "erc20";
                this.tokenInput.contract = sampleEthContract;
                this.tokenInput.website = "https://en.wikipedia.org/wiki/Legume";
                this.tokenInput.description = "This is the best-tasting DeFi finance project.";
                this.tokenInput.explorerUrl = `https://etherscan.io/token/${sampleEthContract}`;
                await this.debugTestLogoGetNext();
                await this.tokenInputChanged();
            },
        },
        template:
            `
                <div class="tab-pane flexrow">
                    <div id="add-input">
                        <div class="margined">
                            <div class="mainheader">Add New Token</div>
                            <div id="add-explanation" class="smallfont margined">
                                <div>
                                    See guide on
                                    <a href="https://community.trustwallet.com/t/how-to-submit-a-token-logo/3863"
                                        target="_blank">community</a> and
                                    <a href="https://developer.trustwallet.com/add_new_asset"
                                        target="_blank">developer</a> sites.
                                </div>
                                <div>
                                    Fill in the token/project details.
                                    If all is OK, a new
                                    <a href="https://docs.github.com/en/free-pro-team@latest/desktop/contributing-and-collaborating-using-github-desktop/creating-an-issue-or-pull-request"
                                        target="_blank">pull request</a> will be created in your name,
                                    against the <a :href="mainRepoUrl"
                                        target="_blank">assets repo</a>.
                                </div>
                            </div>
                        </div>
                        <div>
                            <div>
                                <logo-preview :logostream="tokenInput.logoStream" v-show="tokenInput.logoStream"
                                    :tokenname="tokenInput.name.substring(0, 16)" />
                            </div>
                            <div>
                                <button class="button"
                                    onclick="document.getElementById('input.file-selector').click();">Upload Logo</button>
                                <input id="input.file-selector" type="file" style="display: none;"
                                    v-on:change="logoFileSelected()" />
                                <span v-html="inputLogoFilename" v-bind:title="inputLogoDetails" id="input.logo-input" class="smallfont"></span>
                            </div>
                            <div class="smallfont error padded">
                                {{errorLogo}} 
                            </div>
                            <div>
                                <select v-model="tokenInput.type" class="input wide"
                                            v-on:change="tokenInputChanged()">
                                            <option value="erc20">ERC20 (Ethereum)</option>
                                            <option value="bep2">BEP2 (Binance)</option>
                                            <option value="bep20">BEP20 (Binance Smart Chain)</option>
                                            <option value="trc10">TRC10 (Tron)</option>
                                            <option value="trc20">TRC20 (Tron)</option>
                                </select>
                            </div>
                            <div><input v-model="tokenInput.contract" class="input"
                                            placeholder="Contract / ID" size="40"
                                            v-on:change="tokenInputContractChanged()" />
                            </div>
                            <div class="smallfont padded" v-show="tokenInput.type && !tokenInput.contract">
                                Search for tokens:
                                <a v-bind:href="script.assets.explorerUrlForChain(tokenInput.type)">{{script.assets.explorerUrlForChain(tokenInput.type)}}</a>
                            </div>
                            <div class="smallfont error padded">
                                <span v-show="fixedContract"><a v-on:click="tokenInput.contract = fixedContract; tokenInputContractChanged()">Fix</a></span>
                                {{errorContract}} 
                            </div>
                            <div>
                                <input v-model="tokenInput.name" class="input wide" placeholder="Token Name"
                                            v-on:change="tokenInputNameChanged()" />
                            </div>
                            <div>
                                <input v-model="tokenInput.website" class="input"
                                    placeholder="Website" size="40"
                                    v-on:change="tokenInputWebsiteChanged()" />
                            </div>
                            <div class="smallfont error padded">
                                <span v-show="fixedWebsite"><a v-on:click="tokenInput.website = fixedWebsite; tokenInputWebsiteChanged()">Fix</a></span>
                                {{errorWebsite}} 
                            </div>
                            <div>
                                <input v-model="tokenInput.explorerUrl" class="input"
                                    placeholder="Explorer URL"
                                    size="40" v-on:change="tokenInputExplorerChanged()" />
                                    </td>
                            </div>
                            <div class="smallfont error padded">
                                <span v-show="fixedExplorer"><a v-on:click="tokenInput.explorerUrl = fixedExplorer; tokenInputExplorerChanged()">Fix</a></span>
                                {{errorExplorer}} 
                            </div>
                            <div>
                                <textarea v-model="tokenInput.description" class="input wide"
                                            placeholder="Short description" rows="2"
                                            v-on:change="tokenInputDescriptionChanged()"></textarea>
                            </div>
                            <div>
                                <button class="button" type="button"
                                    v-on:click="checkInputButton()">
                                    {{checkButtonText ? checkButtonText : 'Check'}}
                                </button>
                                <button class="button" type="button" v-on:click="createPullButton()">
                                    {{prButtonText ? prButtonText : 'Create Pull Request'}}
                                </button>
                                <button class="button" type="button" v-show="debugMode"
                                    v-on:click="clearInput()">Clear</button>
                            </div>
                        </div>
                    </div>
                    <div v-show="debugMode" id="add-debug-mode">
                        <div>Debug Mode</div>
                        <div>
                            <button class="button" type="button" v-on:click="debugFillWithDummyData();">Fill
                                test
                                data</button>
                            <input type="checkbox" id="debug_pr_target_fork_cb" v-model="debugPrTargetFork" /><label
                                for="debug_pr_target_fork_cb">Create PR in
                                fork
                            </label>
                        </div>
                    </div>
                </div>
            `
    });

    Vue.component('main-pulls', {
        props: {
            userToken: String,
            loginName: String,
            repo: String,
            enabled: String,
        },
        data: function () {
            return {
                tokenInfo: new script.assets.TokenInfo(),
            }
        },
        methods: {
            onPullSelectToken: async function (token) {
                if (!token) {
                    this.tokenInfo = new script.assets.TokenInfo();
                } else {
                    this.tokenInfo = await script.assets.tokenInfoOfExistingTokenInRepo(token.type, token.id,
                        token.owner, token.repo, token.branch, true);
                }
            },
        },
        template:
            `
                <div class="tab-pane flexrow">
                    <div id="pulls-list">
                        <div class="mainheader">Pull Requests</div>
                        <pulls-list :user-token="userToken" :enabled="enabled" v-on:selecttoken="onPullSelectToken"></pulls-list>
                    </div>
                    <token-view :token-info="tokenInfo"></token-view>
                </div>
            `
    });

    Vue.component('main-token-search', {
        props: {
            userToken: String,
            loginName: String,
            repo: String,
        },
        data: function () {
            return {
                tokenInfo: new script.assets.TokenInfo(),
            }
        },
        methods: {
            onSearchSelectToken: async function (token) {
                if (!token) {
                    this.tokenInfo = new script.assets.TokenInfo();
                } else {
                    this.tokenInfo = await script.assets.tokenInfoOfExistingToken(token.type, token.token_id, true);
                }
            },
        },
        template:
            `
                <div class="tab-pane flexrow">
                    <div id="search">
                        <div class="mainheader">Token Search</div>
                        <token-search v-on:selecttoken="onSearchSelectToken"></token-search>
                    </div>
                    <token-view :token-info="tokenInfo"></token-view>
                </div>
            `
    });

    var app = new Vue({
        el: '#app',
        async created() {
            this.initialized = false;
            this.userToken = getTokenQP();
            this.loginName = await checkUser(this.userToken);
            this.maintainerMode = getQueryParam("maintainer");
            const resp = await fetch("/get-version");
            if (resp.status == 200) {
                this.version = await resp.text();
            }
            // leave it last, slower
            this.repo = await checkRepo(this.userToken, this.loginName, (r) => { this.repoSearchProgress += "."; });
            this.initialized = true;
        },
        data: {
            initialized: false,
            userToken: null,
            loginName: null,
            repo: null,
            version: '',
            activeTab: 'tab-add',
            maintainerMode: false,
            repoSearchProgress: '.',
        },
        methods: {
            selectTab: async function (tab) {
                this.activeTab = tab;
            },
            clearUser: function () {
                this.userToken = null;
                loginName = '';
            },
            logout: function () {
                this.clearUser();
                window.location.search = updateQueryParams('token', '');
            },
            toggleMaintainerMode: async function () {
                this.maintainerMode = this.maintainerMode ? false : true;
                window.location.search = updateQueryParams('maintainer', this.maintainerMode ? '1' : '');
            },
        }
    });
}
