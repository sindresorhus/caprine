'use strict';
const path = require('path');
const fs = require('fs');
const {URL} = require('url');
const electron = require('electron');
const {darkMode, is} = require('electron-util');
const log = require('electron-log');
const {autoUpdater} = require('electron-updater');
const isDev = require('electron-is-dev');
const appMenu = require('./menu');
const config = require('./config');
const tray = require('./tray');
const {sendAction} = require('./util');

require('./touch-bar'); // eslint-disable-line import/no-unassigned-import

require('electron-debug')({
	enabled: true, // TODO: This is only enabled to allow `Command+R` because messenger sometimes gets stuck after computer waking up
	showDevTools: false
});
require('electron-dl')();
require('electron-context-menu')();

const domain = config.get('useWorkChat') ? 'facebook.com' : 'messenger.com';
const {app, ipcMain, Menu, nativeImage, Notification, systemPreferences} = electron;

app.setAppUserModelId('com.sindresorhus.caprine');

// Disables broken color space correction in Chromium.
// You can see differing background color on the login screen.
// https://github.com/electron/electron/issues/9671
app.commandLine.appendSwitch('disable-color-correct-rendering');

if (!config.get('hardwareAcceleration')) {
	app.disableHardwareAcceleration();
}

if (!isDev) {
	autoUpdater.logger = log;
	autoUpdater.logger.transports.file.level = 'info';
	const FOUR_HOURS = 1000 * 60 * 60 * 4;
	setInterval(() => autoUpdater.checkForUpdates(), FOUR_HOURS);
	autoUpdater.checkForUpdates();
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
	// Ignore `Sindre messaged you` blinking
	if (!Array.isArray(conversations)) {
		return;
	}

	const messageCount = conversations.filter(({unread}) => unread).length;

	if (is.macos || is.linux) {
		if (config.get('showUnreadBadge')) {
			app.setBadgeCount(messageCount);
		}

		if (is.macos && config.get('bounceDockOnMessage') && prevMessageCount !== messageCount) {
			app.dock.bounce('informational');
			prevMessageCount = messageCount;
		}
	}

	if (is.linux || is.windows) {
		if (config.get('showUnreadBadge')) {
			tray.setBadge(messageCount);
		}

		if (config.get('flashWindowOnMessage')) {
			mainWindow.flashFrame(messageCount !== 0);
		}
	}

	if (is.windows) {
		if (config.get('showUnreadBadge')) {
			if (messageCount === 0) {
				mainWindow.setOverlayIcon(null, '');
			} else {
				// Delegate drawing of overlay icon to renderer process
				mainWindow.webContents.send('render-overlay-icon', messageCount);
			}
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

function setUpRequestsFiltering() {
	const filter = {urls: [`*://*.${domain}/*typ.php*`, `*://*.${domain}/*change_read_status.php*`, '*://static.xx.fbcdn.net/images/emoji.php/v9/*', '*://facebook.com/images/emoji.php/v9/*']};

	electron.session.defaultSession.webRequest.onBeforeRequest(filter, ({url}, callback) => {
		if (url.includes('emoji.php')) {
			processEmoji(url, callback);
		} else {
			processPrivacyBlocking(url, callback);
		}
	});
}

function processPrivacyBlocking(url, callback) {
	if (url.includes('typ.php')) {
		callback({cancel: config.get('block.typingIndicator')});
	} else if (url.includes('change_read_status.php')) {
		callback({cancel: config.get('block.chatSeen')});
	}
}

function processEmoji(url, callback) {
	const exclude = ['f0000.png', '1f6b5_200d_2640.png', '1f6b4_200d_2640.png', '1f3c4_200d_2640.png', '1f3ca_200d_2640.png', '1f6a3_200d_2640.png', '1f469_200d_2764_200d_1f48b_200d_1f469.png', '1f468_200d_2764_200d_1f48b_200d_1f468.png', '1f469_200d_2764_200d_1f469.png', '1f468_200d_2764_200d_1f468.png', '1f486_200d_2640.png', '1f487_200d_2640.png', '1f64d_200d_2640.png', '1f64e_200d_2640.png', '1f64b_200d_2640.png', '1f646_200d_2640.png', '1f645_200d_2640.png', '1f481_200d_2640.png', '1f647_200d_2640.png', '1f46f_200d_2640.png', '1f3c3_200d_2640.png', '1f6b6_200d_2640.png', '1f482_200d_2640.png', '1f477_200d_2640.png', '1f46e_200d_2640.png', '1f473_200d_2640.png', '1f471_200d_2640.png', '1f469_200d_2764_200d_1f48b_200d_1f469.png', '1f468_200d_2764_200d_1f48b_200d_1f468.png', '1f469_200d_2764_200d_1f469.png', '1f468_200d_2764_200d_1f468.png', '1f486_200d_2640.png', '1f487_200d_2640.png', '1f64d_200d_2640.png', '1f64e_200d_2640.png', '1f64b_200d_2640.png', '1f646_200d_2640.png', '1f645_200d_2640.png', '1f481_200d_2640.png', '1f647_200d_2640.png', '1f46f_200d_2640.png', '1f3c3_200d_2640.png', '1f6b6_200d_2640.png', '1f482_200d_2640.png', '1f477_200d_2640.png', '1f46e_200d_2640.png', '1f473_200d_2640.png', '1f471_200d_2640.png'];

	const filename = url.split('/')[url.split('/').length - 1];
	if (!url.includes('#replaced') && filename !== 'f0000.png') {
		if (config.get('emojiStyle') === 'z' && exclude.includes(filename)) { // Oldest version does not have a lot of emoji. Check exclude list, if exists does not redirect
			callback({});
			return;
		}

		const type = config.get('emojiStyle');
		const newURL = url.replace(/(emoji\.php\/v9\/)(.)(.+\/)/, `$1${type}$3`) + '#replaced';

		callback({redirectURL: newURL});
	} else {
		callback({});
	}
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
	const muteMenuItem = Menu.getApplicationMenu().getMenuItemById('mute-notifications');

	config.set('notificationsMuted', status);
	muteMenuItem.checked = status;

	if (is.macos) {
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
		icon: is.linux && path.join(__dirname, 'static/Icon.png'),
		minWidth: 400,
		minHeight: 200,
		alwaysOnTop: config.get('alwaysOnTop'),
		titleBarStyle: 'hiddenInset',
		autoHideMenuBar: config.get('autoHideMenuBar'),
		darkTheme: isDarkMode, // GTK+3

		// Workaround for https://github.com/electron/electron/issues/10420
		transparent: true,
		backgroundColor: '#00ffffff',

		webPreferences: {
			preload: path.join(__dirname, 'browser.js'),
			nodeIntegration: false,
			contextIsolation: true,
			plugins: true
		}
	});

	setUserLocale();
	setUpRequestsFiltering();

	darkMode.onChange(() => {
		win.webContents.send('set-dark-mode');
	});

	if (is.macos) {
		win.setSheetOffset(40);
	}

	win.loadURL(mainURL);

	win.on('close', e => {
		if (config.get('quitOnWindowClose')) {
			app.quit();
			return;
		}

		if (!isQuitting) {
			e.preventDefault();

			// Workaround for electron/electron#10023
			win.blur();
			win.hide();
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

(async () => {
	await app.whenReady();

	const trackingUrlPrefix = `https://l.${domain}/l.php`;
	electron.Menu.setApplicationMenu(appMenu);
	mainWindow = createMainWindow();
	tray.create(mainWindow);

	if (is.macos) {
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
	}
	// Update badge on conversations change
	ipcMain.on('conversations', (event, conversations) => updateBadge(conversations));

	enableHiresResources();

	const {webContents} = mainWindow;

	webContents.on('dom-ready', () => {
		webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'browser.css'), 'utf8'));
		webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'dark-mode.css'), 'utf8'));
		webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'vibrancy.css'), 'utf8'));

		if (config.get('useWorkChat')) {
			webContents.insertCSS(fs.readFileSync(path.join(__dirname, 'workchat.css'), 'utf8'));
		}

		if (fs.existsSync(path.join(app.getPath('userData'), 'custom.css'))) {
			webContents.insertCSS(fs.readFileSync(path.join(app.getPath('userData'), 'custom.css'), 'utf8'));
		}

		if (config.get('launchMinimized') || app.getLoginItemSettings().wasOpenedAsHidden) {
			mainWindow.hide();
		} else {
			mainWindow.show();
		}

		webContents.send('toggle-mute-notifications', config.get('notificationsMuted'));
		webContents.send('toggle-message-buttons', config.get('showMessageButtons'));

		webContents.executeJavaScript(fs.readFileSync(path.join(__dirname, 'notifications-isolated.js'), 'utf8'));
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
})();

if (is.macos) {
	ipcMain.on('set-vibrancy', () => {
		mainWindow.setVibrancy('sidebar');

		if (config.get('followSystemAppearance')) {
			systemPreferences.setAppLevelAppearance(systemPreferences.isDarkMode() ? 'dark' : 'light');
		} else {
			systemPreferences.setAppLevelAppearance(config.get('darkMode') ? 'dark' : 'light');
		}
	});
}

ipcMain.on('mute-notifications-toggled', (event, status) => {
	setNotificationsMute(status);
});

app.on('activate', () => {
	if (mainWindow !== undefined) {
		mainWindow.show();
	}
});

app.on('before-quit', () => {
	isQuitting = true;

	if (mainWindow !== undefined) {
		config.set('lastWindowState', mainWindow.getNormalBounds());
	}
});

ipcMain.on('notification', (event, {id, title, body, icon, silent}) => {
	const notification = new Notification({
		title,
		body,
		icon: nativeImage.createFromDataURL(icon),
		silent
	});

	notification.on('click', () => {
		mainWindow.show();
		sendAction('notification-callback', {callbackName: 'onclick', id});
	});

	notification.on('close', () => {
		sendAction('notification-callback', {callbackName: 'onclose', id});
	});

	notification.show();
});
