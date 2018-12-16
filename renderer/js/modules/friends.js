'use strict';

var friends_list = qs('.friends_list'),
    danyadev = {};

var getFriends = async () => {
  let data = await vkapi.method('friends.get', {
    order: 'hints',
    fields: 'photo_100,domain,sex,verified,occupation'
  });
  
  danyadev.friends = {};
  danyadev.friends.list = data.response.items;
  danyadev.friends.loaded = 0;
  
  if(!data.response.items.length) {
    qs('.friend_item_err').innerHTML = 'Список друзей пуст';
  } else renderFriends();
}

var load = getFriends;

var renderFriends = () => {
  let block = { innerHTML: '' },
      eid = danyadev.friends.loaded + 15;
      
  if(danyadev.friends.loaded == danyadev.friends.list.length) return;
  
  var renderItem = async () => {
    let item = danyadev.friends.list[danyadev.friends.loaded],
        name = `${item.first_name} ${item.last_name}`,
        occupation = '',
        _v = await utils.checkVerified(item.verified, item.id);
    
    if(_v[0]) {
      name += `<img class="img_verified" src="images/verified_${_v[1]}.svg">`;
    }
    
    if(item.occupation) {
      if(item.occupation.type == 'work') {
        occupation = `
          <div class='friend_occupation link' onclick="utils.openLink('https://vk.com/club${item.occupation.id}')">
            ${item.occupation.name}
          </div>
        `.trim();
      } else {
        occupation = `<div class='friend_occupation'>${item.occupation.name}</div>`;
      }
    }

    block.innerHTML += `
    <div class="block mini">
      <img src="${item.photo_100}" class="friend_img">
      <div class="friend_names">
        <div class="friend_name link" onclick="utils.openLink('https://vk.com/${item.domain}')">${name}</div><br>
        ${occupation}
      </div>
    </div>
    `.trim();
    
    if(++danyadev.friends.loaded < eid && danyadev.friends.list[danyadev.friends.loaded]) {
      setTimeout(renderItem, 0);
    } else {
      friends_list.innerHTML += block.innerHTML;
      
      if(danyadev.friends.loaded == danyadev.friends.list.length) {
        qs('.friends_list_err').remove();
      } else loadNewFriends();
    }
  }
  
  renderItem();
}

var loadNewFriends = () => {
  content.addEventListener('scroll', renderNewItems);

  let h = window.screen.height > friends_list.clientHeight;

  if(h || friends_list.clientHeight - window.outerHeight < window.scrollY) renderNewItems();
}

var renderNewItems = () => {
  let h = window.screen.height > friends_list.clientHeight,
      l = friends_list.clientHeight - window.outerHeight < content.scrollTop,
      a = friends_list.parentNode.classList.contains('active');

  if(a && (h || l)) {
    content.removeEventListener('scroll', renderNewItems);
    renderFriends();
  }
}

module.exports = {
  load
}
