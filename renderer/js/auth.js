'use strict';

var wrapper_login = qs('.wrapper_login');

var init = () => {
  let login_input = qs('.login_input'),
      password_input = qs('.password_input input'),
      show_password = qs('.show_password'),
      twofa_info = qs('.twofa_info'),
      error_info = qs('.error_info'),
      login_button = qs('.login_button'),
      sms_code = qs('.sms_code_input'),
      login_cancel = qs('.login_cancel');

  let settingsModal = modal.createModal({
    wrap: '',
    content: 'settings_modal',
    title: 'Настройки',
    html: `<div class="settings_checkbox use_proxy_server">Использовать прокси-сервер</div>`,
    buttons: [{ text: 'Закрыть', role: 'close' }],
    init: (modal) => {
      require('./modules/settings').checkboxize({
        elem: modal.content.children[0],
        default: settings.proxy,
        click: (bool) => settings.set('proxy', bool)
      });
    }
  });

  qs('.open_settings').addEventListener('click', () => {
    settingsModal.toggle();
  });

  show_password.addEventListener('click', () => {
    show_password.classList.toggle('active');
    password_input.type = password_input.type == 'password' ? 'text' : 'password';
  });

  wrapper_login.onkeydown = (e) => {
    if(e.keyCode == 13) login_button.click();
  }

  login_input.oninput = password_input.oninput = sms_code.oninput = () => {
    if(login_input.value.trim() && password_input.value.trim()
    && !(sms_code.style.display == 'block' && !sms_code.value.trim())) {
      login_button.disabled = false;
    } else login_button.disabled = true;
  }

  login_button.addEventListener('click', () => {
    login_button.disabled = true;
    error_info.innerHTML = '';
    auth();
  });

  login_cancel.addEventListener('click', () => {
    login_cancel.style.display = 'none';
    login_button.style.display = 'block';
    login_button.style.width = '250px';

    sms_code.style.display = 'none';
    twofa_info.innerHTML = '';
    login_input.value = '';
    password_input.value = '';
    error_info.innerHTML = '';

    login_button.disabled = true;
    login_input.disabled = false;
    password_input.disabled = false;
  });

  qs('.open_multiacc').addEventListener('click', () => {
    modal.multiaccount.toggle();
  });
}

var auth = async (params) => {
  var login_input = qs('.login_input'),
      password_input = qs('.password_input input'),
      twofa_info = qs('.twofa_info'),
      error_info = qs('.error_info'),
      login_button = qs('.login_button'),
      sms_code = qs('.sms_code_input'),
      login_cancel = qs('.login_cancel');

  let data = await vkapi.auth({
    login: login_input.value,
    password: password_input.value,
    platform: 0,
    code: sms_code.value
  });

  if(data.ban_info) {
    error_info.innerHTML = `${data.ban_info.member_name}, ${data.ban_info.message}.`;
    twofa_info.innerHTML = '';

    login_cancel.style.display = 'none';
    login_button.style.display = 'block';
    login_button.style.width = '250px';
    login_input.disabled = false;
    password_input.disabled = false;

    return;
  }

  if(data.error && !data.access_token) {
    if(data.error == 'invalid_client' || data.error == 'invalid_request') {
      login_button.disabled = false;
      error_info.innerHTML = data.error_description;
    } else if(data.error == 'need_validation') {
      sms_code.style.display = 'block';
      sms_code.focus();

      error_info.innerHTML = '';
      twofa_info.innerHTML = `Смс придет на номер ${data.phone_mask}`;

      login_cancel.style.display = 'inline-block';
      login_button.style.display = 'inline-block';
      login_button.style.width = '123px';
      login_cancel.style.width = '123px';

      login_input.disabled = true;
      password_input.disabled = true;
    }

    return;
  }

  login_cancel.style.display = 'none';
  login_button.style.display = 'block';
  login_button.style.width = '250px';

  error_info.innerHTML = '';
  twofa_info.innerHTML = '';

  let user_info = await vkapi.method('users.get', {
        access_token: data.access_token,
        fields: 'status,photo_100,screen_name'
      }),
      user = {
        active: true,
        id: data.user_id,
        screen_name: user_info.response[0].screen_name || `id${data.user_id}`,
        platform: data.platform,
        login: data.login,
        password: data.password,
        first_name: user_info.response[0].first_name,
        last_name: user_info.response[0].last_name,
        photo_100: user_info.response[0].photo_100,
        status: user_info.response[0].status,
        access_token: data.access_token,
        online_token: data.access_token
      };

  wrapper_content.classList.add('active');

  users.add(user);

  modal.multiaccount.deleted = [];

  require('./init')(user);
}

var authByToken = async () => {
  let token = modal.authToken.content.children[0].value,
      data = await vkapi.method('users.get', {
        access_token: token,
        fields: 'status,photo_100,screen_name'
      });

  if(data.error) {
    modal.authToken.content.children[1].innerHTML = data.error.error_code == 5
              ? 'Неверный access_token'
              : `Неизвестная ошибка<br>(${data.error.error_description})`;

    modal.authToken.buttons[0].disabled = false;
    return;
  }

  if(users.getAll().find(u => u.id == data.response[0].id)) {
    modal.authToken.content.children[1].innerHTML = 'Данный пользователь уже авторизован';
    return;
  }

  let user = {
    active: true,
    id: data.response[0].id,
    screen_name: data.screen_name || `id${data.response[0].id}`,
    platform: 0,
    first_name: data.response[0].first_name,
    last_name: data.response[0].last_name,
    photo_100: data.response[0].photo_100,
    status: data.response[0].status,
    access_token: token,
    online_token: token
  };

  users.add(user);

  if(!qs('.wrapper_login')) {
    modal.multiaccount.render();
    modal.authToken.toggle();
    modal.auth.toggle();

    return;
  }

  wrapper_content.classList.add('active');
  modal.authToken.toggle();
  require('./init')(user);
}

module.exports = {
  init,
  authByToken
}
