'use strict';
const path = require('path');
const fs = require('fs');
const {URL} = require('url');
const electron = require('electron');
const log = require('electron-log');
const {autoUpdater} = require('electron-updater');
const isDev = require('electron-is-dev');
const appMenu = require('./menu');
const config = require('./config');
const tray = require('./tray');
const {sendAction} = require('./util');

require('./touch-bar'); // eslint-disable-line import/no-unassigned-import

require('electron-debug')({
	enabled: true, // TODO: This is only enabled to allow CMD+R because messenger sometimes gets stuck after computer waking up
	showDevTools: false
});
require('electron-dl')();
require('electron-context-menu')();

const domain = config.get('useWorkChat') ? 'facebook.com' : 'messenger.com';
const {app, ipcMain, Menu, nativeImage} = electron;

app.setAppUserModelId('com.sindresorhus.caprine');

if (!isDev) {
	autoUpdater.logger = log;
	autoUpdater.logger.transports.file.level = 'info';
	const FOUR_HOURS = 1000 * 60 * 60 * 4;
	setInterval(() => autoUpdater.checkForUpdates(), FOUR_HOURS);
}

let mainWindow;
let isQuitting = false;
let prevMessageCount = 0;
let dockMenu;

if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on('second-instance', () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

function updateBadge(conversations) {
	// ignore `Sindre messaged you` blinking
	if (!Array.isArray(conversations)) {
		return;
	}

	const messageCount = conversations.filter(({unread}) => unread).length;

	if (process.platform === 'darwin' || process.platform === 'linux') {
		if (config.get('showUnreadBadge')) {
			app.setBadgeCount(messageCount);
		}
		if (process.platform === 'darwin' && config.get('bounceDockOnMessage') && prevMessageCount !== messageCount) {
			app.dock.bounce('informational');
			prevMessageCount = messageCount;
		}
	}

	if ((process.platform === 'linux' || process.platform === 'win32') && config.get('showUnreadBadge')) {
		tray.setBadge(messageCount);
	}

	if (process.platform === 'win32') {
		if (config.get('showUnreadBadge')) {
			if (messageCount === 0) {
				mainWindow.setOverlayIcon(null, '');
			} else {
				// Delegate drawing of overlay icon to renderer process
				mainWindow.webContents.send('render-overlay-icon', messageCount);
			}
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

	const filter = {urls: [`*://*.${domain}/`]};
	electron.session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
		let cookie = details.requestHeaders.Cookie;

		if (cookie && details.method === 'GET') {
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
	const filter = {urls: [`*://*.${domain}/*typ.php*`, `*://*.${domain}/*change_read_status.php*`]};
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
	const userLocale = facebookLocales.bestFacebookLocaleFor(app.getLocale().replace('-', '_'));
	const cookie = {
		url: 'https://www.messenger.com/',
		name: 'locale',
		value: userLocale
	};
	electron.session.defaultSession.cookies.set(cookie, () => {});
}

function setNotificationsMute(status) {
	const label = 'Mute Notifications';
	const muteMenuItem = Menu.getApplicationMenu().items[0].submenu.items
		.find(x => x.label === label);

	config.set('notificationsMuted', status);
	muteMenuItem.checked = status;

	if (process.platform === 'darwin') {
		const item = dockMenu.items.find(x => x.label === label);
		item.checked = status;
	}
}

function createMainWindow() {
	const lastWindowState = config.get('lastWindowState');
	const isDarkMode = config.get('darkMode');
	// Messenger or Work Chat
	const mainURL = config.get('useWorkChat') ? 'https://work.facebook.com/chat' : 'https://www.messenger.com/login/';

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
		titleBarStyle: 'hiddenInset',
		autoHideMenuBar: config.get('autoHideMenuBar'),
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

	win.loadURL(mainURL);

	win.on('close', e => {
		if (!isQuitting) {
			e.preventDefault();

			// Workaround for electron/electron#10023
			win.blur();

			if (process.platform === 'darwin') {
				app.hide();
			} else {
				win.hide();
			}
		}
	});

	win.on('focus', () => {
		if (config.get('flashWindowOnMessage')) {
			// This is a security in the case where messageCount is not reset by page title update
			win.flashFrame(false);
		}
	});

	return win;
}

app.on('ready', () => {
	const trackingUrlPrefix = `https://l.${domain}/l.php`;
	electron.Menu.setApplicationMenu(appMenu);
	mainWindow = createMainWindow();
	tray.create(mainWindow);

	if (process.platform === 'darwin') {
		const firstItem = {
			label: 'Mute Notifications',
			type: 'checkbox',
			checked: config.get('notificationsMuted'),
			click() {
				mainWindow.webContents.send('toggle-mute-notifications');
			}
		};
		dockMenu = electron.Menu.buildFromTemplate([firstItem]);
		app.dock.setMenu(dockMenu);

		ipcMain.on('conversations', (event, conversations) => {
			if (conversations.length === 0) {
				return;
			}

			const items = conversations.map(({label, icon}, index) => {
				return {
					label: `${label}`,
					icon: nativeImage.createFromDataURL(icon),
					click: () => {
						mainWindow.show();
						sendAction('jump-to-conversation', index + 1);
					}
				};
			});
			app.dock.setMenu(electron.Menu.buildFromTemplate([firstItem, {type: 'separator'}, ...items]));
		});

		// Update badge on conversations change
		ipcMain.on('conversations', (event, conversations) => updateBadge(conversations));
	}

	enableHiresResources();

	const {webContents} = mainWindow;

	webContents.on('dom-ready', () => {
		webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'browser.css'), 'utf8'));
		webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'dark-mode.css'), 'utf8'));
		webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'vibrancy.css'), 'utf8'));
		if (config.get('useWorkChat')) {
			webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'workchat.css'), 'utf8'));
		}

		if (config.get('launchMinimized') || app.getLoginItemSettings().wasOpenedAsHidden) {
			mainWindow.hide();
		} else {
			mainWindow.show();
		}

		mainWindow.webContents.send('toggle-mute-notifications', config.get('notificationsMuted'));
		mainWindow.webContents.send('toggle-message-buttons', config.get('showMessageButtons'));
	});

	webContents.on('new-window', (event, url, frameName, disposition, options) => {
		event.preventDefault();

		if (url === 'about:blank') {
			if (frameName !== 'about:blank') { // Voice/video call popup
				options.show = true;
				options.titleBarStyle = 'default';
				options.webPreferences.nodeIntegration = false;
				options.webPreferences.preload = path.join(__dirname, 'browser-call.js');
				event.newGuest = new electron.BrowserWindow(options);
			}
		} else {
			if (url.startsWith(trackingUrlPrefix)) {
				url = new URL(url).searchParams.get('u');
			}

			electron.shell.openExternal(url);
		}
	});

	webContents.on('will-navigate', (event, url) => {
		const isMessengerDotCom = url => {
			const {hostname} = new URL(url);
			return hostname === 'www.messenger.com';
		};

		const isTwoFactorAuth = url => {
			const twoFactorAuthURL = 'https://www.facebook.com/checkpoint/start';
			return url.startsWith(twoFactorAuthURL);
		};

		const isWorkChat = url => {
			const {hostname, pathname} = new URL(url);

			if (hostname === 'work.facebook.com') {
				return true;
			}

			if (
				// Example: https://company-name.facebook.com/login
				hostname.endsWith('.facebook.com') &&
				(pathname.startsWith('/login') || pathname.startsWith('/chat'))
			) {
				return true;
			}

			if (hostname === 'login.microsoftonline.com') {
				return true;
			}

			return false;
		};

		if (
			isMessengerDotCom(url) ||
			isTwoFactorAuth(url) ||
			isWorkChat(url)
		) {
			return;
		}

		event.preventDefault();
		electron.shell.openExternal(url);
	});
});

ipcMain.on('set-vibrancy', () => {
	if (config.get('vibrancy')) {
		mainWindow.setVibrancy(config.get('darkMode') ? 'ultra-dark' : 'light');
	} else {
		mainWindow.setVibrancy(null);
	}
});

ipcMain.on('mute-notifications-toggled', (event, status) => {
	setNotificationsMute(status);
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
