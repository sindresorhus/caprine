'use strict';
const path = require('path');
const fs = require('fs');
const URL = require('url').URL;
const electron = require('electron');
const electronLocalShortcut = require('electron-localshortcut');
const log = require('electron-log');
const {autoUpdater} = require('electron-updater');
const isDev = require('electron-is-dev');
const appMenu = require('./menu');
const config = require('./config');
const tray = require('./tray');

const {app, ipcMain} = electron;

app.setAppUserModelId('com.sindresorhus.caprine');
app.disableHardwareAcceleration();

require('electron-debug')({enabled: true});
require('electron-dl')();
require('electron-context-menu')();

let mainWindow;
let isQuitting = false;
let prevMessageCount = 0;

const isAlreadyRunning = app.makeSingleInstance(() => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

if (isAlreadyRunning) {
	app.quit();
}

function updateBadge(title) {
	// ignore `Sindre messaged you` blinking
	if (title.indexOf('Messenger') === -1) {
		return;
	}

	let messageCount = (/\(([0-9]+)\)/).exec(title);
	messageCount = messageCount ? Number(messageCount[1]) : 0;

	if (process.platform === 'darwin' || process.platform === 'linux') {
		app.setBadgeCount(messageCount);
		if (process.platform === 'darwin' && config.get('bounceDockOnMessage') && prevMessageCount !== messageCount) {
			app.dock.bounce('informational');
			prevMessageCount = messageCount;
		}
	}

	if (process.platform === 'linux' || process.platform === 'win32') {
		tray.setBadge(messageCount);
	}

	if (process.platform === 'win32') {
		if (messageCount === 0) {
			mainWindow.setOverlayIcon(null, '');
		} else {
			// Delegate drawing of overlay icon to renderer process
			mainWindow.webContents.send('render-overlay-icon', messageCount);
		}

		if (config.get('flashWindowOnMessage')) {
			mainWindow.flashFrame(messageCount !== 0);
		}
	}
}

ipcMain.on('update-overlay-icon', (event, data, text) => {
	const img = electron.nativeImage.createFromDataURL(data);
	mainWindow.setOverlayIcon(img, text);
});

function enableHiresResources() {
	const scaleFactor = Math.max(...electron.screen.getAllDisplays().map(x => x.scaleFactor));

	if (scaleFactor === 1) {
		return;
	}

	electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
		let cookie = details.requestHeaders.Cookie;

		if (cookie && details.method === 'GET' && details.url.startsWith('https://www.messenger.com/')) {
			if (/(; )?dpr=\d/.test(cookie)) {
				cookie = cookie.replace(/dpr=\d/, `dpr=${scaleFactor}`);
			} else {
				cookie = `${cookie}; dpr=${scaleFactor}`;
			}

			details.requestHeaders.Cookie = cookie;
		}

		callback({
			cancel: false,
			requestHeaders: details.requestHeaders
		});
	});
}

function setUpPrivacyBlocking() {
	const ses = electron.session.defaultSession;
	const filter = {urls: ['*://*.messenger.com/*typ.php*', '*://*.messenger.com/*change_read_status.php*']};
	ses.webRequest.onBeforeRequest(filter, (details, callback) => {
		let blocking = false;
		if (details.url.includes('typ.php')) {
			blocking = config.get('block.typingIndicator');
		} else {
			blocking = config.get('block.chatSeen');
		}
		callback({cancel: blocking});
	});
}

function setUserLocale() {
	const facebookLocales = require('facebook-locales');
	const userLocale = facebookLocales.bestFacebookLocaleFor(app.getLocale());
	const cookie = {
		url: 'https://www.messenger.com/',
		name: 'locale',
		value: userLocale
	};
	electron.session.defaultSession.cookies.set(cookie, () => {});
}

function createMainWindow() {
	const lastWindowState = config.get('lastWindowState');
	const isDarkMode = config.get('darkMode');

	const win = new electron.BrowserWindow({
		title: app.getName(),
		show: false,
		x: lastWindowState.x,
		y: lastWindowState.y,
		width: lastWindowState.width,
		height: lastWindowState.height,
		icon: process.platform === 'linux' && path.join(__dirname, 'static/Icon.png'),
		minWidth: 400,
		minHeight: 200,
		alwaysOnTop: config.get('alwaysOnTop'),
		titleBarStyle: 'hidden-inset',
		autoHideMenuBar: true,
		darkTheme: isDarkMode, // GTK+3
		webPreferences: {
			preload: path.join(__dirname, 'browser.js'),
			nodeIntegration: false,
			plugins: true
		}
	});
	setUserLocale();
	setUpPrivacyBlocking();

	if (process.platform === 'darwin') {
		win.setSheetOffset(40);
	}

	win.loadURL('https://www.messenger.com/login/');

	win.on('close', e => {
		if (!isQuitting) {
			e.preventDefault();

			if (process.platform === 'darwin') {
				app.hide();
			} else {
				win.hide();
			}
		}
	});

	win.on('page-title-updated', (e, title) => {
		e.preventDefault();
		updateBadge(title);
	});

	win.on('focus', () => {
		if (config.get('flashWindowOnMessage')) {
			// This is a security in the case where messageCount is not reset by page title update
			win.flashFrame(false);
		}
	});

	return win;
}

if (!isDev && process.platform !== 'linux') {
	autoUpdater.logger = log;
	autoUpdater.logger.transports.file.level = 'info';
	autoUpdater.checkForUpdates();
}

app.on('ready', () => {
	electron.Menu.setApplicationMenu(appMenu);
	mainWindow = createMainWindow();
	tray.create(mainWindow);

	enableHiresResources();

	const {webContents} = mainWindow;

	const argv = require('minimist')(process.argv.slice(1));

	electronLocalShortcut.register(mainWindow, 'CmdOrCtrl+V', () => {
		if (electron.clipboard.availableFormats().some(type => type.includes('image'))) {
			electron.dialog.showMessageBox({
				type: 'info',
				buttons: ['Send', 'Cancel'],
				message: 'Are you sure you want to send the image in the clipboard?',
				icon: electron.clipboard.readImage()
			}, resp => {
				if (resp === 0) {
					// User selected send
					webContents.paste();
				}
			});
		} else {
			webContents.paste();
		}
	});

	webContents.on('dom-ready', () => {
		webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'browser.css'), 'utf8'));
		webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'dark-mode.css'), 'utf8'));
		webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'vibrancy.css'), 'utf8'));

		if (argv.minimize) {
			mainWindow.minimize();
		} else {
			mainWindow.show();
		}
	});

	webContents.on('new-window', (e, url, frameName, disposition, options) => {
		e.preventDefault();
		if (url === 'about:blank') {
			if (frameName === 'Video Call') {  // Voice/video call popup
				options.show = true;
				options.titleBarStyle = 'default';
				e.newGuest = new electron.BrowserWindow(options);
			}
		} else {
			if (url.startsWith('https://l.messenger.com/l.php')) {
				url = new URL(url).searchParams.get('u');
			}

			electron.shell.openExternal(url);
		}
	});
});

ipcMain.on('set-vibrancy', () => {
	if (config.get('vibrancy')) {
		mainWindow.setVibrancy(config.get('darkMode') ? 'ultra-dark' : 'light');
	} else {
		mainWindow.setVibrancy(null);
	}
});

app.on('activate', () => {
	mainWindow.show();
});

app.on('before-quit', () => {
	isQuitting = true;

	if (!mainWindow.isFullScreen()) {
		config.set('lastWindowState', mainWindow.getBounds());
	}
});
