const readline = require("readline");
const { Key: rsa, hex2b64 } = require("node-bignumber");
const p = require("phin");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (query) => new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));

class api {
    static async #getsessionid(cookie) {
        const res = await p({
            method: "GET",
            url: `https://steamcommunity.com/my/edit`,
            headers: { Cookie: cookie },
        });

        const headers = res.headers["set-cookie"].join(";");
        const sessionid = headers.match(/sessionid=(.+?);/)[1];

        return sessionid;
    };

    static async #encryptpassword(username, password) {
        const res = await p({
            method: "POST",
            url: `https://steamcommunity.com/login/getrsakey/`,
            form: {
                username: username,
                donotcache: new Date().getTime(),
            },
            parse: "json",
        });

        const json = res.body;

        const mod = json["publickey_mod"];
        const exp = json["publickey_exp"];

        const key = new rsa();
        key.setPublic(mod, exp);

        const encryptedpassword = hex2b64(key.encrypt(password));
        const timestamp = json["timestamp"];

        return { encryptedpassword, timestamp };
    };

    static async login(username, password, emailauth, emailsteamid, captchagid, captcha_text, twofactorcode) {
        emailauth = emailauth || "";
        emailsteamid = emailsteamid || "";
        captchagid = captchagid || "";
        captcha_text = captcha_text || "";
        twofactorcode = twofactorcode || "";

        const { encryptedpassword, timestamp } = await this.#encryptpassword(username, password);

        const res = await p({
            method: "POST",
            url: `https://steamcommunity.com/login/dologin/`,
            form: {
                username: username,
                password: encryptedpassword,
                rsatimestamp: timestamp,
                remember_login: "false",
                captchagid: captchagid,
                captcha_text: captcha_text,
                emailauth: emailauth,
                emailsteamid: emailsteamid,
                twofactorcode: twofactorcode,
                donotcache: new Date().getTime(),
            },
            parse: "json",
        });

        const json = res.body;

        if (json["message"] === "The account name or password that you have entered is incorrect.") throw new Error("invalid login.");

        if (!json["success"]) {
            if (json["captcha_needed"]) {
                captchagid = json["captcha_gid"];
                console.log(`captcha url: https://steamcommunity.com/public/captcha.php?gid=${gid}`);
                captcha_text = await prompt("enter captcha: ");
            }

            if (json["emailauth_needed"]) {
                emailsteamid = json["emailsteamid"];
                console.log(`code sent to email ${json["emaildomain"]}`);
                emailauth = await prompt(`enter captcha: `);
            }

            if (json["requires_twofactor"]) {
                console.log("code sent to phone");
                twofactorcode = await prompt("enter code: ");
            }

            return this.login(username, password, emailauth, emailsteamid, captchagid, captcha_text, twofactorcode);
        }

        const id64 = json["transfer_parameters"]["steamid"];
        const loginsecure = json["transfer_parameters"]["steamid"] + "%7C%7C" + json["transfer_parameters"]["token_secure"];
        const sessionid = await this.#getsessionid(loginsecure);
        const cookie = `sessionid=${sessionid}; steamLoginSecure=${loginsecure};`;

        return { id64, cookie, sessionid };
    };
}

module.exports = api;
