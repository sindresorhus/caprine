# Caprine <img src="static/Icon.png" width="60">

> Unofficial Facebook Messenger app

<br>
[![](media/screenshot.png)](https://github.com/sindresorhus/caprine/releases/latest)


## Features

### Background behavior

When closing the window, the app will continue running in the background, in the dock on macOS and the tray on Linux/Windows. Right-click the dock/tray icon and choose `Quit` to completely quit the app. On macOS, click the dock icon to show the window. On Linux, right-click the tray icon and choose `Toggle` to toggle the window. On Windows, click the tray icon to toggle the window.

If you like to have Caprine minimized on startup, open it from the command-line with the `--minimize` flag.

### Dark mode

You can toggle dark mode in the `Caprine` menu or with <kbd>Cmd</kbd> <kbd>D</kbd> / <kbd>Ctrl</kbd> <kbd>D</kbd>.

![](media/screenshot-dark.png)

### Vibrancy

On *macOS*, you can add vibrancy effect to the window in the `Caprine` menu or with <kbd>Cmd</kbd> <kbd>T</kbd>.

### Jump to conversation hotkey

You can switch conversations similar to how you switch browser tabs: <kbd>Cmd/Ctrl</kbd> <kbd>n</kbd> (where `n` is `1` through `9`).


### Compact mode

The interface adapts when resized to a small size.

<div align="center"><img src="media/screenshot-compact.png" width="512"></div>


### Desktop notifications

Desktop notifications can be turned on in Preferences.

<div align="center"><img src="media/screenshot-notification.png" width="358"></div>

### Always on Top

You can toggle whether Caprine stays on top of other windows in the `Window`/`View` menu or with <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>t</kbd>.

### Keyboard shortcuts

Description            | Keys
-----------------------| -----------------------
New conversation       | <kbd>Cmd/Ctrl</kbd> <kbd>n</kbd>
Search conversations   | <kbd>Cmd/Ctrl</kbd> <kbd>f</kbd>
Toggle "Dark mode"     | <kbd>Cmd/Ctrl</kbd> <kbd>d</kbd>
Next conversation      | <kbd>Cmd/Ctrl</kbd> <kbd>]</kbd> or <kbd>Ctrl</kbd> <kbd>Tab</kbd>
Previous conversation  | <kbd>Cmd/Ctrl</kbd> <kbd>[</kbd> or <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Tab</kbd>
Jump to conversation   | <kbd>Cmd/Ctrl</kbd> <kbd>1</kbd>…<kbd>9</kbd>
Mute conversation      | <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>m</kbd>
Archive conversation   | <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>a</kbd>
Delete conversation    | <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>d</kbd>
Toggle "Always on Top" | <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>t</kbd>


## Install

*macOS 10.9+, Windows 7+ & Linux are supported.*

### macOS

#### [Homebrew Cask](http://caskroom.io)

```
$ brew update && brew cask install caprine
```

#### Manually

[**Download**](https://github.com/sindresorhus/caprine/releases/latest), unzip, and move `Caprine.app` to the `/Applications` directory.

### Linux

[**Download**](https://github.com/sindresorhus/caprine/releases/latest) and unzip to some location.

To add a shortcut to the app, create a file in `~/.local/share/applications` called `caprine.desktop` with the following contents:

```
[Desktop Entry]
Name=Caprine
Exec=/full/path/to/folder/Caprine
Terminal=false
Type=Application
Icon=/full/path/to/folder/Caprine/resources/app/static/Icon.png
```

### Windows

[**Download**](https://github.com/sindresorhus/caprine/releases/latest) and unzip to some location.


---


## Dev

Built with [Electron](http://electron.atom.io).

###### Commands

- Init: `$ npm install`
- Run: `$ npm start`
- Build macOS: `$ npm run build:macos`
- Build Linux: `$ npm run build:linux`
- Build Windows: `$ npm run build:windows`
- Build all: `$ brew install wine` and `$ npm run build` *(macOS only)*


## Related

- [Anatine](https://github.com/sindresorhus/anatine) - Pristine Twitter app


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
