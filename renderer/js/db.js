'use strict';

class Storage {
  constructor(name, data, replaceData) {
    this.data = JSON.parse(localStorage.getItem(name) || '{}');
    this.name = name;

    if(data) {
      if(replaceData) this.data = Object.assign({}, data);
      else this.data = Object.assign(Object.assign({}, data), this.data);
    }

    this.save();
  }

  setData(data) {
    this.data = data;
    this.save();
  }

  set(key, value) {
    this.data[key] = value;
    this.save();

    return this.data;
  }

  get(key) {
    return key ? this.data[key] : this.data;
  }

  save() {
    localStorage.setItem(this.name, JSON.stringify(this.data));
  }

  clear() {
    this.data = {};
    this.save();
  }
}

class Settings extends Storage {
  constructor() {
    super('settings');

    this.setData(this.getDefault());
  }

  getDefault(key) {
    let defaultSettings = {
      window: getCurrentWindow().getBounds(),
      volume: 1,
      def_tab: 1,
      dark_theme: false,
      update: true,
      notify_updates: true,
      beta: false,
      proxy: false,
      menu: [
        { enabled: true, name: 'Новости', type: 'news' },
        { enabled: true, name: 'Сообщения', type: 'messages' },
        { enabled: true, name: 'Аудиозаписи', type: 'audio' },
        { enabled: true, name: 'Уведомления', type: 'notifications' },
        { enabled: true, name: 'Друзья', type: 'friends' },
        { enabled: true, name: 'Группы', type: 'groups' },
        { enabled: true, name: 'Фотографии', type: 'photos' },
        { enabled: true, name: 'Видеозаписи', type: 'videos' },
        { enabled: true, name: 'Настройки', type: 'settings' }
      ]
    };

    if(key) return defaultSettings[key];
    else return defaultSettings;
  }
}

class Users extends Storage {
  constructor() {
    super('users', {});
  }

  get(id) {
    if(id) return this.data[id];
    else return find(this.data, (user) => user.active);
  }

  getAll() {
    return this.data;
  }

  add(user) {
    if(!(user instanceof Object)) throw Error('User must be an object');

    this.data[user.id] = user;
    this.save();
  }

  remove(id) {
    this.data[id] = undefined;
    this.save();
  }

  update(id, key, value) {
    let user = this.data[id];

    if(user) {
      this.data[id][key] = value;
      this.save();
    }
  }
}

module.exports = {
  Settings,
  Users
}
