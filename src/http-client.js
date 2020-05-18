/**
 * Date: 5/15/20
 * Desc: 底层是基于urllib.HttpClient2 进行请求的。
 */

const os = require('os');
const urllib = require('urllib');
const Agent = require('agentkeepalive');
const {HttpsAgent} = require('agentkeepalive');
const {electron: electronVersion} = process.versions;

const config = {
    defaultArgs: {
        timeout: 30000,
        dataType: 'json',
        followRedirect: true
    },
    httpAgent: {
        keepAlive: true,
        freeSocketTimeout: 20000,
        maxSockets: Number.MAX_SAFE_INTEGER,
        maxFreeSockets: 256
    },
    httpsAgent: {
        keepAlive: true,
        freeSocketTimeout: 20000,
        maxSockets: Number.MAX_SAFE_INTEGER,
        maxFreeSockets: 256
    }
};

class HttpClient extends urllib.HttpClient2 {
    constructor(app) {
        const {pkg} = app.config;
        super({
            defaultArgs: config.defaultArgs,
            agent: new Agent(config.httpAgent),
            httpsAgent: new HttpsAgent(config.httpsAgent)
        });

        this.app = app;
        this.UA = `${pkg.name}/${pkg.version};electron/${electronVersion};${encodeURIComponent(os.hostname())};${urllib.USER_AGENT}`;
    }

    async request(url, options = {}) {
        const {app} = this;
        const {host} = app.config || '';

        let request;

        options.headers = {
            "Content-Type": "application/json",
            referer: host,
            "user-agent": this.UA,
            ...options.headers
        };
        const nowDate = Date.now();
        try {
            return request = await super.request(url, options);
        } catch (e) {
            let error = e;
            error.name = 'httpError';
            error.url = url;
            return error;
        } finally {
            // 一次请求的时间差
            const timestamp = Date.now() - nowDate;
            // logger 日志记录
            console.log(timestamp);
        }
    }
}


module.exports = HttpClient;