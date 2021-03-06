/**
 * Date: 5/15/20
 * Desc: 需要依赖http-client 模块 来实现 download 功能。
 */

const {app, dialog} = require('electron');
const {createWriteStream} = require('fs');
const {parse} = require('url');
const path = require('path');


const HttpClient = require('./http-client');

// http client
const httpClient = new HttpClient({
    config: {
        pkg: '0.0.1',
        name: 'test',
        host: 'http://test.com'
    }
});

const downloadFile = async (browserWindow, url) => {
    const downloadPath = app.getPath('downloads');
    const {pathname} = parse(url);
    const fileName = pathname.split('/').pop();
    const localFilePath = path(downloadPath, fileName);

    const {canceled, filePath} = await dialog.showSaveDialog(browserWindow, {
        title: '保存附件',
        default: localFilePath
    })

    if (!canceled) {
        const savedFilePath = path.join(path.dirname(filePath), fileName);
        const writeSteam = createWriteStream(savedFilePath);

        const request = httpClient.request(url, {
            headers: {
                'Content-Type': null
            },
            streaming: true,
            followRedirect: true
        })

        const needShowProgress = Number(request.headers['content-length']) > 1048576;

        const downloadResponse = (type) => {
            browserWindow.webContents.send('download-progress', {type});
        }

        request.res.on("data", data => {
            writeSteam.write(data);

            if (needShowProgress) {
                downloadResponse('data');
            }
        });

        request.res.on('end', () => {
            writeSteam.end();
            downloadResponse('end');
        });

        request.res.on('error', () => {
            downloadResponse('error');
        })
    }
};

module.exports = downloadFile;