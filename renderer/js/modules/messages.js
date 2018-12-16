'use strict';

// &#13; - вообще прямо пустота
// &#8195; - пробел
// для эмодзи создать див со стилями инпута и с contenteditable=true

const escape = (t = '') => t && t.replace ? t.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : t;
const unescape = (t = '') => t && t.replace ? t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"') : t;

var dialogs = qs('.messages_dialogs'),
    offset = 0, usersList = {};

var renderDialogs = async () => {
  if(offset % 20) {
    dialogs.classList.remove('loading');
    return;
  }

  let data = await vkapi.method('execute', {
    code: `var messages = API.messages.getConversations({
        "offset": ${offset},
        "extended": 1,
        "fields": "verified,photo_50,sex,first_name_gen,last_name_gen"
      }), chatIDs = "", i = 0;

      while(i < messages.items.length) {
        var id = messages.items[i].conversation.peer.id;
        if(id > 2000000000) chatIDs = chatIDs + (id - 2000000000) + ",";
        i = i+1;
      }

      return {
        "messages": messages,
        "chats": API.messages.getChat({
          "chat_ids": chatIDs,
          "fields": "photo_50,first_name,last_name,first_name_gen,last_name_gen,verified,sex"
        })
      };`
  });

  (data.response.messages.groups || []).reduce((list, group) => {
    group.id = -group.id;
    list.push(group);
    return list;
  }, data.response.messages.profiles || []).forEach((user) => usersList[user.id] = user);

  for(let chat of data.response.chats) {
    for(let user of chat.users) usersList[user.id] = user;
  }

  let tempDialogs = document.createDocumentFragment();
  tempDialogs.innerHTML = '';

  if(!data.response.messages.count) dialogs.innerHTML = 'Список бесед пуст.';
  for(let item of data.response.messages.items) {
    let isChat = item.conversation.peer.type == 'chat',
        isChannel = isChat && item.conversation.chat_settings.is_group_channel,
        id = isChat ? item.last_message.from_id : item.conversation.peer.id,
        owner_id = isChat ? item.conversation.chat_settings.owner_id : item.conversation.peer.id,
        user = usersList[id], title, photo,
        isVerified = (isChat && !isChannel) ? false : user.verified,
        verified = (await utils.checkVerified(isVerified, isChat ? owner_id : user.id)).icon,
        photoColors = ['f04a48', 'ffa21e', '5fbf64', '59a9eb', '6580f0', 'c858dc', 'fa50a5'],
        outread = item.conversation.out_read != item.last_message.id && item.last_message.out ? 'outread' : '',
        muted = item.conversation.push_settings ? 'muted' : '',
        { author, text } = getTextPreview(item.last_message, false, item.conversation);

    if(isChat) {
      title = escape(item.conversation.chat_settings.title);

      if(item.conversation.chat_settings.photo) {
        let src = item.conversation.chat_settings.photo.photo_50;

        photo = `<img class="messages_dialog_photo" src="${src}">`;
      } else {
        let color = photoColors[utils.random(0, photoColors.length-1)],
            usTitle = unescape(title), letter = escape(usTitle[0] || '');

        if(emoji.isEmoji(usTitle.slice(0, 2))) letter = emoji.replace(usTitle.slice(0, 2));

        photo = `<div class="messages_dialog_photo" style="background-color: #${color}">${letter}</div>`;
      }
    } else {
      title = escape(user.name || `${user.first_name} ${user.last_name}`);
      photo = `<img class="messages_dialog_photo" src="${user.photo_50}">`;
    }

    if(emoji.isEmoji(title)) title = emoji.replace(title);

    tempDialogs.innerHTML += `
    <div class="messages_dialog" data-peer="${item.conversation.peer.id}">
      ${photo}
      <div class="messages_dialog_info">
        <div class="messages_dialog_title_line">
          <div class="messages_dialog_title_wrap">
            <div class="messages_dialog_title">${title}</div>
            ${verified}
          </div>
          <div class="messages_dialog_time">${getTime(item.last_message.date)}</div>
        </div>
        <div class="messages_dialog_message">
          <div class="messages_dialog_author">${author}</div>
          <div class="messages_dialog_text">${text}</div>
          <div class="messages_dialog_unread ${outread} ${muted}">${item.conversation.unread_count || ''}</div>
        </div>
      </div>
    </div>`;
  }

  dialogs.innerHTML += tempDialogs.innerHTML;
  offset += data.response.messages.items.length;

  loadNewDialogs();
}

var loadNewDialogs = () => {
  dialogs.addEventListener('scroll', renderNewItems);

  let h = window.screen.height > dialogs.scrollHeight,
      l = dialogs.scrollHeight - window.outerHeight < dialogs.scrollTop;

  if(h || l) renderNewItems();
}

var renderNewItems = () => {
  let a = qs('.messages_wrap').classList.contains('active'),
      h = window.screen.height > dialogs.scrollHeight,
      l = dialogs.scrollHeight - window.outerHeight < dialogs.scrollTop;

  if(a && (h || l)) {
    dialogs.removeEventListener('scroll', renderNewItems);
    renderDialogs();
  }
}

var pad = (n, tx) => {
  n = Math.abs(n) % 100;

  let n1 = n % 10;

  if(n > 10 && n < 20) return tx[2];
  if(n1 > 1 && n1 < 5) return tx[1];
  if(n1 == 1) return tx[0];

  return tx[2];
}

var getFlags = (mask) => {
  let flags = {
    unread: 1, outbox: 2, replied: 4, important: 8,
    chat: 16, friends: 32, spam: 64, deleted_trash: 128,
    fixed: 256, media: 512, hidden: 65536, deleted: 131072
  }, flagsInMask = [];

  for(let flag in flags) if(flags[flag] & mask) flagsInMask.push(flag);

  return flagsInMask;
}

let getTime = (unixtime) => {
  let date = new Date(unixtime * 1000),
      thisDate = new Date(), time = '',
      f = (t) => t < 10 ? `0${t}` : t;

  if(date.toLocaleDateString() == thisDate.toLocaleDateString()) {
    time = `${f(date.getHours())}:${f(date.getMinutes())}`;
  } else if(date.getFullYear() == thisDate.getFullYear()) {
    time = `${f(date.getDate())}.${f(date.getMonth() + 1)}`;
  } else time = date.getFullYear();

  return time;
}

var getTextPreview = (message, isLongpoll, conversation) => {
  let getAttachmentPreview = (message, attachment) => {
    if(!attachment || (message && attachment.type != 'gift')) return message;

    let attachName = '';

    switch(attachment.type) {
      case 'doc': attachName = 'Документ'; break;
      case 'link': attachName = 'Ссылка'; break;
      case 'poll': attachName = 'Опрос'; break;
      case 'wall': attachName = 'Запись на стене'; break;
      case 'call': attachName = 'Звонок'; break;
      case 'gift': attachName = 'Подарок'; break;
      case 'photo': attachName = 'Фотография'; break;
      case 'audio': attachName = 'Аудиозапись'; break;
      case 'video': attachName = 'Видеозапись'; break;
      case 'point': attachName = 'Местоположение'; break;
      case 'market': attachName = 'Товар'; break;
      case 'sticker': attachName = 'Стикер'; break;
      case 'graffiti': attachName = 'Граффити'; break;
      case 'audio_message': attachName = 'Голосовое сообщение'; break;
      case 'money_request': attachName = 'Запрос на денежный перевод'; break;
      case 'audio_playlist': attachName = 'Плейлист'; break;
      default: attachName = 'Вложение'; break;
    }

    return `<div class="link">${attachName}</div>`;
  }

  let out = '';

  if(!isLongpoll) {
    if(message.action) { // сервисное сообщение
      let user = usersList[message.from_id],
          text = '', s = user.sex == 1 ? 'a' : '';

      if(message.action.type == 'chat_photo_update') {
        text = `${user.first_name} ${user.last_name} обновил${s} фотографию беседы`;
      } else if(message.action.type == 'chat_photo_remove') {
        text = `${user.first_name} ${user.last_name} удалил${s} фотографию беседы`;
      } else if(message.action.type == 'chat_create') {
        text = `${user.first_name} ${user.last_name} создал${s} беседу ${message.action.text}`;
      } else if(message.action.type == 'chat_title_update') {
        text = `${user.first_name} ${user.last_name} изменил${s} название беседы на ${message.action.text}`;
      } else if(message.action.type == 'chat_invite_user') {
        let newUser = usersList[message.action.member_id],
            name = `${newUser.name || `${newUser.first_name_gen} ${newUser.last_name_gen}`}`;

        text = `${user.first_name} ${user.last_name} пригласил${s} ${name}`;
      } else if(message.action.type == 'chat_kick_user') {
        if(message.action.member_id == user.id) {
          text = `${user.first_name} ${user.last_name} покинул${s} беседу`;
        } else {
          let actUser = usersList[message.action.member_id],
              name = `${actUser.name || `${actUser.first_name_gen} ${actUser.last_name_gen}`}`;

          text = `${user.first_name} ${user.last_name} исключил${s} ${name}`;
        }
      } else if(message.action.type == 'chat_pin_message') {
        let actUser = usersList[message.action.member_id],
            name = `${actUser.name || `${actUser.first_name} ${actUser.last_name}`}`;

        text = `${name} закрепил${s} сообщение "${message.action.message}"`;
      } else if(message.action.type == 'chat_unpin_message') {
        let actUser = usersList[message.action.member_id],
            name = `${actUser.name || `${actUser.first_name} ${actUser.last_name}`}`;

        text = `${name} открепил${s} сообщение`;
      } else if(message.action.type == 'chat_invite_user_by_link') {
        text = `${user.first_name} ${user.last_name} присоединил${s ? 'ась' : 'ся'} к беседе по ссылке`;
      }

      text = escape(text);
      if(emoji.isEmoji(text)) text = emoji.replace(text);

      out = { author: '', text };
    } else { // обычное сообщение
      let isChat = conversation.peer.type == 'chat',
          author = usersList[message.from_id],
          name = escape(author.id == users.get().id ? 'Вы:' : isChat ? `${author.name || author.first_name}:` : ''),
          text = escape(message.text).replace(/\[([^\|]+)\|([^\]]+)\]/g, '$2');

      if(emoji.isEmoji(text)) text = emoji.replace(text);

      text = getAttachmentPreview(text, message.attachments[0] || message.geo);

      if(!text && message.fwd_messages) {
        let fwd_text_variables = ['пересланное сообщение', 'пересланных сообщения', 'пересланных сообщений'],
            fwd_text = pad(message.fwd_messages.length, fwd_text_variables);

        text = `<div class="link">${message.fwd_messages.length} ${fwd_text}</div>`;
      }

      out = { author: name, text };
    }
  } else { // longpoll
    let getName = (user, pref) => {
      if(user) {
        if(pref) return user.name || `${user['first_name_' + pref]} ${user['last_name_' + pref]}`;
        else return user.name || `${user.first_name} ${user.last_name}`;
      } else return '...';
    }

    if(message.action.act) {
      let user = usersList[message.from_id],
          text = '', s = (user && user.sex == 1) ? 'a' : '';

      if(message.action.act == 'chat_photo_update') {
        text = `${getName(user)} обновил${s} фотографию беседы`;

        // обновление фотки беседы
      } else if(message.action.act == 'chat_photo_remove') {
        text = `${getName(user)} удалил${s} фотографию беседы`;

        // удаление фотки беседы
      } else if(message.action.act == 'chat_create') {
        text = `${getName(user)} создал${s} беседу ${message.action.text}`;
      } else if(message.action.act == 'chat_title_update') {
        text = `${getName(user)} изменил${s} название беседы на ${message.action.text}`;

        // изменить название беседы
      } else if(message.action.act == 'chat_invite_user') {
        let newUsername = getName(usersList[message.action.member_id], 'gen');

        text = `${getName(user)} пригласил${s} ${newUsername}`;

        // увеличить число участников
      } else if(message.action.act == 'chat_kick_user') {
        if(message.action.member_id == user.id) {
          text = `${getName(user)} покинул${s} беседу`;
        } else {
          let kickedUsername = getName(usersList[message.action.member_id], 'gen');

          text = `${getName(user)} исключил${s} ${kickedUsername}`;
        }

        // уменьшить число участников
      } else if(message.action.act == 'chat_pin_message') {
        let name = getName(usersList[message.action.member_id])

        text = `${name} закрепил${s} сообщение "${message.action.message}"`;

        // закрепить сообщение
      } else if(message.action.act == 'chat_unpin_message') {
        let actUser = usersList[message.action.member_id],
            name = `${actUser.name || `${actUser.first_name} ${actUser.last_name}`}`;

        text = `${name} открепил${s} сообщение`;

        // открепить сообщение
      } else if(message.action.act == 'chat_invite_user_by_link') {
        text = `${user.first_name} ${user.last_name} присоединил${s ? 'ась' : 'ся'} к беседе по ссылке`;

        // увеличить число участников
      }

      text = escape(text);
      if(emoji.isEmoji(text)) text = emoji.replace(text);

      out = { author: '', text };
    }
  }

  return out;
}

var startLongpoll = (longpoll) => {
  longpoll.on('event', (id, data) => {
    if(id == 4) {
      let dialog = qs(`.messages_dialog[data-peer="${data[2]}"]`),
          attachments = [],
          action = Object.keys(data[5]).reduce((list, key) => {
            let finded = (key.match(/^source_(\S+)/) || [])[1];

            if(finded) list[finded] = data[5][key];

            return list;
          }, {});

      for(let key in data[6]) {
        let value = data[6][key], attach = {},
            attachID = (key.match(/attach(\d+)_type/) || [])[1];

        if(attachID) {
          if(value == 'link') {
            attach = {
              photo: data[6][`attach${attachID}_photo`],
              title: data[6][`attach${attachID}_title`],
              desc: data[6][`attach${attachID}_desc`],
              url: data[6][`attach${attachID}_url`]
            }
          } else if(value == 'sticker') {
            attach.product_id = data[6][`attach${attachID}_product_id`];
          } else if(value == 'doc') {
            if(data[6][`attach${attachID}_kind`]) {
              attach.kind = data[6][`attach${attachID}_kind`];
            }
          }

          attach = Object.assign({ type: value, id: data[6][`attach${attachID}`] }, attach);
        } else if(key == 'geo') {
          attach = {
            type: 'geo',
            id: value,
            provider: data[6].geo_provider
          }
        } else continue;

        attachments.push(attach);
      }

      let out = !!getFlags(data[1]).find((flag) => flag == 'outbox'),
          message = {
            id: data[0],
            flags: data[1],
            peer_id: data[2],
            date: data[3],
            text: data[4],
            from_id: Number(data[5].from) || (out ? users.get().id : data[2]),
            out, action, attachments, dialog
          }

      if(!dialog) {
        // создаем диалог
      }

      // console.log(message);

      let text = getTextPreview(message, true);
    }
  });
}

module.exports = {
  load: renderDialogs,
  startLongpoll
}
