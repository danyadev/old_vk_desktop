'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const { dialog } = require('electron').remote;

const oauth = 'client_id=2cca2222a6f211d96eb5&client_secret=7ca0d642c52d3c5c4d793782993da8691152a8f3';

var newSHA, oldSHA;

var getSHA = (pkg, data) => {
  return new Promise(async (resolve) => {
    let branch = settings.beta ? 'dev' : 'master';

    if(packageJSON.build == pkg.build) {
      resolve(data.commit.sha);
      return;
    }

    if(branch == 'master' && packageJSON.build > pkg.build) branch = 'dev';

    let commits = JSON.parse(await utils.request({
      host: 'api.github.com',
      path: `/repos/danyadev/vk-desktop-app/commits?sha=${branch}&${oauth}`,
      headers: { 'User-Agent': 'VK Desktop' }
    }));

    for(let commit of commits) {
      let thisPackage = JSON.parse(await utils.request({
        host: 'raw.githubusercontent.com',
        path: `/danyadev/vk-desktop-app/${commit.sha}/package.json`
      }));

      if(thisPackage.build == packageJSON.build) {
        resolve(commit.sha);
        return;
      }
    }
  });
}

var check = async () => {
  if(!settings.update || !(users.get() || {}).isTester) return;

  let branch = settings.beta ? 'dev' : 'master',
      ext_pkg = JSON.parse(await utils.request({
        host: 'raw.githubusercontent.com',
        path: `/danyadev/vk-desktop-app/${branch}/package.json`
      })),
      data = JSON.parse(await utils.request({
        host: 'api.github.com',
        path: `/repos/danyadev/vk-desktop-app/branches/${branch}?${oauth}`,
        headers: { 'User-Agent': 'VK Desktop' }
      })),
      changelog = await utils.request({
        host: 'raw.githubusercontent.com',
        path: `/danyadev/vk-desktop-app/${branch}/changelog.txt`
      }),
      commitTime = new Date(data.commit.commit.committer.date).getTime(),
      updateTime = commitTime < new Date().getTime() - 1000 * 60 * 5,
      versions = {}, changes = '', num = 0;

  newSHA = data.commit.sha;
  oldSHA = await getSHA(ext_pkg, data);

  if(!updateTime || ext_pkg.build <= packageJSON.build) {
    setTimeout(check, 1000 * 60 * 5);
    return;
  }

  changelog.split('\n\n').forEach((version) => {
    let v = version.match(/Версия ([^:]+)/)[1],
        this_v = `${packageJSON.version} (${packageJSON.build})`;

    versions[v] = version.replace(/[^\n]+\n/, '');

    if(v > this_v) changes += `\n${versions[v]}`;
  });

  let lastV = Object.keys(versions)[0],
      update_item = utils.createElement('div', { class: 'menu_item update_item' },
                                        '<div class="menu_item_name">Обновить приложение</div>');

  qs('.menu').appendChild(update_item);
  qs('.menu_list').classList.add('update');

  update_item.addEventListener('click', () => {
    toggleMenu();
    modal.update.toggle();
  });

  if(!settings.notify_updates) return;

  let stage1 = modal.update.content.children[0];

  stage1.children[0].innerHTML = `Доступна новая версия ${lastV}`;
  stage1.children[1].innerHTML = `${changes.replace(/\n/g, '<br>')}`;

  modal.update.toggle();
}

var update = async () => {
  let { update, remove } = await getEditedFiles(),
      content = modal.update.content.children[1].children[2];

  let updateFile = i => {
    if(!update[i]) {
      content.innerHTML = 'Загрузка...';

      remove.forEach(file => {
        try { fs.unlinkSync(file) } catch(e) {}
      });

      qs('.update_item').remove();
      qs('.menu_list').classList.remove('update');

      modal.update.content.children[1].style.display = 'none';
      modal.update.content.children[2].style.display = 'block';

      modal.update.buttons[1].style.display = 'none';
      modal.update.buttons[2].style.display = 'block';
      modal.update.buttons[3].style.display = 'block';

      return;
    }

    let filename = update[i],
        githubFile = filename.replace(utils.appPath, '');

    if(!fs.existsSync(filename)) mkdirP(filename.replace(/[^/]+$/, ''));

    https.get({
      host: 'raw.githubusercontent.com',
      path: `/danyadev/vk-desktop-app/${settings.beta ? 'dev' : 'master'}${encodeURIComponent(githubFile)}`
    }, (res) => {
      content.innerHTML = `${i+1} из ${update.length}<br>${githubFile}`;

      res.pipe(fs.createWriteStream(filename));
      res.on('end', () => updateFile(++i));
    });
  }

  updateFile(0);
}

var mkdirP = (p) => {
  p = path.resolve(p);

  try {
    fs.mkdirSync(p);
  } catch(err) {
    if(err.code == 'ENOENT') {
      mkdirP(path.dirname(p));
      mkdirP(p);
    }
  }
}

var getEditedFiles = async () => {
  let data = JSON.parse(await utils.request({
        host: 'api.github.com',
        path: `/repos/danyadev/vk-desktop-app/compare/${oldSHA}...${newSHA}?${oauth}`,
        headers: { 'User-Agent': 'VK Desktop' }
      }));

  return data.files.reduce((obj, item) => {
    let key = item.status == 'removed' ? 'remove' : 'update';
    obj[key].push(`${utils.appPath}/${item.filename}`);
    return obj;
  }, { update: [], remove: [] });
}

module.exports = {
  check,
  update
}
