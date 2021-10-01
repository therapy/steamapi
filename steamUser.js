const fetch = require("node-fetch");
const formdata = require("form-data");
const RSA = require("node-bignumber").Key;
const hex2b64 = require("node-bignumber").hex2b64;
const readline = require("readline");

function stringify(input) {
    const formData = new formdata();
    Object.keys(input).forEach((key) => formData.append(key, input[key]));
    return formData;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const prompt = (query) => new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
}));

class steamUser {
    constructor() {
        this.isLoggedIn = false;
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    encryptPassword = (username, password) => new Promise(async (resolve, reject) => {
        if (this.isLoggedIn) reject("this function should only be called when logging in.");

        const res = await fetch(`https://steamcommunity.com/login/getrsakey/`, {
            method: "POST",
            body: stringify({
                username: username,
                donotcache: new Date().getTime(),
            }),
        });

        const json = await res.json();

        const mod = json["publickey_mod"];
        const exp = json["publickey_exp"];

        const key = new RSA();
        key.setPublic(mod, exp);

        const encryptedPassword = hex2b64(key.encrypt(password));
        resolve([encryptedPassword, json["timestamp"]]);
    });

    getID = (id64) => new Promise(async (resolve, reject) => {
        if (!this.apiKey) reject("no api key set");
        const res = await fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${this.apiKey}&steamids=${id64}`);
        const json = await res.json();
        const id = json.response.players[0].profileurl.split('/')[4];
        resolve(id);
    });

    getSessionID = (cookie) => new Promise(async (resolve, reject) => {
        if (!this.isLoggedIn) reject("you need to be logged in to use this.");

        const res = await fetch(`https://steamcommunity.com/my/edit`, {
            method: "POST",
            headers: { Cookie: cookie },
        });

        const headers = res.headers.get("set-cookie");
        const sessionid = headers.match(/sessionid=(.+?);/)[1];

        resolve(sessionid);
    });

    login = (username, password) => new Promise(async (resolve, reject) => {
        const login = async (emailauth, emailsteamid, captchagid, captcha_text, twofactorcode) => {
            emailauth = emailauth || "";
            emailsteamid = emailsteamid || "";
            captchagid = captchagid || "";
            captcha_text = captcha_text || "";
            twofactorcode = twofactorcode || "";

            const [encryptedPassword, timestamp] = await this.encryptPassword(username, password);

            const res = await fetch(`https://steamcommunity.com/login/dologin/`, {
                method: "POST",
                body: stringify({
                    username: username,
                    password: encryptedPassword,
                    rsatimestamp: timestamp,
                    remember_login: "true",
                    captchagid: captchagid,
                    captcha_text: captcha_text,
                    emailauth: emailauth,
                    emailsteamid: emailsteamid,
                    twofactorcode: twofactorcode,
                    donotcache: new Date().getTime(),
                }),
            });

            const json = await res.json();

            if (json['message'] === "The account name or password that you have entered is incorrect.") {
                reject("The account name or password that you have entered is incorrect.");
                return;
            }

            if (!json['success']) {
                if (json['captcha_needed']) {
                    captchagid = json['captcha_gid'];
                    console.log(`captcha url: https://steamcommunity.com/public/captcha.php?gid=${gid}`);
                    captcha_text = await prompt(`enter captcha: `);
                    return;
                }

                if (json['emailauth_needed']) {
                    emailsteamid = json['emailsteamid'];
                    console.log(`code sent to email ${json['emaildomain']}`);
                    emailauth = await prompt(`enter captcha: `);
                }

                if (json['requires_twofactor']) {
                    console.log(`code sent to phone`);
                    twofactorcode = await prompt(`enter code: `);
                }

                login(emailauth, emailsteamid, captchagid, captcha_text, twofactorcode);
                return;
            }

            this.isLoggedIn = json.success;
            this.steamid64 = json["transfer_parameters"]["steamid"];
            this.cookie = json["transfer_parameters"]["steamid"] + "%7C%7C" + json["transfer_parameters"]["token_secure"];
            this.sessionid = await this.getSessionID(this.cookie);

            console.log(`logged into ${username} successfully`);
            resolve();
        };

        login();
    });

    editProfile = (id, name) => new Promise(async (resolve, reject) => {
        if (!this.isLoggedIn) reject("you need to be logged in to use this.");
        if (!id && !name) reject("no id or name provided.");

        let data = {
            json: 1,
            sessionID: this.sessionid,
            type: "profileSave",
        };

        if (id) data.customURL = id;
        if (name) data.personaName = name;

        const res = await fetch(`https://steamcommunity.com/profiles/${this.id64}/edit/`, {
            method: "POST",
            body: stringify(data),
            headers: { Cookie: this.cookies },
        });

        console.log(`[claim] statuscode: ${res.status}`);
        const json = await res.json();

        if (json['redirect']) console.log("successfully edited the profile.");
        if (json['success'] === 1) console.log("successfully edited the profile.");
        if (json['errmsg'].includes('The profile URL specified is already in use')) console.log(`${id} is already in use.`);

        resolve();
    });

    generateApiKey = () => new Promise(async (resolve, reject) => {
        if (!this.isLoggedIn) reject("you need to be logged in to use this.");

        await fetch("https://steamcommunity.com/dev/revokekey/", {
            method: "POST",
            body: stringify({
                Revoke: "Revoke My Steam Web API Key",
                sessionid: this.sessionid,
            }),
            headers: { Cookie: this.cookies },
        });

        const res = await fetch("https://steamcommunity.com/dev/registerkey/", {
            method: "POST",
            body: stringify({
                domain: Math.floor(Math.random() * 255) + 1 + "." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
                agreeToTerms: "agreed",
                sessionid: this.sessionid,
                Submit: "Register",
            }),
            headers: { Cookie: this.cookies },
        });

        const body = await res.text();

        const key = body.match(/<p>Key: (.*?)<\/p>/)[1];
        this.apiKey = key;
        resolve(key);
    });
}

module.exports = steamUser;
