'use strict';

const { BrowserWindow } = require('electron').remote;
const https = require('https');
const fs = require('fs');

var danyadev = {};
danyadev.audio = {};

var audio = new Audio(),
    audiolist = qs('.audiolist'),
    audioplayer = qs('.audioplayer'),
    content = qs('.content'),
    player_cover = qs('.player_cover'),
    player_back = qsa('.player_button')[0],
    player_next = qsa('.player_button')[1],
    player_real_time = qs('.player_real_time'),
    player_played_time = qs('.player_played_time'),
    player_progress_loaded = qs('.player_progress_loaded'),
    player_progress_played = qs('.player_progress_played'),
    player_progress_wrap = qs('.player_progress_wrap'),
    player_volume_wrap = qs('.player_volume_wrap'),
    player_icon_repeat = qs('.player_icon_repeat');

audio._play = audio.play;
audio.play = () => audio._play().catch((err) => {
  if(!err.message.match(/https:\/\/goo\.gl\/LdLk22/)) {
    console.error(err);
  }
});

qs('.player_volume_this').style.width = settings.get('volume') * 100 + '%';
audio.volume = settings.get('volume');

danyadev.audio.renderedItems = 0;
danyadev.audio.track_id = 0;

const RECEIPT = 'JSv5FBbXbY:APA91bF2K9B0eh61f2WaTZvm62GOHon3-vElmVq54ZOL5PHpFkIc85WQUxUH_wae8YEUKkEzLCcUC5V4bTWNNPbjTxgZRvQ-PLONDMZWo_6hwiqhlMM7gIZHM2K2KhvX-9oCcyD1ERw4';
var GET_AUDIO_ERROR = false;

qs('.audiolist_header_item').classList.add('active');
qs('.audiolist_content').classList.add('active');

qsa('.audiolist_header_item').forEach((item, tab) => {
  item.addEventListener('click', () => {
    if(item.classList.contains('active')) return;

    qs('.audiolist_header_item.active').classList.remove('active');
    qs('.audiolist_content.active').classList.remove('active');

    qsa('.audiolist_header_item')[tab].classList.add('active');
    qsa('.audiolist_content')[tab].classList.add('active');
  });
});

qs('.audiolist_header_add').addEventListener('click', modal.addAudio.toggle);

var closeSortPopup = e => {
  if(!e || e.path.indexOf(qs('.audiolist_sort_wrap')) == -1) {
    qs('.audiolist_sort_header').click();
  }
}

qs('.audiolist_sort').addEventListener('click', () => {
  qs('.audiolist_sort_popup').classList.add('active');
  document.addEventListener('click', closeSortPopup);
});

qs('.audiolist_sort_header').addEventListener('click', () => {
  qs('.audiolist_sort_popup').classList.remove('active');
  document.removeEventListener('click', closeSortPopup);
});

qsa('.audiolist_sort_item').forEach((item, id) => {
  item.addEventListener('click', () => {
    if(item.classList.contains('active') && id != 1) return;
    if(danyadev.audio.renderedItems < 15 && danyadev.audio.renderedItems != danyadev.audio.count) return;

    qs('.audiolist_sort').innerHTML = qs('.audiolist_sort_header').innerHTML = item.innerHTML;
    qs('.audiolist_sort_item.active').classList.remove('active');
    item.classList.add('active');

    closeSortPopup();

    let play;

    switch(id) {
      case 0: // по умолчанию
        danyadev.audio.track_id = 0;
        danyadev.audio.renderedItems = 0;
        danyadev.audio.repeat = false;
        danyadev.audio.list = danyadev.audio.oldList.slice();
        player_progress_loaded.style.width = '';
        player_progress_played.style.width = '';
        audio.audio_item = null;
        audio.src = '';

        player_icon_repeat.classList.remove('active');
        content.removeEventListener('scroll', renderNewItems);

        play = false;

        if(!audio.paused) {
          play = true;
          toggleAudio();

          qs('.player_play').classList.remove('pause');
        }

        render().then(() => {
          if(play) toggleAudio(audio.audio_item);
        });

        break;
      case 1: // в случайном порядке
        qs('.audiolist_shuffle').click();
        break;
      case 2: // в обратном порядке
        danyadev.audio.track_id = 0;
        danyadev.audio.renderedItems = 0;
        danyadev.audio.repeat = false;
        player_progress_loaded.style.width = '';
        player_progress_played.style.width = '';
        audio.audio_item = null;
        audio.src = '';

        player_icon_repeat.classList.remove('active');
        content.removeEventListener('scroll', renderNewItems);

        if(danyadev.audio.oldList) {
          danyadev.audio.list = danyadev.audio.oldList.slice();
        } else {
          danyadev.audio.oldList = danyadev.audio.list.slice();
        }

        danyadev.audio.list.reverse();

        play = false;

        if(!audio.paused) {
          play = true;
          toggleAudio();

          qs('.player_play').classList.remove('pause');
        }

        render().then(() => {
          if(play) toggleAudio(audio.audio_item);
        });

        break;
    }
  });
});

var load = async () => {
  let data = await vkapi.method('audio.get');

  if(!data.error) {
    danyadev.audio.count = data.response.count;
    danyadev.audio.list = data.response.items;

    if(!danyadev.audio.list.length) {
      qs('.audiolist_info').classList.remove('loading');
      qs('.audiolist_info').innerHTML = 'Список аудиозаписей пуст';
    } else render();
  } else {
    if(GET_AUDIO_ERROR) {
      qs('.audiolist_info').classList.remove('loading');
      qs('.audiolist_info').innerHTML = `Неизвестная ошибка. Повторите попытку позже<br>(${JSON.stringify(data.error)})`;
    } else {
      GET_AUDIO_ERROR = true;

      let ref = await vkapi.method('auth.refreshToken', { receipt: RECEIPT });

      if(ref.error) {
        qs('.audiolist_info').classList.remove('loading');

        if(ref.error.error_code == 3) {
          qs('.audiolist_info').innerHTML = `Музыка недоступна<br>(${JSON.stringify(ref.error.error_msg)})`;
        } else {
          qs('.audiolist_info').innerHTML = `Неизвестная ошибка. Повторите попытку позже<br>(${JSON.stringify(ref.error)})`;
        }

        return;
      }

      users.set(users.get().id, Object.assign(users.get(), { access_token: ref.response.token }))

      load();
    }
  }
}

var matchTime = time => {
  let minutes = Math.floor(time / 60),
      hours = minutes >= 60 ? Math.floor(minutes / 60) + ':' : '',
      secondsZero = (time % 60) < 10 ? '0' : '',
      seconds = ':' + secondsZero + Math.floor(time) % 60;

  if(hours != '') {
    let minutesZero = (minutes - parseInt(hours) * 60) < 10 ? '0' : '';
    minutes = minutesZero + (minutes - parseInt(hours) * 60);
  }

  return hours + minutes + seconds;
}

var renderAudio = items => {
  return new Promise((resolve, reject) => {
    let html = document.createDocumentFragment();
    html.innerHTML = '';

    let render = i => {
      if(!items[i]) {
        qs('.audiolist_info').classList.add('loading');
        audiolist.classList.remove('loading');
        return resolve(html.innerHTML);
      }

      let item = items[i], cover, audio_block,
          onclick = 'require("./js/modules/audio").toggleAudio(this.parentElement)';

      if(item.url) {
        audio_block = `<div class='audio_item' data-src='${item.url}' data-id='${item.id}'>`;
      } else {
        audio_block = `<div class='audio_item locked' title='Аудиозапись изъята из публичного доступа'>`;
      }

      if(item.album && item.album.thumb) cover = item.album.thumb.photo_68;
      else cover = 'images/empty_cover.svg';

      html.innerHTML += `
        ${audio_block}
          <div class='audio_cover' style='background-image: url("${cover}")' onclick='${onclick}'></div>
          <div class='audio_names'>
            <div class='audio_name'>${item.title}</div>
            <div class='audio_author'>${item.artist}</div>
          </div>
          <div class='audio_right_block'>
            <div class='audio_right_btns'>
              <!-- кнопки -->
            </div>
            <div class='audio_real_time audio_active_time'>${matchTime(item.duration)}</div>
            <div class='audio_played_time'>0:00</div>
          </div>
        </div>
      `.trim();

      setTimeout(() => render(++i), 0);
    }

    render(0);
  });
}

var render = cb => {
  return new Promise(async (resolve, reject) => {
    let offset = danyadev.audio.renderedItems,
        list = danyadev.audio.list.slice(offset, offset + 15),
        html = await renderAudio(list);

    danyadev.audio.renderedItems += list.length;

    if(danyadev.audio.renderedItems <= 15) {
      audiolist.innerHTML = html;

      qs('.audiolist_info').style.display = 'none';
      qs('.audiolist_utils').style.display = 'block';

      initPlayer();
    } else audiolist.innerHTML += html;

    if(danyadev.audio.renderedItems < danyadev.audio.count) loadSoundBlock();
    else audiolist.classList.remove('loading');

    resolve();
  });
}

var loadSoundBlock = () => {
  content.addEventListener('scroll', renderNewItems);

  let h = window.screen.height > audiolist.clientHeight,
      l = audiolist.clientHeight - window.outerHeight < window.scrollY;

  if(h || l) renderNewItems();
}

var renderNewItems = () => {
  let a = qs('.content_audio').classList.contains('active'),
      t = qs('.audiolist_content').classList.contains('active'),
      h = window.screen.height > audiolist.clientHeight,
      l = audiolist.clientHeight - window.outerHeight < content.scrollTop;

  if(a && t && (h || l)) {
    content.removeEventListener('scroll', renderNewItems);
    render();
  }
}

var toggleTime = (type) => {
  let item = audiolist.children[danyadev.audio.track_id],
      audio_real_time = item.children[2].children[1],
      audio_played_time = item.children[2].children[2];

  if(type) { // played
    audio_real_time.classList.remove('audio_active_time');
    audio_played_time.classList.add('audio_active_time');

    player_real_time.classList.remove('player_active_time');
    player_played_time.classList.add('player_active_time');
  } else { // real
    audio_real_time.classList.add('audio_active_time');
    audio_played_time.classList.remove('audio_active_time');

    player_real_time.classList.add('player_active_time');
    player_played_time.classList.remove('player_active_time');
  }
}

var initPlayer = () => {
  for(let i=0; i<audiolist.children.length; i++) {
    let item = audiolist.children[i],
        author = item.children[1].children[1].innerHTML,
        name = item.children[1].children[0].innerHTML;

    if(item.classList.contains('locked')) continue;

    item.children[0].classList.add('audio_cover_has_play');
    item.classList.add('audio_item_active');
    audio.src = item.dataset.src;
    player_real_time.innerHTML = item.children[2].children[1].innerHTML;
    player_cover.style.backgroundImage = item.children[0].style.backgroundImage;

    qs('.player_name').innerHTML = `<span class="player_author">${author}</span> – ${name}`;

    toggleTime(1);
    audio.audio_item = item;
    return;
  }
}

var toggleAudio = track => {
  if(!track) return;

  if(track.classList.contains('locked')) {
    if(danyadev.audio.play_prev) {
      danyadev.audio.track_id--;
      player_back.click();
    } else {
      danyadev.audio.track_id++;
      player_next.click();
    }

    return;
  }

  if(audio.src != track.dataset.src) toggleTime(0);

  audio.audio_item = track;
  player_real_time.innerHTML = track.children[2].children[1].innerHTML;
  danyadev.audio.track_id = [].slice.call(audiolist.children).indexOf(track);

  let audio_item_active = qs('.audio_item_active'),
      audio_cover_stop = qs('.audio_cover_stop');

  if(audio_cover_stop) {
    audio_cover_stop.classList.add('audio_cover_play');
    audio_cover_stop.classList.remove('audio_cover_stop');
  }

  if(audio.src != track.dataset.src) {
    player_progress_loaded.style.width = '';
    player_progress_played.style.width = '';

    if(player_icon_repeat.classList.contains('active')) {
      player_icon_repeat.classList.remove('active');
      danyadev.audio.repeat = false;
    }

    audio.src = track.dataset.src;
    toggleTime(1);

    if(qs('.audio_cover_has_play'))
      qs('.audio_cover_has_play').classList.remove('audio_cover_has_play');

    if(audio_item_active)
      audio_item_active.classList.remove('audio_item_active');

    track.children[0].classList.add('audio_cover_has_play');

    if(qs('.hidden_time')) {
      qs('.hidden_time').style.display = '';
      qs('.hidden_time').classList.remove('hidden_time');

      qs('.showed_time').innerHTML = '';
      qs('.showed_time').classList.remove('showed_time');
    }

    player_cover.style.backgroundImage = track.children[0].style.backgroundImage;

    let author = track.children[1].children[1].innerHTML,
        name = track.children[1].children[0].innerHTML;

    qs('.player_name').innerHTML = `<span class="player_author">${author}</span> – ${name}`;
  }

  if(audio.paused) {
    track.children[0].classList.add('audio_cover_stop');
    track.children[0].classList.remove('audio_cover_play');
    track.classList.add('audio_item_active');

    if(qs('.player_play')) {
      qs('.player_play').title = 'Приостановить';

      qs('.player_play').classList.add('pause');
    }

    audio.play();
  } else {
    track.children[0].classList.add('audio_cover_play');
    track.children[0].classList.remove('audio_cover_stop');

    qs('.player_play').title = 'Воспроизвести';

    qs('.player_play').classList.remove('pause');

    audio.pause();
  }
}

player_real_time.addEventListener('click', () => toggleTime(1));
player_played_time.addEventListener('click', () => toggleTime(0));

player_back.addEventListener('click', () => {
  let audioItem = audiolist.children[danyadev.audio.track_id - 1];

  danyadev.audio.play_prev = 1;

  if(!audioItem && !audio.paused) toggleAudio(audiolist.children[0]);
  else if(!audioItem) {
    danyadev.audio.play_prev = false;
    return;
  } else {
    danyadev.audio.repeat = false;

    if(player_icon_repeat.classList.contains('active')) {
      player_icon_repeat.classList.remove('active');
    }

    toggleAudio(audioItem);
  }
});

qs('.audiolist_shuffle').addEventListener('click', () => {
  if(danyadev.audio.renderedItems < 15 && danyadev.audio.renderedItems != danyadev.audio.count) return;

  danyadev.audio.track_id = 0;
  danyadev.audio.renderedItems = 0;
  danyadev.audio.repeat = false;

  if(player_icon_repeat.classList.contains('active')) {
    player_icon_repeat.classList.remove('active');
  }

  let play = false,
      item = qsa('.audiolist_sort_item')[1];

  if(!audio.paused) {
    play = true;
    toggleAudio();

    qs('.player_play').classList.remove('pause');
  }

  audio.audio_item = null;
  audio.src = '';

  player_progress_loaded.style.width = '';
  player_progress_played.style.width = '';

  content.removeEventListener('scroll', renderNewItems);

  if(!danyadev.audio.oldList) {
    danyadev.audio.oldList = danyadev.audio.list.slice();
  }

	for(let j, x, i = danyadev.audio.list.length; i;
      j = Math.floor(Math.random() * i),
      x = danyadev.audio.list[--i],
      danyadev.audio.list[i] = danyadev.audio.list[j],
      danyadev.audio.list[j] = x);

  render().then(() => {
    if(play) toggleAudio(audio.audio_item);

    qs('.audiolist_sort').innerHTML = qs('.audiolist_sort_header').innerHTML = item.innerHTML;
    qs('.audiolist_sort_item.active').classList.remove('active');
    item.classList.add('active');
  });
});

player_next.addEventListener('click', () => {
  let audioTrack = audiolist.children[danyadev.audio.track_id + 1];

  if(!audioTrack) {
    if(danyadev.audio.renderedItems < danyadev.audio.count) {
      if(danyadev.audio.blockNext) return;

      danyadev.audio.blockNext = 1;

      render().then(() => {
        player_next.click();
        danyadev.audio.blockNext = 0;
      });

      return;
    } else audioTrack = audiolist.children[0];
  }

  danyadev.audio.play_prev = false;
  danyadev.audio.repeat = false;

  if(player_icon_repeat.classList.contains('active')) {
    player_icon_repeat.classList.remove('active');
  }

  toggleAudio(audioTrack);
});

qs('.player_play').addEventListener('click', () => {
  let audioItem = audiolist.children[danyadev.audio.track_id];

  toggleAudio(audioItem);
});

player_icon_repeat.addEventListener('click', () => {
  if(player_icon_repeat.classList.contains('active')) {
    player_icon_repeat.classList.remove('active');

    danyadev.audio.repeat = false;
  } else {
    player_icon_repeat.classList.add('active');

    danyadev.audio.repeat = true;
  }
});

qs('.player_icon_recoms').addEventListener('click', (e) => {
  // рекомендации
});

audio.addEventListener('ended', () => { // переключение на следующее аудио
  let id;

  if(!danyadev.audio.repeat) {
    audio.audio_item.children[0].classList.add('audio_cover_play');
    audio.audio_item.children[0].classList.remove('audio_cover_stop');
    audio.audio_item.classList.remove('audio_item_active');

    if(player_icon_repeat.classList.contains('active')) {
      player_icon_repeat.classList.remove('active');
    }

    id = danyadev.audio.track_id + 1;
  } else id = danyadev.audio.track_id;

  let audioItem = audiolist.children[id];

  if(!audioItem) {
    if(danyadev.audio.renderedItems < danyadev.audio.count) {
      if(danyadev.audio.blockNext) return;

      danyadev.audio.blockNext = 1;

      render().then(() => {
        player_next.click();
        danyadev.audio.blockNext = 0;
      });

      return;
    } else {
      qs('.player_play').classList.remove('pause');
    }
  } else setTimeout(() => toggleAudio(audioItem), 100);
});

audio.addEventListener('progress', () => { // сколько прогружено
  if(audio.buffered.length) {
    player_progress_loaded.style.width = audio.buffered.end(0) / audio.duration * 100 + '%';
  }
});

audio.addEventListener('timeupdate', () => { // сколько проиграно
  if(!danyadev.audio.seekstate) {
    player_progress_played.style.width = (audio.currentTime / audio.duration) * 100 + '%';
  }

  if(!audiolist.children[danyadev.audio.track_id]) return;
  let audio_played_time = audiolist.children[danyadev.audio.track_id].children[2].children[2];
  audio_played_time.innerHTML = player_played_time.innerHTML = matchTime(audio.currentTime);
});

player_progress_wrap.addEventListener('mousedown', (ev) => { // прокрутка трека
  if(!audio.duration) return; // нет времени -> нет трека -> выходим отсюда

  danyadev.audio.seekstate = 1;
  player_progress_wrap.classList.add('active');

  let mousemove = (e) => {
    let offsetx = e.pageX - player_progress_wrap.offsetLeft - audioplayer.offsetLeft,
        curTime = offsetx / player_progress_wrap.offsetWidth, selWidth = curTime * 100;

    if(selWidth > 100) selWidth = 100;
    if(selWidth < 0) selWidth = 0;

    player_progress_played.style.width = selWidth + '%';
  }

  let mouseup = (e) => {
    danyadev.audio.seekstate = 0;
    player_progress_wrap.classList.remove('active');

    document.removeEventListener('mousemove', mousemove);
    document.removeEventListener('mouseup', mouseup);

    let offsetx = e.pageX - player_progress_wrap.offsetLeft - audioplayer.offsetLeft;

    audio.currentTime = (offsetx * audio.duration) / player_progress_wrap.offsetWidth;
  }

  document.addEventListener('mousemove', mousemove);
  document.addEventListener('mouseup', mouseup);

  ev.preventDefault();
});

player_volume_wrap.addEventListener('mousedown', (ev) => { // громкость
  player_volume_wrap.classList.add('active');

  let mousemove = (e) => {
    let offsetx = e.pageX - player_volume_wrap.offsetLeft - audioplayer.offsetLeft,
        volume = offsetx / player_volume_wrap.offsetWidth;

    if(volume < 0) volume = 0;
    if(volume > 1) volume = 1;

    let selWidth = volume * 100;

    audio.volume = volume;
    qs('.player_volume_this').style.width = selWidth + '%';
  }

  let mouseup = () => {
    player_volume_wrap.classList.remove('active');

    document.removeEventListener('mousemove', mousemove);
    document.removeEventListener('mouseup', mouseup);
  }

  document.addEventListener('mousemove', mousemove);
  document.addEventListener('mouseup', mouseup);

  mousemove(ev);
  ev.preventDefault();
});

var downloadAudio = (data) => {
  return new Promise((resolve, reject) => {
    if(!data || !data.artist || !data.title || !data.url) reject('invalid params');

    let filename = `${data.artist} – ${data.title}.mp3`,
        filePath = `${utils.downloadsPath}/${filename}`;

    https.get(data.url, (res) => {
      res.pipe(fs.createWriteStream(filePath));
      res.on('end', () => resolve(`Аудиозапись ${filename} была скачана`));
    });
  });
}

module.exports = {
  load, audio,
  toggleAudio,
  toggleTime,
  downloadAudio
}
