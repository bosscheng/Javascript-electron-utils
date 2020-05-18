/**
 * Date: 5/18/20
 * Desc: 自动更新
 */

const fs = require('fs');
const path = require('path');
// The semantic versioner for npm
const semver = require('semver');
//
const crypto = require('crypto');
//
const {exec} = require('child_process');
//
const {renameSync, createWriteStream, existsSync, readdirSync} = require('fs');
// The UNIX command rm -rf for node.
const {sync} = require('rimraf');

const {app, ipcMain, shell} = require('electron');

const {isMac, isWin} = require('platform');

const OLD_ARCHIVE_PREFIX = 'old-';



const HttpClient = require('./http-client');

// http client
const httpClient = new HttpClient({
    config: {
        pkg: '0.0.1',
        name: 'test',
        host: 'http://test.com'
    }
});

class AutoUpdator {
    constructor(e) {
    }

    async update() {

    }

    // unzip and reinstall
    async unzipAndReinstall() {
        // 当前的可执行文件
        const exePath = app.getPath('exe');
        // 临时文件夹
        const tempPath = app.getPath('temp');

        const resourcePath = isMac ? path.resolve(exePath, '..', '..', 'Resources') : path.resolve(path.dirname(tempPath));

        const appPath = path.resolve(resourcePath, 'app.asar');
        const latestPath = path.resolve(resourcePath, 'latest.asar');
        const latestPath2 = path.resolve(resourcePath, 'latest');
        const latestPathZip = `${latestPath}.zip`;
        const latestPathExe = `${latestPath2}.exe`;

        try {
            await this.cleanOldArchive();
        } catch (e) {

        }


        if (isMac) {
            // mac
        } else {
            // window
        }
    }

    // clean old archive
    cleanOldArchive(path) {
        readdirSync(path).filter(e => e.startsWith(OLD_ARCHIVE_PREFIX)).forEach((tempPath) => {
            const tempPathDir = path.join(path, tempPath);
            if (existsSync(tempPathDir)) {
                readdirSync(tempPathDir);
            }
        })
    }

    downloadFile() {

    }

    // 检查更新
    async check() {

    }
}


module.exports = AutoUpdator;

