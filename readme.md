# <img src="media/Icon.png" width="45" align="left">&nbsp;Caprine

> Unofficial Facebook Messenger app

<br>
[![](media/screenshot.png)](https://github.com/sindresorhus/caprine/releases/latest)

*Requires OS X 10.8+ or Linux. Windows support planned.*

## Install

### OS X

#### [Homebrew Cask](http://caskroom.io)

```
$ brew cask install caprine
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
Icon=/full/path/to/folder/Caprine/resources/app/media/Icon.png
```


## Compact mode

The interface adapts when resized to a small size.

<div align="center"><img src="media/screenshot-compact.png" width="512"></div>


## Desktop notifications

Desktop notifications can be turned on in Preferences.

<div align="center"><img src="media/screenshot-notification.png" width="358"></div>

NOTE: There is a [known bug](https://github.com/atom/electron/issues/2294) with Electron's handling of desktop notifications on systems running Gnome 3 that may cause Caprine to crash if notifications are clicked. Until this bug is resolved, do not click on notifications if they cause the app to crash on your system.

## Dev

Built with [Electron](http://electron.atom.io).

###### Commands

- Init: `$ npm install`
- Run: `$ npm start`
- Build OS X: `$ npm run build-osx`
- Build Linux: `$ npm run build-linux`
- Build Windows: `$ npm run build-windows`
- Build all: `$ brew install wine` and `$ npm run build` *(OS X only)*


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
