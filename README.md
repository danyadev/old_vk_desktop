## Сборка
1. Установите NodeJS и git
2. Установите `electron packager`: `npm i -g electron-packager`
3. Склонируйте репозиторий: `git clone https://github.com/danyadev/vk-desktop-app.git`
4. В папке с репозиторием (не внутри него) откройте консоль
5. Введите `electron-packager ./vk-desktop-app/ --platform *platform* --arch *arch* --electronVersion 4.0.0-beta.9`

`*arch*` - `ia32` (32 бита) или `x64`,
`*platform*` - `win32`, `linux` или `darwin`
