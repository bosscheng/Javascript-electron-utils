/**
 * Date:2020/5/19
 * Desc:
 */

// en
const en = {
    "测试": "test"
};
// 匹配一个单字字符（字母、数字或者下划线）。等价于 [A-Za-z0-9_]。
const interpolate_reg = /\{(\w*)\}/g;
// 默认的是zh
const currentLocale = 'zh';

// replace data
const replaceData = (key, lang) => {
    return key.replace(interpolate_reg, value => {
        const tempKey = value.slice(1, value.length - 1);
        return lang[tempKey] ? lang[tempKey] : key;
    })
};

// title lang
// 默认的是 en 英语
module.exports = ((title, lang = {}) => {
    if (currentLocale === 'zh') {
        return replaceData(title, lang);
    }
    const enLang = en[title];
    return enLang ? replaceData(enLang, lang) : enLang;
});

/**
 * 业务引用的时候，直接通过
 *
 * const i18n = require('i18n');
 * i18n('测试');
 *
 * 如果当前环境是 zh  直接返回 '测试'；
 * 如果是en 环境  返回 'test';
 * */
