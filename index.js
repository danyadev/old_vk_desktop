const { app, BrowserWindow, Menu } = require('electron');
const fs = require('fs');

let win, lastChangeTime;

// Упрощенная версия electron-reload, только без десятков зависимостей :)
if(!app.isPackaged) {
  fs.watch('.', { recursive: true }, (event, filename) => {
    let prevChangeTime = lastChangeTime;
    lastChangeTime = new Date().getTime();
    if(prevChangeTime < lastChangeTime - 250 || !filename) return;

    let path = filename.replace(/\\/g, '/'),
        ignoredFiles = [
          '.git', 'core', '.gitignore', 'index.js',
          'LICENSE', 'package.json', 'README.md'
        ];

    let isIgnored = ignoredFiles.find((ignoredPath) => {
      let regexp = new RegExp(`${ignoredPath}/`);
      return ignoredPath == path || path.match(regexp);
    });

    if(isIgnored) return;

    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.reloadIgnoringCache();
    });
  });
}

app.commandLine.appendSwitch('disable-mojo-local-storage');
app.on('window-all-closed', app.quit);

app.on('ready', () => {
  win = new BrowserWindow({
    minWidth: 640,
    minHeight: 480,
    show: false,
    frame: false,
    icon: 'renderer/images/logo.png',
    titleBarStyle: 'hidden'
  });

  let code = '[localStorage.getItem("settings"), screen.availWidth, screen.availHeight]';

  win.webContents.executeJavaScript(code).then((data) => {
    if(data[0]) {
      let settings = JSON.parse(data[0]),
          maximized = settings.window.width > data[1] && settings.window.height > data[2],
          q = (num) => num < 0 && maximized ? -num : num;

      win.setBounds({
        x: q(settings.window.x),
        y: q(settings.window.y),
        width: maximized ? data[1] : settings.window.width,
        height: maximized ? data[2] : settings.window.height
      });

      if(maximized) win.maximize();
    }

    win.show();
  });

  if(process.platform == 'darwin') {
    let menuTemplate = [{
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteandmatchstyle' },
        { role: 'delete' },
        { role: 'selectall' }
      ]
    }];

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  } else win.setMenu(null);

  win.loadFile('renderer/index.html');
  win.on('closed', () => win = null);
});
