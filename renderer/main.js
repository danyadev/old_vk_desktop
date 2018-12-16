'use strict';

window.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

const { getCurrentWindow, BrowserWindow } = require('electron').remote;
const packageJSON = require('./../package.json');
const utils = require('./js/utils');
const emoji = require('./js/lib/emoji');
const vkapi = require('./js/vkapi');
const modal = require('./js/modal');
const { each, find } = utils;
const { Settings, Users } = require('./js/db');

const qs = (selector, target) => (target || document).querySelector(selector);
const qsa = (selector, target) => (target || document).querySelectorAll(selector);

const settings = new Settings();
const users = new Users();

var updateTheme = () => {
  if(settings.get('dark_theme')) document.body.classList.add('dark');
  else document.body.classList.remove('dark');
}

updateTheme();

var content = qs('.content'),
    wrapper_content = qs('.wrapper_content'),
    open_menu = qs('.open_menu'),
    open_menu_icon = qs('.open_menu_icon'),
    menu = qs('.menu'),
    isMenuLoaded = false;

var renderMenu = () => {
  if(!isMenuLoaded) {
    isMenuLoaded = true;

    let menu_items = document.createDocumentFragment();

    for(let item of settings.get('menu')) {
      let elem = utils.createElement('div', {
        class: `menu_item ${item.enabled ? '' : 'disabled'}`
      }, `<div class="menu_icon menu_${item.type}_icon"></div>
          <div class="menu_item_name">${item.name}</div>`);

      menu_items.appendChild(elem);
    }

    qs('.menu_items').appendChild(menu_items);
  } else {
    for(let i in settings.get('menu')) {
      let item = settings.get('menu')[i],
          elem = qs(`.menu_${item[2]}_icon`).parentElement;

      elem.classList[item[0] ? 'remove' : 'add']('disabled');

      qs('.menu_items').insertBefore(elem, qs('.menu_items').children[i]);
    }
  }
}

var toggleMenu = () => {
  menu.classList.toggle('active');

  if(menu.classList.contains('active')) {
    content.addEventListener('click', toggleMenu);
  } else {
    content.removeEventListener('click', toggleMenu);
  }
}

if(process.platform == 'darwin') {
  qs('.titlebar').classList.add('mac');

  qs('.titlebar_drag').addEventListener('dblclick', () => {
    if(getCurrentWindow().isFullScreen()) return;

    if(getCurrentWindow().isMaximized()) getCurrentWindow().emit('unmaximize');
    else getCurrentWindow().emit('maximize');
  });
}

getCurrentWindow().on('maximize', () => {
  qs('.titlebar').classList.add('maximized');
});

getCurrentWindow().on('unmaximize', () => {
  qs('.titlebar').classList.remove('maximized');
});

if(getCurrentWindow().isMaximized()) getCurrentWindow().emit('maximize');
else getCurrentWindow().emit('unmaximize');

['minimize', 'maximize', 'restore', 'close'].forEach((name) => {
  qs(`.titlebar_button.${name}`).addEventListener('click', () => getCurrentWindow()[name]());
});

qs('.titlebar_buttons').addEventListener('contextmenu', () => {
  utils.showContextMenu([{
    label: 'Открыть DevTools',
    click: getCurrentWindow().toggleDevTools
  }]);
});

window.addEventListener('beforeunload', () => {
  settings.set('window', getCurrentWindow().getBounds());
  settings.set('volume', require('./js/modules/audio').audio.volume);

  getCurrentWindow().removeAllListeners();

  BrowserWindow.getAllWindows().forEach((win) => {
    if(win != getCurrentWindow()) win.destroy();
  });
});

if(users.get()) {
  wrapper_content.classList.add('active');
  require('./js/init')(users.get());
} else require('./js/auth').init();
