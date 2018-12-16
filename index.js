const { app, BrowserWindow, Menu } = require('electron');
const fs = require('fs');

let win = null,
    lastChangeTime = null,
    appPath = app.getAppPath().replace(/\\/g, '/');

if(!appPath.match(/resources\/app$/)) {
  fs.watch('.', { recursive: true }, (event, filename) => {
    let prevChangeTime = lastChangeTime;
    lastChangeTime = new Date().getTime();

    if(prevChangeTime < lastChangeTime - 100) return;

    let path = filename.replace(/\\/g, '/'),
        ignore = [
          '.git', 'core', 'docs', '.gitignore', 'changelog.txt',
          'index.js', 'LICENSE', 'package.json', 'README.md'
        ].find((ignPath) => ignPath == path || path.match(new RegExp(`${ignPath}/`)));

    if(ignore) return;

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
