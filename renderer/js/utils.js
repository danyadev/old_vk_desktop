'use strict';

const { Menu, shell, app, BrowserWindow } = require('electron').remote;
const https = require('https');
const fs = require('fs');

var clientKeys = [
      [2274003, 'hHbZxrka2uZ6jB1inYsH', 'Android'       ], // 0
      [3140623, 'VeWdmVclDCtn6ihuP1nt', 'iPhone'        ], // 1
      [3682744, 'mY6CDUswIVdJLCD3j15n', 'iPad'          ], // 2
      [3697615, 'AlVXZFMUqyrnABp8ncuU', 'Windows'       ], // 3
      [2685278, 'lxhD8OD7dMsqtXIm5IUY', 'Kate Mobile'   ], // 4
      [5027722, 'Skg1Tn1r2qEbbZIAJMx3', 'VK Messenger'  ], // 5
      [4580399, 'wYavpq94flrP3ERHO4qQ', 'Snapster'      ], // 6
      [2037484, 'gpfDXet2gdGTsvOs7MbL', 'Symbian'       ], // 7
      [3502557, 'PEObAuQi6KloPM4T30DV', 'Windows Phone' ], // 8
      [3469984, 'kc8eckM3jrRj8mHWl9zQ', 'Lynt'          ]  // 9
    ],
    verifiedList = null;

var request = (data, writeData, oldResolve) => {
  return new Promise((resolve) => {
    let req = https.request(data, (res) => {
      let body = Buffer.alloc(0);

      res.on('data', (chunk) => body = Buffer.concat([body, chunk]));
      res.on('end', () => (oldResolve || resolve)(body.toString()));
    });

    req.on('error', () => {
      setTimeout(() => request(data, writeData, oldResolve || resolve), 1000 * 3);
    });

    req.write(writeData || '');
    req.end();
  });
}

var unix = () => {
  let homeDownloads = `${process.env.HOME}/Downloads`;

  try {
    return require('child_process').execSync('xdg-user-dir DOWNLOAD', { stdio: [0, 3, 3] });
  } catch(e) {}

  try {
    if(fs.statSync(homeDownloads)) return homeDownloads;
  } catch(e) {}

  return '/tmp/';
}

var downloadsPath = {
  darwin: () => `${process.env.HOME}/Downloads`,
  freebsd: unix,
  linux: unix,
  sunos: unix,
  win32: () => `${process.env.USERPROFILE}/Downloads`.replace(/\\/g, '/')
}[require('os').platform()]();

var getVerified = () => {
  return new Promise(async (resolve) => {
    if(verifiedList) {
      resolve(verifiedList);
      return;
    }

    setTimeout(() => {
      verifiedList = {
        vip: [],
        groups: [-164186598],
        premium: [],
        admins: [88262293, 430107477]
      }

      resolve(verifiedList);
    }, 1000 * 2);

    verifiedList = JSON.parse(await request('https://danyadev.unfox.ru/getLists')).response;
    resolve(verifiedList);
  });
}

var checkVerified = async (official, id) => {
  await getVerified();

  let isGold = verifiedList.premium.concat(verifiedList.groups, verifiedList.admins).includes(id),
      type = isGold ? 'gold' : 'blue', verified = false;

  if(official || verifiedList.vip.includes(id) || isGold) verified = true;

  return {
    isVerified: verified,
    type: verified ? type : 'none',
    icon: verified ? `<img class="img_verified" src="images/verified_${type}.svg">` : ''
  };
}

var createElement = (elem, params = {}, html = '') => {
  elem = typeof elem == 'string' ? document.createElement(elem) : elem;

  elem.innerHTML = html;

  for(let key in params) {
    if(key == 'disabled') elem[key] = params[key];
    else if(params[key] && typeof params[key] == 'object') {
      let value = '';

      for(let i in params[key]) {
        if(params[key][i]) value += (value ? ' ' : '') + params[key][i];
      }

      elem.setAttribute(key, value);
    } else elem.setAttribute(key, params[key]);
  }

  return elem;
}

var addStyle = (elem, styles) => {
  if(!elem || typeof styles != 'object') return;

  if(Array.isArray(elem)) {
    for(let el of elem) addStyle(el, styles);
  } else {
    for(let key in styles) {
      elem.style[key] = styles[key];
    }
  }
}

var each = (iterable, callback) => {
  if(!iterable || typeof callback != 'function') throw Error('Все дерьмо давай по новой');

  let isCollection = false,
      collections = [HTMLCollection, HTMLAllCollection, HTMLFormControlsCollection, HTMLOptionsCollection];

  for(let collection of collections) {
    if(iterable instanceof collection) isCollection = true;
  }

  if(isCollection) iterable = [].slice.call(item);

  for(let i in iterable) callback(iterable[i], i, iterable);
}

var find = (iterable, callback) => {
  if(!iterable || typeof callback != 'function') throw Error('Все дерьмо давай по новой');

  let out, finded = false;

  each(iterable, (value, key) => {
    if(!finded && callback(value, key, iterable)) {
      out = value;
      finded = true;
    }
  });

  return out;
}

module.exports = {
  request,
  clientKeys,
  checkVerified,
  downloadsPath,
  createElement,
  addStyle,
  each, find,
  appPath: app.getAppPath().replace(/\\/g, '/'),
  openLink: (url) => shell.openExternal(typeof url == 'string' ? url : url.innerHTML),
  openVK: (nick) => utils.openLink(`https://vk.com/${nick}`),
  showContextMenu: (template) => Menu.buildFromTemplate(template).popup(getCurrentWindow()),
  isNumber: (num) => !isNaN(parseFloat(num)) && isFinite(num),
  random: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  diff: (a1, a2) => a1.filter(i => !a2.includes(i)).concat(a2.filter(i => !a1.includes(i)))
}
