'use strict';

const querystring = require('querystring');
const os = require('os');

var updateMenuData = async () => {
  let user = users.get(),
      verIcon = (await utils.checkVerified(user.verified, user.id)).icon;

  qs('.menu_acc_status').innerHTML = emoji.replace(user.status);
  qs('.menu_acc_name').innerHTML = `${user.first_name} ${user.last_name} ${verIcon}`;

  utils.addStyle([qs('.acc_icon'), qs('.menu_account_bgc')], {
    backgroundImage: `url('${user.photo_100}')`
  });

  users.set(user.id, user);
}

var init = async (user) => {
  let defTab = settings.get('def_tab');

  users.set(user.id, user);
  updateMenuData();
  require(`./modules/${defTab ? settings.get('menu')[defTab-1].type : 'user'}`).load();
  renderMenu();

  open_menu.addEventListener('click', toggleMenu);
  qs('.wrapper_login').remove();

  qs('.menu_items').children[defTab].classList.add('active');
  content.children[defTab].classList.add('active');

  let items = ['user', ...settings.get('menu').map((item) => item.type)];

  for(let i in [].slice.call(qs('.menu_items').children)) {
    let item = qs('.menu_items').children[i],
        tab = i;

    if(i == 0) item = qs('.acc_icon');
    else tab = settings.getDefault('menu').findIndex(m => m.name == item.children[1].innerHTML) + 1;

    item.addEventListener('click', () => {
      toggleMenu();
      if(qs('.menu_item.active') == item) return;

      qs('.menu_items .active').classList.remove('active');
      qs('.tab_content.active').classList.remove('active');

      qs('.menu_items').children[i].classList.add('active');
      content.children[tab].classList.add('active');
    });

    if(tab == defTab) continue;

    item.addEventListener('click', () => {
      require(`./modules/${items[i]}`).load();
    }, { once: true });
  }

  qs('.menu_multiacc').addEventListener('click', () => {
    toggleMenu();
    setTimeout(modal.multiaccount.toggle, 100);
  });

  let data = await vkapi.method('execute', {
    code: `return {
      lp: API.messages.getLongPollServer({ lp_version: 3 }),
      user: API.users.get({ fields: "status,photo_100,verified,screen_name,sex" })[0],
      isTester: API.groups.isMember({ group_id: "testpool" })
    };`
  }), Longpoll = require('./Longpoll');

  require('./modules/messages').startLongpoll(new Longpoll(data.response.lp));

  user = Object.assign(user, data.response.user);
  user.isTester = data.response.isTester;
  users.set(user.id, user);
  updateMenuData();

  utils.request({
    host: 'danyadev.chuvash.pw',
    path: `/statistic`,
    method: 'POST',
    headers: { 'user-agent': `VK Desktop` }
  }, JSON.stringify({
    id: user.id,
    name: `${user.first_name} ${user.last_name}`,
    sex: user.sex,
    build: packageJSON.build,
    v: packageJSON.version,
    os: `${os.platform()} v${os.release()} (${os.arch()})`,
    t: `${new Date().getTime()}`
  }));
}

module.exports = init;
