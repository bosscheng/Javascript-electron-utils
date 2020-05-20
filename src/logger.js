/**
 * Date:2020/5/20
 * Desc: 主要依赖 winston 实现本地日志。
 */

const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
const Transport = require('winston-transport');
const {app} = require('electron');
const {format} = winston;


const HttpClient = require('./http-client');

// http client
const httpClient = new HttpClient({
    config: {
        pkg: '0.0.1',
        name: 'test',
        host: 'http://test.com'
    }
});

const logger = function (options = {}) {
    return () => {
        const logDir = options.logDir || path.join(options.debug ? process.cwd() : app.getPath('userData'), 'logs');

        const transportList = [
            new winston.transports.DailyRotateFile({
                dirname: path.join(logDir, options.name),
                filename: `${options.filename || options.name}-%DATE%.log`,
                maxSize: '15m',
                maxFiles: 7,
                createSymlink: true,
                symlinkName: `${options.symlinkName || options.name}.log`
            }),
            new class extends Transport {
                constructor(props) {
                    super(props);
                    this.options = props;
                }

                log(options = {}, callback) {
                    if (process.env.DISABLE_LOG_REMOTE) {
                        return;
                    }

                    const data = {
                        type: this.options.name,
                        message: `${options.timestamp} ${options.message}`
                    };

                    const url = '/electron/log';

                    httpClient.request(url, {
                        method: 'POST',
                        contentType: "json",
                        data: data,
                        disableLogger: true,
                    }).catch(() => {

                    });

                    callback(null, true);
                }
            }(options)
        ];

        if (process.env.CONSOLE_LOGGER) {
            transportList.push(new winston.transports.Console);
        }

        return new winston.createLogger({
            format: format.combine(
                format.label({label: options.name}),
                format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
                format.splat(),
                format.simple(),
                format.printf(({level, timestamp, message, label}) => {
                    const {tracert = {}, currentUser = {}} = options.currentContext || {};
                    return [timestamp, level.toUpperCase(), `[${label}]`, tracert.traceId, currentUser.id, message].join("^")
                })
            ),
            transports: transportList
        })
    }
};
