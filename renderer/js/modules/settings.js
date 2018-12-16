'use strict';

var load = () => {
  qs('.settings_tabs').children[0].classList.add('active');
  qs('.settings_content_block').children[0].classList.add('active');

  [].slice.call(qs('.settings_tabs').children).forEach((item, tab) => {
    item.addEventListener('click', () => {
      if(qs('.settings_tab.active') == item) return;

      qs('.settings_tab.active').classList.remove('active');
      qs('.settings_content.active').classList.remove('active');

      qs('.settings_tabs').children[tab].classList.add('active');
      qs('.settings_content_block').children[tab].classList.add('active');
    });
  });

  selectize('.change_theme', (list, selected) => {
    list.innerHTML = `
      <div class="option">Светлая</div>
      <div class="option">Темная</div>
    `.trim();

    let selectedOption = list.children[Number(settings.get('dark_theme'))];

    selected.innerHTML = selectedOption.innerHTML;
    selectedOption.classList.add('active');
  }, (event, list) => {
    settings.set('dark_theme', !![].slice.call(list.children).indexOf(event.target));

    updateTheme();
  });

  selectize('.change_def_tab', (list, selected) => {
    let menu_list = settings.getDefault().menu.reduce((list, item) => {
          return [...list, item.name];
        }, ['Моя страница']),
        options = document.createDocumentFragment(),
        defTabID = settings.get('def_tab');

    for(let item of menu_list) {
      let elem = utils.createElement('div', { class: 'option' }, item);
      options.appendChild(elem);
    }

    list.appendChild(options);
    selected.innerHTML = menu_list[defTabID];

    list.children[defTabID].classList.add('active');
  }, (event, list) => {
    settings.set('def_tab', [].slice.call(list.children).indexOf(event.target));
  });

  var checkUpdates = checkboxize({
    elem: qs('.check_updates'),
    default: settings.update,
    click: bool => {
      settings.update = bool;
      if(settings.beta && bool) getBetaVersions.enable();
      settings.save();
    }
  });

  var getBetaVersions = checkboxize({
    elem: qs('.get_beta_versions'),
    default: settings.update && settings.beta,
    click: bool => {
      settings.beta = bool;
      if(bool) checkUpdates.enable();
      settings.save();
    }
  });

  var notifyUpdates = checkboxize({
    elem: qs('.notify_updates'),
    default: settings.notify_updates,
    click: bool => {
      settings.notify_updates = bool;
      settings.save();
    }
  });

  var useProxy = checkboxize({
    elem: qs('.use_proxy'),
    default: settings.proxy,
    click: bool => {
      settings.proxy = bool;
      settings.save();
    }
  });

  let exitModal = modal.createModal({
    content: 'modal_exit',
    title: 'Выход',
    html: 'Вы действительно хотите выйти?<br>Будет открыта форма входа',
    buttons: [{ text: 'ОК' }, { text: 'Отмена', role: 'close' }],
    init: (modal) => {
      modal.buttons[0].addEventListener('click', () => {
        settings.def_tab = defaultSettings.def_tab;
        settings.save();

        users.remove(users.get().id);

        getCurrentWindow().reload();
      });
    }
  });

  qs('.logout').addEventListener('click', () => exitModal.toggle());
  qs('.edit_menu_btn').addEventListener('click', () => modal.editMenu.toggle());

  qs('.about_version').innerHTML = `Версия ${packageJSON.version} (${packageJSON.build})`;
}

var selectize = (sel, init, change) => {
  let select = qs(sel),
      list = select.children[1],
      selected = select.children[0].children[1];

  init(list, selected);

  let closeSelect = () => {
    if(event.path.indexOf(select) == -1) {
      select.classList.remove('select_opened');
      document.body.removeEventListener('click', closeSelect);
    }
  }

  select.addEventListener('click', () => {
    select.classList.toggle('select_opened');

    if(select.classList.contains('select_opened')) {
      document.body.addEventListener('click', closeSelect);
    }
  });

  list.addEventListener('click', () => {
    selected.innerHTML = event.target.innerHTML;
    qs(`${sel} .active`).classList.remove('active');
    event.target.classList.add('active');

    change(event, list);
  });
}

// qs('.custom_input').addEventListener('click', () => {
//   qs('.custom_input_input').focus();
// });

// vkapi.method('account.getProfileInfo').then(data => {
//   qs('.settings_nick').value = data.response.screen_name || `id${users.get().id}`;
// });

var checkboxize = (opts) => {
  if(!opts) return;

  if(opts.default) opts.elem.classList.add('active');

  opts.elem.addEventListener('click', () => {
    opts.click && opts.click(!opts.elem.classList.contains('active'));

    opts.elem.classList.toggle('active');
  });

  return {
    toggle: () => opts.elem.classList.toggle('active'),
    enable: () => opts.elem.classList.add('active'),
    disable: () => opts.elem.classList.remove('active'),
    check: () => opts.elem.classList.contains('active')
  }
}

module.exports = {
  load,
  checkboxize
}
