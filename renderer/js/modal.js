'use strict';

const { app } = require('electron').remote;

var createModal = (opts) => {
  let modal = utils.createElement('div', { class: 'modal' }),
      buttons = utils.createElement('div', { class: 'modal_bottom' }),
      c = (text) => [undefined, null].includes(text) ? '' : text,
      closable = opts.closable == undefined || !!opts.closable;

  let toggle = (e) => {
    if(!document.contains(modal)) {
      if(typeof opts.init == 'function') opts.init(data);
      modal.classList.remove('active');
      document.body.appendChild(modal);
      setTimeout(toggle, 100);
      return;
    }

    if(!e || e.path.indexOf(modal.children[0]) == -1) {
      modal.classList.toggle('active');

      if(!modal.classList.contains('active') && modal.close) modal.close();
    }
  }

  for(let item of opts.buttons || []) {
    let button = utils.createElement('input', {
      class: `button modal_bottom_${item.float || 'right'} ${c(item.class)}`,
      value: c(item.text),
      type: 'button',
      disabled: !!item.disabled
    });

    if(item.role == 'close') button.addEventListener('click', () => toggle());

    buttons.appendChild(button);
  }

  modal.innerHTML = `
    <div class="modal_wrap ${c(opts.wrap)}">
      <div class="modal_header">
        <div class="modal_header_title">${c(opts.title)}</div>
        ${closable ? '<div class="modal_header_close"></div>' : ''}
      </div>
      <div class="modal_content theme_bgc ${c(opts.content)}">${c(opts.html).trim()}</div>
    </div>
  `.trim();

  modal.children[0].appendChild(buttons);

  if(closable) {
    modal.children[0].children[0].children[1].addEventListener('click', () => toggle());
    modal.addEventListener('click', toggle);
  }

  let data = {
    modal, toggle,
    buttons: [].slice.call(buttons.children),
    content: modal.children[0].children[1]
  }

  return data;
}

/* Капча */

var captcha = (src, sid) => {
  return new Promise((resolve, reject) => {
    if(settings.get('proxy')) src = src.replace('api.vk.com', 'vk-api-proxy.xtrafrancyz.net');

    createModal({
      wrap: 'captcha_wrap',
      content: 'captcha',
      title: 'Капча',
      closable: false,
      html: `
        <div class="captcha_img">
          <img src='${src}' onclick="this.src += ~this.src.indexOf('r=') ? '1' : '&r=1'">
        </div>
        <div class="captcha_info">Нажмите на картинку для обновления</div>
        <div class="captcha_key"><input placeholder="Введите код с картинки" class="input"></div>
      `,
      buttons: [{ text: 'Продолжить', disabled: true }],
      init: (modal) => {
        let input = modal.content.children[2].children[0],
            btn = modal.buttons[0];

        input.addEventListener('input', () => {
          if(input.value.trim()) btn.disabled = false;
          else btn.disabled = true;
        });

        modal.content.addEventListener('keydown', (e) => {
          if(e.keyCode == 13) btn.click();
        });

        btn.addEventListener('click', () => {
          modal.toggle();
          setTimeout(() => modal.modal.remove(), 150);

          resolve({ captcha_key: input.value, captcha_sid: sid });
        });

        modal.toggle();
      }
    });
  });
}

/* Авторизация по токену */

var authToken = createModal({
  wrap: 'auth_token_wrap',
  content: 'auth_token',
  title: 'Авторизация по токену',
  html: `
    Для полноценной работы приложения необходимы все права доступа
    <input type="text" class="input auth_token_input" placeholder="Введите access_token">
    <div class="auth_token_error"></div>
  `,
  buttons: [{ text: 'Войти', disabled: true }],
  init: (modal) => {
    modal.content.children[0].addEventListener('input', (e) => {
      let text = e.target.value;

      if(text.match(/^[A-z0-9]{85}$/)) {
        modal.buttons[0].disabled = false;
      } else modal.buttons[0].disabled = true;
    });

    modal.buttons[0].addEventListener('click', () => {
      modal.content.children[1].innerHTML = '';
      modal.buttons[0].disabled = true;

      require('./auth').authByToken(modal);
    });
  }
});

/* Мультиаккаунт */

var multiaccount = createModal({
  wrap: 'multiaccount_list_wrap',
  content: 'multiaccount_list',
  title: 'Список аккаунтов',
  buttons: [
    { text: 'Сохранить', disabled: true },
    { text: 'Добавить', float: 'left' }
  ],
  init: (modal) => {
    modal.deleted = [];
    modal.activeID = (users.get() || {}).id;
    modal.list = Object.keys(users.getAll());

    modal.render = () => {
      modal.content.innerHTML = '';
      let usersList = Object.values(users.getAll());

      for(let user of usersList) {
        modal.content.innerHTML += `
          <div class="multiaccount_item ${user == users.get() ? 'active' : ''}" data-id="${user.id}">
            <div class="multiaccount_image_wrap" onclick="modal.multiaccount.set(${user.id})">
              <img src="${user.photo_100}" class="multiaccount_image">
            </div>
            <div class="multiaccount_names">
              <div class="multiaccount_name">${user.first_name} ${user.last_name}</div>
              <div class="multiaccount_remove" onclick="modal.multiaccount.remove(this)"></div>
              <div class="multiaccount_nick">${'@' + user.screen_name}</div>
            </div>
          </div>
        `.trim();
      }

      modal.checkAdd();
    }

    modal.checkAdd = () => {
      let usersList = Object.values(users.getAll());
      if(!utils.diff(modal.list, usersList.map((user, id) => id)).length && modal.activeID == modal.newID) {
        modal.buttons[0].disabled = true;
      } else modal.buttons[0].disabled = false;
    }

    modal.set = (id) => {
      let old_user = users.get(modal.newID),
          new_user = users.get(id),
          old_div = old_user ? qs(`.multiaccount_item[data-id="${old_user.id}"]`) : null,
          new_div = qs(`.multiaccount_item[data-id="${new_user.id}"]`),
          del_index = modal.deleted.indexOf(id.toString());

      if(old_user == new_user) return;
      if(del_index != -1) modal.deleted.splice(del_index, 1);

      modal.newID = id;

      modal.checkAdd();

      new_div.classList.remove('deleted');
      new_div.classList.toggle('active');

      if(old_user) {
        old_div.children[1].children[1].style.display = 'block';
        old_div.classList.toggle('active');
      }
    }

    modal.remove = (elem) => {
      let user = elem.parentElement.parentElement;

      user.classList.add('deleted');
      modal.deleted.push(user.dataset.id);
      elem.style.display = 'none';
      modal.buttons[0].disabled = false;
    }

    modal.render();

    modal.buttons[0].addEventListener('click', () => {
      users.set(null, 'active', false);
      users.set(modal.newID, 'active', true);

      for(let id of modal.deleted) {
        users.remove(id);
        qs(`.multiaccount_item[data-id="${id}"]`).remove();
      }

      modal.deleted = [];
      modal.buttons[0].disabled = true;

      if((!users.get() && modal.activeID) || modal.activeID != users.get().id) {
        getCurrentWindow().reload();
      }
    });

    modal.buttons[1].addEventListener('click', () => auth.toggle());
  }
});

/* Авторизация */

var auth = createModal({
  wrap: 'account_add_wrap',
  content: 'account_add',
  title: 'Добавить аккаунт',
  html: `
    <input type="text" placeholder="Введите логин" class='input account_login' autofocus>
    <div class="password_wrap">
      <div class="account_show_password"></div>
      <input type="password" class="input account_password" placeholder="Введите пароль">
    </div>
    <input type="text" placeholder="Введите код из смс" class='input account_sms' style='display: none'>
    <div class="account_info"></div>
  `,
  buttons: [
    { text: 'Добавить', disabled: true },
    { text: 'Вход по токену', float: 'left' }
  ],
  init: (modal) => {
    let login = modal.content.children[0],
        password = modal.content.children[1].children[1],
        sms_code = modal.content.children[2],
        login_button = modal.buttons[0],
        show_password = modal.content.children[1].children[0];

    show_password.addEventListener('click', () => {
      show_password.classList.toggle('active');
      password.type = password.type == 'password' ? 'text' : 'password';
    });

    login.oninput = password.oninput = sms_code.oninput = () => {
      let logpass = login.value.trim() && password.value.trim(),
          sms = !(sms_code.style.display == 'block' && !sms_code.value.trim());

      if(logpass && sms) modal.buttons[0].disabled = false;
      else modal.buttons[0].disabled = true;
    }

    modal.buttons[0].addEventListener('click', () => auth.auth());
    modal.buttons[1].addEventListener('click', () => authToken.toggle());

    modal.content.addEventListener('keydown', e => {
      if(e.keyCode == 13 && !modal.buttons[0].disabled) auth.auth();
    });

    modal.close = () => {
      auth.preventDefault();
      multiaccount.render();
    }

    modal.preventDefault = () => {
      sms_code.style.display = 'none';
      modal.content.children[3].innerHTML = '';
      login.value = '';
      password.value = '';

      login.disabled = false;
      password.disabled = false;
      modal.buttons[0].disabled = true;
    }

    modal.auth = async () => {
      let show_password = modal.content.children[1].children[0],
          account_info = modal.content.children[3];

      modal.buttons[0].disabled = true;

      let data = await vkapi.auth({
        login: login.value,
        password: password.value,
        code: sms_code.value,
        platform: 0
      });

      if(data.ban_info) {
        account_info.innerHTML = `${data.ban_info.member_name}, ${data.ban_info.message}.`;

        modal.buttons[0].disabled = false;
        login.disabled = false;
        password.disabled = false;
        sms_code.style.display = 'none';
        sms_code.value = '';

        return;
      }

      if(data.error && !data.access_token) {
        if(data.error == 'invalid_client' || data.error == 'invalid_request') {
          modal.buttons[0].disabled = false;
          account_info.innerHTML = data.error_description;
        } else if(data.error == 'need_validation') {
          sms_code.style.display = '';
          sms_code.focus();

          account_info.innerHTML = `Смс придет на номер ${data.phone_mask}`;

          login.disabled = true;
          password.disabled = true;
        }

        if(account_info.innerHTML) {
          account_info.style.display = 'block';
        }

        return;
      }

      account_info.innerHTML = '';
      account_info.style.display = '';

      let user_info = await vkapi.method('users.get', {
            access_token: data.access_token,
            fields: 'status,photo_100,screen_name'
          }),
          user = {
            active: false,
            id: data.user_id,
            screen_name: user_info.response[0].screen_name || `id${data.user_id}`,
            platform: 0,
            login: login.value,
            password: password.value,
            first_name: user_info.response[0].first_name,
            last_name: user_info.response[0].last_name,
            photo_100: user_info.response[0].photo_100,
            status: user_info.response[0].status,
            access_token: data.access_token,
            online_token: data.access_token
          };

      if(!users.add(user)) {
        account_info.innerHTML = 'Данный пользователь уже авторизован';
        account_info.style.display = 'block';
        login_button.disabled = false;
        login.disabled = false;
        password.disabled = false;

        return;
      }

      multiaccount.list.push(data.user_id);
      multiaccount.render();

      auth.toggle();
      auth.preventDefault();
    }
  }
});

/* Редактирование меню */

var editMenu = createModal({
  wrap: 'edit_menu_wrap',
  content: 'edit_menu',
  title: 'Редактирование меню',
  buttons: [{ text: 'Параметры по умолчанию' }],
  init: (modal) => {
    modal.renderItems = () => {
      let menu_items = document.createDocumentFragment();

      for(let item of settings.get('menu')) {
        let check = '';

        if(item[2] != 'settings') {
          check = `<div class="edit_menu_item_check ${item[0] ? 'checked' : ''}"></div>`;
        }

        menu_items.innerHTML += `
          <div class="edit_menu_item">
            <div class="edit_menu_item_name">${item[1]}</div>
            ${check}
          </div>
        `.trim();
      }

      return menu_items.innerHTML;
    }

    modal.move = (elem) => {
      elem.onmousedown = (e) => {
        if(e.target.classList.contains('edit_menu_item_check')) {
          e.target.classList.toggle('checked');
          modal.saveMenu();

          return;
        }

        elem.classList.add('move');

        let box = elem.getBoundingClientRect(),
            shiftX = e.pageX - box.left,
            shiftY = e.pageY - box.top;

        let moveAt = (e) => {
          let top = e.pageY - shiftY - elem.offsetHeight / 2,
              offsetTop = modal.modal.children[0].offsetTop,
              offsetHeight = modal.modal.children[0].offsetHeight;

          if(top < offsetTop) top = offsetTop;

          if(top + elem.clientHeight > offsetHeight + offsetTop) {
            top = offsetHeight + offsetTop - elem.clientHeight;
          }

          elem.style.top = `${top}px`;

          let menu_items = [].slice.call(modal.content.children),
              firstIndex = menu_items.indexOf(qs('.edit_menu_item.null')),
              lastIndex = menu_items.indexOf(qs('.edit_menu_item.move')),
              firstItem = menu_items[firstIndex - 1],
              lastItem = menu_items[lastIndex + 1];

          if(lastItem && top > lastItem.offsetTop - lastItem.offsetHeight / 2) {
            modal.content.insertBefore(qs('.edit_menu_item.move'), menu_items[lastIndex + 2]);
            modal.content.insertBefore(item_null, qs('.edit_menu_item.move'));
          }

          if(firstItem && top < firstItem.offsetTop + firstItem.offsetHeight / 2) {
            modal.content.insertBefore(qs('.edit_menu_item.move'), menu_items[firstIndex - 1]);
            modal.content.insertBefore(item_null, qs('.edit_menu_item.move'));
          }
        }

        let item_null = document.createElement('div');

        item_null.classList.add('edit_menu_item');
        item_null.classList.add('null');

        modal.content.insertBefore(item_null, elem);

        moveAt(e);

        document.onmousemove = (e) => {
          moveAt(e);
          return false;
        };

        document.onmouseup = () => {
          document.onmousemove = null;
          document.onmouseup = null;

          elem.style = null;
          elem.classList.remove('move');
          item_null.remove();

          modal.saveMenu();
        };
      }

      elem.ondragstart = () => false;
    }

    modal.saveMenu = () => {
      let newMenu = [];

      for(let i in [].slice.call(modal.content.children)) {
        let item = modal.content.children[i],
            oldMenuItem = settings.menu.find((arr) => arr[1] == item.children[0].innerHTML);
        console.log(item, item.children);
        newMenu[i].enabled = item.children[1] ? item.children[1].classList.contains('checked') : true;
      }

      settings.set('menu', newMenu);

      renderMenu();
    }

    modal.content.innerHTML = modal.renderItems();

    for(let i in settings.get('menu')) {
      let elem = modal.content.children[i];

      modal.move(elem);
    }

    modal.buttons[0].addEventListener('click', () => {
      settings.set('menu', defaultSettings.menu);
      renderMenu();

      modal.content.innerHTML = editMenu.renderItems();

      for(let i in settings.get('menu')) {
        let elem = modal.content.children[i];

        modal.move(elem);
      }
    });
  }
});

/* Добавление аудио */

var addAudio = createModal({
  wrap: 'add_audio_wrap',
  content: 'add_audio',
  title: 'Добавление аудио',
  html: 'Скоро...',
  buttons: [{ text: 'Закрыть', role: 'close' }],
  init: (modal) => { /* код */ }
});

/* Обновление */

var update = createModal({
  wrap: 'modal_update_wrap',
  content: 'modal_update',
  title: 'Обновление',
  html: `
    <div class="modal_update_stage1">
      <div class="modal_update_title"></div>
      <div class="modal_update_changelog"></div>
    </div>
    <div class="modal_update_stage2">
      <div class="modal_update_header">
        <div class="modal_update_update">Идет обновление...</div>
        <div class="modal_update_no_close">не закрывайте приложение</div>
      </div>
      <div class="modal_update_spinner"></div>
      <div class="modal_update_info">Загрузка...</div>
    </div>
    <div class="modal_update_stage3">
      <div class="modal_update_stage3_title">Обновление завершено.</div>
      <div class="modal_update_stage3_info">Для применения изменений необходимо перезагрузить приложение. Перезагрузить сейчас?</div>
    </div>
  `,
  buttons: [{ text: 'Обновить' }, { text: 'Скрыть окно' }, { text: 'Позже' }, { text: 'Сейчас' }],
  init: (modal) => {
    modal.buttons[1].style.display = 'none';
    modal.buttons[2].style.display = 'none';
    modal.buttons[3].style.display = 'none';

    modal.buttons[0].addEventListener('click', () => {
      require('./update').update();

      modal.content.children[0].style.display = 'none';
      modal.content.children[1].style.display = 'flex';

      modal.buttons[0].style.display = 'none';
      modal.buttons[1].style.display = 'block';
    });

    modal.buttons[1].addEventListener('click', () => {
      modal.toggle();
    });

    modal.buttons[2].addEventListener('click', () => {
      modal.toggle();
    });

    modal.buttons[3].addEventListener('click', () => {
      app.relaunch();
      app.exit();
    });
  }
});

module.exports = {
  createModal,
  captcha,
  authToken,
  multiaccount,
  auth,
  editMenu,
  addAudio,
  update
}
