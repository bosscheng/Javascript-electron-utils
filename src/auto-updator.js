/**
 * Date: 5/18/20
 * Desc: 自动更新
 */

const fs = require('fs');
//
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
const {sync: rimrafSync} = require('rimraf');

const {app, ipcMain, shell} = require('electron');

const {isMac, isWin} = require('./platform');

const OLD_ARCHIVE_PREFIX = 'old-';

const public_key = 'xxx';

const HttpClient = require('./http-client');

// http client
const httpClient = new HttpClient({
    config: {
        pkg: '0.0.1',
        name: 'test',
        host: 'http://test.com'
    }
});


const sleep = e => new Promise(t => setTimeout(t, e));

const waitUtil = async (callback, options = {ms: 1000, retryTime: 10}) => {
    let retryTime = 0;
    const fn = async () => {
        let waitResult = callback();
        if (waitResult) {
            return true;
        } else {
            if (retryTime !== options.retryTime) {
                retryTime++;

                await sleep(options.ms);
                return await fn();
            } else {
                return false;
            }
        }
    };

    return await fn();
}

class AutoUpdator {
    constructor(e) {
        this.app = e;
    }

    //
    async update({url, installerURL, signature}) {
        const exePath = app.getPath('exe');
        const tempPath = app.getPath('temp');
        const resourcePath = isMac ? path.resolve(exePath, '..', '..', 'Resources') : path.resolve(path.dirname(tempPath));
        const latestPathMac = path.resolve(resourcePath, 'latest.asar');
        const latestPathWin = path.resolve(resourcePath, 'latest');
        const latestPathMacZip = `${latestPathMac}.zip`;
        const latestPathWinExe = `${latestPathWin}.exe`;
        const downLoadUrl = isMac ? url : installerURL;
        const localSavedDir = isMac ? latestPathMacZip : latestPathWinExe;
        let progress = 0;
        try {
            await this.downloadFile(downLoadUrl, signature, localSavedDir, ({totalLength, currentLength}) => {
                if (currentLength / totalLength * 100 > 0) {
                    progress++;
                    this.app.mainWindow.webContents.send('update-download-progress', {progress: progress})
                }
            })
        } catch (e) {
            this.app.mainWindow.webContents.send('update-download-failed');
            console.warn(e);
        }

        await this.unzipAndReinstall();
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
        const latestPathMacZip = `${latestPath}.zip`;
        const latestPathWinExe = `${latestPath2}.exe`;


        try {
            await this.cleanOldArchive();
        } catch (e) {
            console.warn(e);
        }

        if (isMac) {
            // mac
            if (!existsSync(latestPathMacZip)) {
                return this.app.mainWindow.webContents.send('update-download-failed');
                try {
                    await exec(`unzip -o ${latestPathMacZip}`, {cwd: resourcePath, maxBuffer: 2 ** 28})
                } catch (e) {
                    console.warn(e);
                }

                let waitResult = await waitUtil(() => existsSync(latestPath), {
                    ms: 1000,
                    retryTime: 30
                })

                if (!waitResult) {
                    return this.app.mainWindow.webContents.send('update-download-failed');
                }
                const newAppPath = path.resolve(resourcePath, `${OLD_ARCHIVE_PREFIX}${(new Date).getTime()}.asar`);
                // 讲原本的app.asar
                renameSync(appPath, newAppPath);
                // 将 原本的
                renameSync(latestPath, appPath);
            }
        } else {
            // window

            if (!existsSync(latestPathWinExe)) {
                return this.app.mainWindow.webContents.send('update-download-failed');
            }

            ipcMain.on('quit-and-reinstall-windows', () => {
                shell.openItem(latestPathWinExe);
                setTimeout(() => {
                    app.exit(0);
                }, 30);
            });
        }

        this.app.mainWindow.webContents.send('update-download-ready');
    }

    // clean old archive
    cleanOldArchive(path) {
        readdirSync(path).filter(e => e.startsWith(OLD_ARCHIVE_PREFIX)).forEach((tempPath) => {
            const tempPathDir = path.join(path, tempPath);
            if (existsSync(tempPathDir)) {
                rimrafSync(tempPathDir);
            }
        })
    }

    // download file
    downloadFile(url, signature, localSavedDir, callback) {
        const writeStream = createWriteStream(localSavedDir);
        const verify = crypto.createVerify('SHA256');
        let downloadSize = 0;
        //
        return new Promise((resolve, reject) => {
            const request = httpClient.request(url, {
                streaming: true,
                followRedirect: true,
                timeout: 600000
            })
            const contentLength = request.headers['content-length'];
            request.res.on('data', (data) => {
                verify.update(data);
                writeStream.write(data);
                downloadSize += data.length;
                callback({currentLength: downloadSize, totalLength: contentLength});
            });

            request.res.on('end', () => {
                verify.end();
                writeStream.end();
                try {
                    // 校验
                    const verifyResult = verify.verify(public_key, signature, 'hex')
                    if (verifyResult) {
                        resolve();
                    } else {
                        reject();
                    }
                } catch (e) {
                    console.warn(e);
                }
            });
            request.res.on('error', reject);
        })

    }

    // 检查更新
    async check(updateUrl, currentVersion, loginName) {
        const response = await httpClient.request(updateUrl, {
            dataType: "json",
            timeout: 1000
        });

        let data = response.data || {};
        let release = data.release || [
            {
                platform: "darwin",
                version: '',
                min_version: '',
                changeLogs: '',
                whiteList: '',
                signature: '',
                url: '',
                installer_url: ''
            },
            {
                platform: "win32"
            }
        ];
        let updateInfo = release.find(e => e.platform === process.platform);

        let needUpdate = semver.lt(currentVersion, updateInfo.version);

        if (updateInfo.whiteList && needUpdate) {
            needUpdate = updateInfo.whiteList.includes(loginName);
        }

        return {
            latestVersion: updateInfo.version,
            currentVersion: currentVersion,
            needUpdate: needUpdate,
            needForceUpdate: semver.lt(currentVersion, updateInfo.min_version),
            url: updateInfo.url,
            installerURL: updateInfo.installer_url,
            signature: updateInfo.signature,
            changeLogs: updateInfo.changeLogs
        }
    }
}


module.exports = AutoUpdator;

