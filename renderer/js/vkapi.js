'use strict';

const querystring = require('querystring');

const API_VERSION = '5.84';
var methodsList = [];
var locked = false;

var addToQueue = (method, params, oldResolve) => {
  return new Promise((resolve) => {
    methodsList.push({ method, params, resolve: oldResolve || resolve });
  });
}

setInterval(() => {
  if(methodsList[0] && !locked) {
    method(methodsList[0].method, methodsList[0].params, methodsList[0].resolve);
    methodsList.splice(0, 1);
  }
}, 1000 / 3);

var method = (methodName, params, resolve) => {
  params = params || {};
  params.v = params.v || API_VERSION;
  params.lang = params.lang || 'ru';
  params.access_token = params.access_token || (users.get() || {})[`${params.online ? 'online' : 'access'}_token`];

  console.log(`req: ${methodName}\n`, params);

  return new Promise(async () => {
    let body = JSON.parse(await utils.request({
      host: `${settings.proxy ? 'vk-api-proxy.xtrafrancyz.net' : 'api.vk.com'}`,
      path: `/method/${methodName}`,
      method: 'POST',
      headers: { 'User-Agent': 'VKAndroidApp/5.11.1-2316' }
    }, querystring.stringify(params)));

    console.log(`res: ${methodName}\n`, body);

    if(body.error) {
      if(body.error.error_code == 14) {
        locked = true;
        let data = Object.assign(params, await modal.captcha(body.error.captcha_img, body.error.captcha_sid));

        locked = false;
        addToQueue(methodName, data, oldResolve || resolve);
        return;
      } else if(body.error.error_code == 5 && users.get() || body.error.ban_info) {
        users.set(users.get().id, undefined);
        getCurrentWindow().reload();
      }
    }

    resolve(body);
  });
}

var auth = (params, oldResolve) => {
  params.login = params.login.replace('+', '');
  params.platform = params.platform || 0;

  let client = utils.clientKeys[params.platform],
      reqData = {
        grant_type: 'password',
        client_id: client[0],
        client_secret: client[1],
        username: params.login,
        password: params.password,
        scope: 'all',
        '2fa_supported': true,
        force_sms: true,
        captcha_sid: params.captcha_sid,
        captcha_key: params.captcha_key,
        lang: 'ru'
      };

  if(params.code) reqData.code = params.code;

  return new Promise(async (resolve) => {
    resolve = oldResolve || resolve;

    console.log(reqData);

    let body = JSON.parse(await utils.request({
      host: `${settings.proxy ? 'vk-oauth-proxy.xtrafrancyz.net' : 'oauth.vk.com'}`,
      path: `/token/?${querystring.stringify(reqData)}`
    }));

    console.log(body);

    if(body.error == 'need_captcha') {
      auth(Object.assign({
        login: params.login,
        password: params.password,
        platform: params.platform,
        code: params.code
      }, await modal.captcha(body.captcha_img, body.captcha_sid), body), resolve);
    } else {
      resolve(Object.assign({
        login: params.login,
        password: params.password,
        platform: params.platform,
        code: params.code
      }, body));
    }
  });
}

module.exports = {
  method: addToQueue,
  auth
}
