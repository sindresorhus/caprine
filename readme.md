# Caprine <img src="static/Icon.png" width="60">

> Elegant Facebook Messenger desktop app

Caprine is an unofficial and privacy-focused Facebook Messenger app with many useful features.

**[Website](https://sindresorhus.com/caprine)**

<br>

<a href="https://github.com/sindresorhus/caprine/releases/latest">
	<img src="media/screenshot.png" width="846">
</a>

<a href="https://www.patreon.com/sindresorhus">
	<img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="160">
</a>


## Highlights

- [Dark theme](#dark-mode)
- [Vibrant theme](#vibrancy)*
- [Privacy-focused](#hide-last-seen--typing-indicator)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Work Chat support](#work-chat-support)
- [Code blocks](#code-blocks)
- [Touch Bar support](#touch-bar-support)
- [Custom styles](#custom-styles)
- Cross-platform
- Silent auto-updates
- Custom text size

\*macOS only

## Install

*macOS 10.10+, Linux, and Windows 7+ are supported (64-bit only).*

Download the latest version on the [website](https://sindresorhus.com/caprine) or below.

### macOS

[**Download**](https://github.com/sindresorhus/caprine/releases/latest) the `.dmg` file.

Or with [Homebrew-Cask](https://caskroom.github.io): `$ brew cask install caprine`

### Linux

[**Download**](https://github.com/sindresorhus/caprine/releases/latest) the `.AppImage` or `.deb` file.

Arch Linux: `pacman -S caprine`

Also available as a [snap](https://snapcraft.io/caprine).

*The AppImage needs to be [made executable](http://discourse.appimage.org/t/how-to-make-an-appimage-executable/80) after download.*

### Windows

[**Download**](https://github.com/sindresorhus/caprine/releases/latest) the `.exe` file.

*For taskbar notification badges to work on Windows 10, you'll need to [enable them in Taskbar Settings](https://www.tenforums.com/tutorials/48186-taskbar-buttons-hide-show-badges-windows-10-a.html).*


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

### Mute desktop notifications

You can quickly disable receiving notifications from the `Caprine`/`File` menu or the Dock on macOS.

### Prevents link tracking

Links that you click on will not be tracked by Facebook.

### Jump to conversation hotkey

You can switch conversations similar to how you switch browser tabs: <kbd>Cmd/Ctrl</kbd> <kbd>n</kbd> (where `n` is `1` through `9`).

### Compact mode

The interface adapts when resized to a small size.

<div align="center"><img src="media/screenshot-compact.png" width="512"></div>

### Desktop notifications

Desktop notifications can be turned on in `Preferences`.

<div align="center"><img src="media/screenshot-notification.png" width="358"></div>

### Always on Top

You can toggle whether Caprine stays on top of other windows in the `Window`/`View` menu or with <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>t</kbd>.

### Image paste confirmation

Confirmation before sending images from the clipboard, to prevent accidental copy-pastes.

### Work Chat support

Support for Work Chat: Messenger for [Workplace](https://www.facebook.com/workplace). You can switch to it in the `Caprine`/`File` menu.

<div align="center"><img src="media/screenshot-work-chat.png" width="788"></div>

### Code blocks

You can send code blocks by using [Markdown syntax](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet#code).

<div align="center"><img src="media/screenshot-codeblocks-dark.png" width="784"></div>
<div align="center"><img src="media/screenshot-codeblocks-light.png" width="784"></div>

### Background behavior

When closing the window, the app will by default continue running in the background, in the dock on macOS and the tray on Linux/Windows. Right-click the dock/tray icon and choose `Quit` to completely quit the app. On macOS, click the dock icon to show the window. On Linux, right-click the tray icon and choose `Toggle` to toggle the window. On Windows, click the tray icon to toggle the window.

Note that you can change the behavior of Caprine so that the app closes when the window is closed. For this, you'll need to go to the settings and click on `Quit on Window Close`.

### Quick access to conversations from the Dock menu *(macOS only)*

<img src="media/screenshot-dock-menu.png" width="319" height="404">

### Touch Bar support *(macOS only)*

<img src="media/screenshot-touchbar.png" width="1085">

### Custom styles

Advanced users can modify the colors/styles of Caprine. Click the menu item `Caprine`/`File` → `Caprine Settings` → `Advanced` → `Custom Styles` and a CSS file will open up in your default editor.

### Keyboard shortcuts

Description            | Keys
-----------------------| -----------------------
New conversation       | <kbd>Cmd/Ctrl</kbd> <kbd>n</kbd>
Search conversations   | <kbd>Cmd/Ctrl</kbd> <kbd>k</kbd>
Toggle "Dark mode"     | <kbd>Cmd/Ctrl</kbd> <kbd>d</kbd>
Next conversation      | <kbd>Cmd/Ctrl</kbd> <kbd>]</kbd> or <kbd>Ctrl</kbd> <kbd>Tab</kbd>
Previous conversation  | <kbd>Cmd/Ctrl</kbd> <kbd>[</kbd> or <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Tab</kbd>
Jump to conversation   | <kbd>Cmd/Ctrl</kbd> <kbd>1</kbd>…<kbd>9</kbd>
Insert GIF             | <kbd>Cmd/Ctrl</kbd> <kbd>g</kbd>
Insert emoji           | <kbd>Cmd/Ctrl</kbd> <kbd>e</kbd>
Insert text            | <kbd>Cmd/Ctrl</kbd> <kbd>i</kbd>
Search in conversation | <kbd>Cmd/Ctrl</kbd> <kbd>f</kbd>
Mute conversation      | <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>m</kbd>
Archive conversation   | <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>a</kbd>
Delete conversation    | <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>d</kbd>
Toggle "Always on Top" | <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>t</kbd>
Toggle window menu     | <kbd>Alt</kbd> *(Windows only)*
Toggle sidebar         | <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>s</kbd>
Switch to Messenger    | <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>1</kbd>
Switch to Workchat     | <kbd>Cmd/Ctrl</kbd> <kbd>Shift</kbd> <kbd>2</kbd>
Preferences            | <kbd>Cmd/Ctrl</kbd> <kbd>,</kbd>


---


## Dev

Built with [Electron](https://electronjs.org).

### Run

```
$ npm install && npm start
```

### Build

See the [`electron-builder` docs](https://www.electron.build/multi-platform-build).

### Publish

```
$ npm run release
```

Then edit the automatically created GitHub Releases draft and publish.


## Maintainers

- [Sindre Sorhus](https://sindresorhus.com)
- [Aw Young Qingzhuo](https://github.com/veniversum)
- [Jarek Radosz](https://github.com/CvX)


## Links

- [Product Hunt post](https://www.producthunt.com/posts/caprine-2)


## Disclaimer

Caprine is a third-party app and is not affiliated with Facebook.


## License

MIT
