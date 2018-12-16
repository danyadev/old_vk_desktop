'use strict';

var group_list = qs('.groups_list'),
    content = qs('.content'),
    groups = {
      count: 0,
      loaded: 0,
      list: []
    };

var pad = (n, tx) => {
  n = Math.abs(n) % 100;

  let n1 = n % 10;

  if(n > 10 && n < 20) return tx[2];
  if(n1 > 1 && n1 < 5) return tx[1];
  if(n1 == 1) return tx[0];

  return tx[2];
}

var load = async (offset = 0) => {
  let data = await vkapi.method('groups.get', {
    extended: 1,
    fields: 'members_count,activity,verified',
    offset: offset
  });

  groups.count = data.response.count;
  groups.list = groups.list.concat(data.response.items);

  if(groups.list.length < data.response.count) {
    load(offset + 1000);
  } else {
    if(!data.response.count) {
      // Вы не состоите ни в одной группе
    } else render();
  }
};

var render = () => {
  let block = document.createDocumentFragment(),
      endID = groups.loaded + 15;

  let renderItem = async () => {
    let item = groups.list[groups.loaded], name,
        members = 'подписчик' + pad(item.members_count, ['', 'а', 'ов']),
        verified = (await utils.checkVerified(item.verified, -item.id)).icon;

    if(item.deactivated) {
      name = '<div class="group_type">Сообщество заблокировано</div>';
    } else if(!item.members_count) {
      name = `
        <div class="group_type">${item.activity}</div><br>
        <div class="group_subs">Сообщество заблокировано</div>
      `.trim();
    } else {
      name = `
        <div class="group_type">${item.activity}</div><br>
        <div class="group_subs">${item.members_count.toLocaleString('ru-RU')} ${members}</div>
      `.trim();
    }

    block.innerHTML += `
      <div class="group_item">
        <img src="${item.photo_100}" class="group_img">
        <div class="group_names">
          <div class="group_name link" onclick="utils.openLink('https://vk.com/${item.screen_name}')">
            ${item.name} ${verified}
          </div><br>
          ${name}
        </div>
      </div>
    `;

    groups.loaded++;

    if(groups.list[groups.loaded] && groups.loaded < endID) {
      setTimeout(renderItem, 0);
    } else {
      group_list.innerHTML += block.innerHTML;

      if(!groups.list[groups.loaded]) qs('.groups_content_wrap').classList.remove('loading');
      else if(groups.loaded < groups.count) loadGroupsBlock();
    }
  }

  renderItem();
}

var loadGroupsBlock = () => {
  content.addEventListener('scroll', renderNewItems);

  let h = window.screen.height > group_list.clientHeight,
      l = group_list.clientHeight - window.outerHeight < content.scrollTop;

  if(h || l) renderNewItems();
}

var renderNewItems = () => {
  let a = qs('.groups').classList.contains('active'),
      h = window.screen.height > group_list.clientHeight,
      l = group_list.clientHeight - window.outerHeight < content.scrollTop;

  if(a && (h || l)) {
    content.removeEventListener('scroll', renderNewItems);
    render();
  }
}

module.exports = {
  load
}
