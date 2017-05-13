# Caprine <img src="static/Icon.png" width="60">

> Elegant Facebook Messenger desktop app

Caprine is an unofficial and privacy focused Facebook Messenger app with many useful features.

**[Discuss it on Product Hunt](https://www.producthunt.com/posts/caprine-2)**

<br>

<a href="https://github.com/sindresorhus/caprine/releases/latest">
	<img src="media/screenshot.png" width="846">
</a>


## Highlights

- [Dark theme](#dark-mode)
- [Vibrant theme](#vibrancy)*
- [Privacy focused](#hide-last-seen--typing-indicator)
- [Keyboard shortcuts](#keyboard-shortcuts)
- Cross-platform
- Silent auto-updates
- Custom text size

\*macOS only

## Install

*macOS 10.9+, Linux, and Windows 7+ are supported (64-bit only).*

### macOS

[**Download**](https://github.com/sindresorhus/caprine/releases/latest) the `.dmg` file.

Or with [Homebrew-Cask](https://caskroom.github.io): `$ brew cask install caprine`

### Linux

[**Download**](https://github.com/sindresorhus/caprine/releases/latest) the `.AppImage` or `.deb` file.

*The AppImage needs to be [made executable](http://discourse.appimage.org/t/how-to-make-an-appimage-executable/80) after download.*

### Windows

[**Download**](https://github.com/sindresorhus/caprine/releases/latest) the `.exe` file.

*For taskbar notification badges to work on Windows 10, you'll need to [enable it in Taskbar Settings](https://www.tenforums.com/tutorials/48186-taskbar-buttons-hide-show-badges-windows-10-a.html).*


## Features

### Dark mode

You can toggle dark mode in the `View` menu or with <kbd>Cmd</kbd> <kbd>D</kbd> / <kbd>Ctrl</kbd> <kbd>D</kbd>.

<img src="media/screenshot-dark.png" width="846">

### Vibrancy

On *macOS*, you can toggle the window vibrancy effect in the `View` menu.

<img src="media/screenshot-vibrancy.jpg" width="1165">

### Hide last seen / typing indicator

<img src="media/screenshot-block-typing-indicator.png" width="626">

You can choose to prevent people from knowing when you've seen a message or are currently typing. Both options are available under the `Caprine`/`File` menu.

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

### Image paste confirmation

Confirmation before sending images from the clipboard, to prevent accidental copy-pastes.

### Background behavior

When closing the window, the app will continue running in the background, in the dock on macOS and the tray on Linux/Windows. Right-click the dock/tray icon and choose `Quit` to completely quit the app. On macOS, click the dock icon to show the window. On Linux, right-click the tray icon and choose `Toggle` to toggle the window. On Windows, click the tray icon to toggle the window.

If you like to have Caprine minimized on startup, open it from the command-line with the `--minimize` flag.

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
Toggle window menu     | <kbd>Alt</kbd> *(Windows only)*


---


## Dev

Built with [Electron](http://electron.atom.io).

### Run

```
$ npm install && npm start
```

### Build

See the [`electron-builder` docs](https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build).

### Publish

Use [`np`](https://github.com/sindresorhus/np) and for example run:

```
$ np minor --no-publish
```

Then edit the automatically created GitHub Releases draft, remove the `.pkg` file, and publish.


## Maintainers

- [Sindre Sorhus](https://sindresorhus.com)
- [Aw Young Qingzhuo](https://github.com/veniversum)


## Disclaimer

Caprine is a third-party app and is not affiliated with Facebook.


## License

MIT
