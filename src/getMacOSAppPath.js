"use strict"
const path = require("path");

//
module.exports = (() => {
    const sep = path.sep;
    const execList = process.execPath.split(sep);
    const pathIndex = execList.findIndex((t) => "Applications" === t);
    return execList.slice(0, pathIndex + 2).join(sep);
})