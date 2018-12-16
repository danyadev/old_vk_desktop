'use strict';

const lazyLoad = require('./../lib/lazyLoad');

// ads filters: friends_recomm,ads_app,ads_site,ads_post,ads_app_slider
// oth filters: post,photo,photo_tag,wall_photo,friend,note,audio,video

var news_list = qs('.news_list'),
    content = qs('.content'),
    start_from = '',
    storiesList = null;

var pad = (n, tx) => {
  n = Math.abs(n) % 100;

  let n1 = n % 10;

  if(n > 10 && n < 20) return tx[2];
  if(n1 > 1 && n1 < 5) return tx[1];
  if(n1 == 1) return tx[0];

  return tx[2];
}

var load = async () => {
  qs('.stories_list').innerHTML = `
    <div class="stories_item">
      <div class="stories_item_photo_wrap">
        <img class="stories_item_photo" src="${users.get().photo_100}">
      </div>
      <div class="stories_item_name">История</div>
    </div>`;

  let data = await vkapi.method('execute', {
        code: `return {
          news: API.newsfeed.get({
            count: 15,
            filters: "post,photo",
            fields: "verified,sex,screen_name,photo_50,video_files"
          }),
          stories: API.stories.get({
            extended: 1,
            fields: "photo_100"
          })
        };`
      }),
      news = data.response.news,
      stories = data.response.stories,
      html = document.createDocumentFragment();

  html.innerHTML = '';

  // горизонтальный скролл
  qs('.stories_list').addEventListener('mousewheel', (e) => {
    qs('.stories_list').scrollLeft -= Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) * 40;
    e.preventDefault();
  });

  getNews(news);

  storiesList = stories.items;

  for(let item of stories.items || []) {
    let data = item[0],
        type = data.owner_id > 0 ? 'profiles' : 'groups',
        owner = stories[type].find((owner) => owner.id == Math.abs(data.owner_id)),
        newStory = item.find((story) => !story.seen),
        storyIndex = item.indexOf(newStory);

    if(storyIndex == -1) storyIndex = 0;

    if(owner.id == users.get().id) continue;

    html.innerHTML += `
    <div class="stories_item" data-index="${storyIndex}" data-id="${stories.items.indexOf(item)}" onclick="require('./js/modules/news').openStory(this)">
      <div class="stories_item_photo_wrap ${newStory ? 'active' : ''}">
        <img class="stories_item_photo" src="${owner.photo_100}">
      </div>
      <div class="stories_item_name">${owner.first_name || owner.name}</div>
    </div>`;
  }

  qs('.stories_list').innerHTML += html.innerHTML;
}

var getNews = async (news) => {
  if(start_from == undefined) {
    news_list.classList.remove('loading');

    return;
  }

  if(!news) {
    news = (await vkapi.method('newsfeed.get', {
      count: 15,
      start_from: start_from,
      filters: 'post,photo',
      fields: 'verified,sex,screen_name,photo_50,video_files'
    })).response;
  }

  start_from = news.next_from;

  for(let item of news.items || []) {
    let head_data, parsed_time,
        head_name, text = '',
        isGroup = false,
        post_comments = { innerHTML: '' },
        time = new Date(item.date * 1000),
        this_time = new Date, head_type = '',
        zero = time.getMinutes() < 10 ? '0' : '',
        mins = zero + time.getMinutes(),
        months = [
          'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
          'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];

    if(item.caption && item.caption.type == 'explorebait') continue;

    if(this_time.toLocaleDateString() == time.toLocaleDateString()) {
      parsed_time = 'Сегодня';
    } else if(this_time.getFullYear() == time.getFullYear()) {
      parsed_time = `${time.getDate()} ${months[time.getMonth()]}`;
    } else {
      parsed_time = `${time.getDate()} ${months[time.getMonth()]} ${time.getFullYear()}`;
    }

    parsed_time += ` в ${time.getHours()}:${mins}`;

    if(item.source_id.toString()[0] == '-') {
      item.source_id = Math.abs(item.source_id);

      isGroup = true;

      head_data = news.groups.find(el => el.id == item.source_id);
      head_name = head_data.name;
    } else {
      head_data = news.profiles.find(el => el.id == item.source_id);
      head_name = `${head_data.first_name} ${head_data.last_name}`;
    }

    let _v = utils.checkVerified(head_data.verified, isGroup ? -head_data.id : head_data.id),
        sex = head_data.sex == 1 ? 'a' : '';

    if(_v[0]) {
      head_name += `<img class="img_verified" src="images/verified_${_v[1]}.svg">`;
    }

    if(item.type == 'post') {
      text += item.text;

      text = text
        .replace(/((https?|ftp|market):\/\/?[A-Za-z0-9А-Яа-яЁё-]{1,64}\.+[A-Za-zА-Яа-я]{2,6}\/?.*)/gi,
                '<div class="link" onclick="utils.openLink(this)">$1</div>')
        .replace(/\[(\w+)\|([^[]+)\]/g,
                '<div class="link" onclick="utils.openVK(\'$1\')">$2</div>')
        .replace(/#([^# \n]+)/g, (all, found, index, allText) => {
          if(all.match(/<\/div>/)) return all;
          return `<div class="link" onclick="utils.openVK('feed?section=search&q=${found}')">${all}</div>`;
        });

      if(item.copy_history) {
        if(text) text += '\n';

        text += '*репост*';
      }

      if(item.post_source.data == 'profile_photo') {
        head_type = ` <span class='post_type'>обновил${sex} фотографию на странице</span>`;
      } else if(item.final_post && !text) {
        head_type = ` <span class='post_time'>молча удалил${sex} свою страницу</span>`;
      } else if(item.final_post) {
        head_type = ` <span class='post_time'>удалил${sex} свою страницу со словами</span>`;
      }

      text = text.replace(/\n/g, '<br>');

      if(item.attachments) {
        if(text) text += '<br><br>';

        let attachmentsList = {};

        for(let attach of item.attachments) {
          if(attachmentsList[attach.type]) attachmentsList[attach.type].push(attach[attach.type]);
          else attachmentsList[attach.type] = [attach[attach.type]];
        }

        for(let type in attachmentsList) {
          let attachments = attachmentsList[type];

          if(type == 'photo') {
            for(let attach of attachments) {
              let url = attach.sizes.find(s => s.type == 'x').url;

              text += `<img src="${url}" class="post_photo">`;
            }
          } else if(type == 'audio') {
            text += '*Аудиозапись*';
          } else if(type == 'article') {
            for(let attach of attachments) {
              let isPhoto = !!attach.photo,
                  photo = isPhoto ? attach.photo.sizes.find(s => s.type == 'x').url : head_data.photo_50;

              text += `
                <div class="article">
                  <div class="article_image ${isPhoto ? 'photo' : ''}" style="background-image: url('${photo}')"></div>
                  <div class="article_fade"></div>
                  <div class="article_info">
                    <div class="article_name">${attach.title}</div>
                    <div class="article_author">${attach.owner_name}</div>
                    <div class="article_btn" onclick="utils.openLink('${attach.url}')">Читать</div>
                  </div>
                </div>
              `.trim();
            }
          } else if(type == 'poll') {
            text += '*Опрос*';
          } else if(type == 'video') {
            text += '*Видеозапись*';
          } else if(type == 'doc') {
            text += '*Документ*';
          } else if(type == 'link') {
            text += '*Ссылка*';
          } else if(type == 'note') {
            text += '*Заметка*';
          } else if(type == 'audio_playlist') {
            text += '*Плейлист*';
          } else if(type == 'album') {
            text += '*Фотоальбом*';
          } else if (type == 'page') {
            text += '*Вики-страница*';
          } else if(type == 'market') {
            text += '*Товар*';
          } else if(type == 'app') {
            text += '*Приложение*';
          } else if(type == 'podcast') {
            text += '*Подкаст*';
          }

          let keys = Object.keys(attachmentsList);

          if(keys.indexOf(type) != keys.length-1) text += '<br>';
        }
      }
    } else if(item.type == 'photo') {
      let l = pad(item.photos.items.length, ['новую фотографию', 'новые фотографии', 'новых фотографий']);

      head_type = ` <span class='post_type'>добавил${sex} ${item.photos.items.length} ${l}</span>`;

      for(let photo of item.photos.items) {
        let url = photo.sizes.find(s => s.type == 'x').url;

        text += `<img src="${url}" class="post_photo">`;
      }
    }

    if(emoji.isEmoji(text)) text = emoji.replace(text);

    if(item.geo) {
      let l = `https://maps.yandex.ru/?text=${item.geo.coordinates.replace(/ /, ',')}`;

      text += `
        <br><div class="post_geo link" onclick="utils.openLink('${l}')">${item.geo.place.title}</div>
      `.trim();
    }

    if(item.signer_id) {
      let signer = news.profiles.find(el => el.id == item.signer_id);

      text += `
      <br>
      <div class='post_signer link' onclick="utils.openLink('https://vk.com/${signer.screen_name}')">
        ${signer.first_name} ${signer.last_name}
      </div>
      `.trim();
    }

    let post_bottom = '';

    if(item.type != 'photo') {
      let likes = item.likes.count || '',
          comments = item.comments.count || '',
          reposts = item.reposts.count || '',
          views = item.views && item.views.count || 0;

      var reduceNum = num => {
        let rn = null;

        if(num >= 1000) {
          if(num >= 1000000) rn = (num / 1000000).toFixed(1) + 'M';
          else rn = (num / 1000).toFixed(1) + 'K';
        }

        return rn || num;
      }

      likes = reduceNum(likes);
      comments = reduceNum(comments);
      reposts = reduceNum(reposts);
      views = reduceNum(views);

      let liked = '', can_comment = item.comments.can_post ? '' : `style='display: none'`,
          real_id = isGroup ? -head_data.id : head_data.id,
          onclick = `require('./js/modules/news').like(${real_id}, ${item.post_id}, this)`;

      if(item.likes.user_likes) liked = 'active';

      post_bottom = `
        <div class="post_bottom">
          <div class="post_btns">
            <div class="post_btn post_like ${liked}" onclick="${onclick}">${likes}</div>
            <div class="post_btn post_comment" ${can_comment}>${comments}</div>
            <div class="post_btn post_repost">${reposts}</div>
          </div>
          <div class="post_views_wrap">
            <div class="post_views">${views}</div>
          </div>
        </div>
      `.trim();
    }

    news_list.innerHTML += `
      <div class='block'>
        <div class='post_header'>
          <img src="${head_data.photo_50}" class="post_header_img">
          <div class="post_names">
            <div class="post_name link" onclick="utils.openLink('https://vk.com/${head_data.screen_name}')">
              ${head_name}
            </div>
            ${head_type}<br>
            <div class="post_time">${parsed_time}</div>
          </div>
        </div>
        <div class="post_content">${text}</div>
        ${post_bottom}
      </div>
    `.trim();
  }

  if(!start_from) getNews();

  loadNewNews();
}

var loadNewNews = () => {
  content.addEventListener('scroll', renderNewItems);

  let h = window.screen.height > news_list.clientHeight,
      l = news_list.clientHeight - window.outerHeight < window.scrollY;

  if(h || l) renderNewItems();
}

var renderNewItems = () => {
  let h = window.screen.height > news_list.clientHeight,
      l = news_list.clientHeight - window.outerHeight < content.scrollTop,
      a = news_list.parentNode.classList.contains('active');

  if(a && (h || l)) {
    content.removeEventListener('scroll', renderNewItems);
    getNews();
  }
}

var like = async (owner_id, item_id, target) => {
  if(!utils.isNumber(owner_id) || !utils.isNumber(item_id)) return;

  let data = await vkapi.method('execute', {
    code: `
      var data = { type: "post", item_id: ${item_id}, owner_id: ${owner_id} },
          liked = API.likes.isLiked(data).liked, count = 0;

      if(liked) count = API.likes.delete(data);
      else count = API.likes.add(data);

      return { count: count.likes, remove: liked };
    `
  });

  if(target) {
    let action = data.response.remove ? 'remove' : 'add';

    target.classList[action]('active');
    target.classList[action]('animate');
    target.innerHTML = data.response.count || '';
  }
}

var openStory = (elem) => {
  let stories = storiesList[elem.dataset.id],
      story = stories[elem.dataset.index];

  // console.log(stories);
  // console.log(story);
}

module.exports = {
  load,
  getNews,
  like,
  openStory
}
