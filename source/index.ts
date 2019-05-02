import * as path from 'path';
import {readFileSync, existsSync} from 'fs';
import {
	app,
	ipcMain,
	nativeImage,
	systemPreferences,
	screen as electronScreen,
	session,
	shell,
	BrowserWindow,
	Menu,
	Notification,
	MenuItemConstructorOptions,
	Event as ElectronEvent,
	RequestHeaders,
	OnSendHeadersDetails
} from 'electron';
import log from 'electron-log';
import {autoUpdater} from 'electron-updater';
import electronDl from 'electron-dl';
import electronContextMenu from 'electron-context-menu';
import isDev from 'electron-is-dev';
import electronDebug from 'electron-debug';
import {darkMode, is} from 'electron-util';
import {bestFacebookLocaleFor} from 'facebook-locales';
import updateAppMenu from './menu';
import config from './config';
import tray from './tray';
import {sendAction} from './util';
import {process as processEmojiUrl} from './emoji';
import './touch-bar'; // eslint-disable-line import/no-unassigned-import

electronDebug({
	enabled: true, // TODO: This is only enabled to allow `Command+R` because messenger sometimes gets stuck after computer waking up
	showDevTools: false
});

electronDl();
electronContextMenu();

const domain = config.get('useWorkChat') ? 'facebook.com' : 'messenger.com';

app.setAppUserModelId('com.sindresorhus.caprine');

// Disables broken color space correction in Chromium.
// You can see differing background color on the login screen.
// https://github.com/electron/electron/issues/9671
app.commandLine.appendSwitch('disable-color-correct-rendering');

if (!config.get('hardwareAcceleration')) {
	app.disableHardwareAcceleration();
}

if (!isDev) {
	log.transports.file.level = 'info';
	autoUpdater.logger = log;

	const FOUR_HOURS = 1000 * 60 * 60 * 4;
	setInterval(() => autoUpdater.checkForUpdates(), FOUR_HOURS);
	autoUpdater.checkForUpdates();
}

let mainWindow: BrowserWindow;
let isQuitting = false;
let prevMessageCount = 0;
let dockMenu: Menu;

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

function updateBadge(conversations: Conversation[]): void {
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
			tray.setBadge(messageCount > 0);
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

ipcMain.on('update-overlay-icon', (_event: ElectronEvent, data: string, text: string) => {
	const img = nativeImage.createFromDataURL(data);
	mainWindow.setOverlayIcon(img, text);
});

interface BeforeSendHeadersResponse {
	cancel?: boolean;
	requestHeaders?: RequestHeaders;
}

function enableHiresResources(): void {
	const scaleFactor = Math.max(...electronScreen.getAllDisplays().map(x => x.scaleFactor));

	if (scaleFactor === 1) {
		return;
	}

	const filter = {urls: [`*://*.${domain}/`]};

	session.defaultSession!.webRequest.onBeforeSendHeaders(
		filter,
		(details: OnSendHeadersDetails, callback: (response: BeforeSendHeadersResponse) => void) => {
			let cookie = (details.requestHeaders as any).Cookie;

			if (cookie && details.method === 'GET') {
				if (/(; )?dpr=\d/.test(cookie)) {
					cookie = cookie.replace(/dpr=\d/, `dpr=${scaleFactor}`);
				} else {
					cookie = `${cookie}; dpr=${scaleFactor}`;
				}

				(details.requestHeaders as any).Cookie = cookie;
			}

			callback({
				cancel: false,
				requestHeaders: details.requestHeaders
			});
		}
	);
}

function initRequestsFiltering(): void {
	const filter = {
		urls: [
			`*://*.${domain}/*typ.php*`, // Type indicator blocker
			`*://*.${domain}/*change_read_status.php*`, // Seen indicator blocker
			'*://*.fbcdn.net/images/emoji.php/v9/*', // Emoji
			'*://*.facebook.com/images/emoji.php/v9/*' // Emoji
		]
	};

	session.defaultSession!.webRequest.onBeforeRequest(filter, ({url}, callback) => {
		if (url.includes('emoji.php')) {
			callback(processEmojiUrl(url));
		} else if (url.includes('typ.php')) {
			callback({cancel: config.get('block.typingIndicator')});
		} else if (url.includes('change_read_status.php')) {
			callback({cancel: config.get('block.chatSeen')});
		}
	});
}

function setUserLocale(): void {
	const userLocale = bestFacebookLocaleFor(app.getLocale().replace('-', '_'));
	const cookie = {
		url: 'https://www.messenger.com/',
		name: 'locale',
		value: userLocale
	};
	session.defaultSession!.cookies.set(cookie, () => {});
}

function setNotificationsMute(status: boolean): void {
	const label = 'Mute Notifications';
	const muteMenuItem = Menu.getApplicationMenu()!.getMenuItemById('mute-notifications');

	config.set('notificationsMuted', status);
	muteMenuItem.checked = status;

	if (is.macos) {
		const item = dockMenu.items.find(x => x.label === label);
		item!.checked = status;
	}
}

function createMainWindow(): BrowserWindow {
	const lastWindowState = config.get('lastWindowState');
	const isDarkMode = config.get('darkMode');

	// Messenger or Work Chat
	const mainURL = config.get('useWorkChat')
		? 'https://work.facebook.com/chat'
		: 'https://www.messenger.com/login/';

	const win = new BrowserWindow({
		title: app.getName(),
		show: false,
		x: lastWindowState.x,
		y: lastWindowState.y,
		width: lastWindowState.width,
		height: lastWindowState.height,
		icon: is.linux ? path.join(__dirname, '..', 'static', 'Icon.png') : undefined,
		minWidth: 400,
		minHeight: 200,
		alwaysOnTop: config.get('alwaysOnTop'),
		titleBarStyle: 'hiddenInset',
		autoHideMenuBar: config.get('autoHideMenuBar'),
		darkTheme: isDarkMode, // GTK+3
		webPreferences: {
			preload: path.join(__dirname, 'browser.js'),
			nodeIntegration: false,
			contextIsolation: true,
			plugins: true
		}
	});

	setUserLocale();
	initRequestsFiltering();

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

	updateAppMenu();
	mainWindow = createMainWindow();
	tray.create(mainWindow);

	if (is.macos) {
		const firstItem: MenuItemConstructorOptions = {
			label: 'Mute Notifications',
			type: 'checkbox',
			checked: config.get('notificationsMuted'),
			click() {
				mainWindow.webContents.send('toggle-mute-notifications');
			}
		};

		dockMenu = Menu.buildFromTemplate([firstItem]);
		app.dock.setMenu(dockMenu);

		ipcMain.on('conversations', (_event: ElectronEvent, conversations: Conversation[]) => {
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
			app.dock.setMenu(Menu.buildFromTemplate([firstItem, {type: 'separator'}, ...items]));
		});
	}

	// Update badge on conversations change
	ipcMain.on('conversations', (_event: ElectronEvent, conversations: Conversation[]) => {
		updateBadge(conversations);
	});

	enableHiresResources();

	const {webContents} = mainWindow;

	webContents.on('dom-ready', () => {
		webContents.insertCSS(readFileSync(path.join(__dirname, '..', 'css', 'browser.css'), 'utf8'));
		webContents.insertCSS(readFileSync(path.join(__dirname, '..', 'css', 'dark-mode.css'), 'utf8'));
		webContents.insertCSS(readFileSync(path.join(__dirname, '..', 'css', 'vibrancy.css'), 'utf8'));
		webContents.insertCSS(
			readFileSync(path.join(__dirname, '..', 'css', 'code-blocks.css'), 'utf8')
		);

		if (config.get('useWorkChat')) {
			webContents.insertCSS(
				readFileSync(path.join(__dirname, '..', 'css', 'workchat.css'), 'utf8')
			);
		}

		if (existsSync(path.join(app.getPath('userData'), 'custom.css'))) {
			webContents.insertCSS(readFileSync(path.join(app.getPath('userData'), 'custom.css'), 'utf8'));
		}

		if (config.get('launchMinimized') || app.getLoginItemSettings().wasOpenedAsHidden) {
			mainWindow.hide();
		} else {
			mainWindow.show();
		}

		webContents.send('toggle-mute-notifications', config.get('notificationsMuted'));
		webContents.send('toggle-message-buttons', config.get('showMessageButtons'));

		webContents.executeJavaScript(
			readFileSync(path.join(__dirname, 'notifications-isolated.js'), 'utf8')
		);
	});

	webContents.on('new-window', (event: Event, url, frameName, _disposition, options) => {
		event.preventDefault();

		if (url === 'about:blank') {
			if (frameName !== 'about:blank') {
				// Voice/video call popup
				options.show = true;
				options.titleBarStyle = 'default';
				options.webPreferences.nodeIntegration = false;
				options.webPreferences.preload = path.join(__dirname, 'browser-call.js');
				(event as any).newGuest = new BrowserWindow(options);
			}
		} else {
			if (url.startsWith(trackingUrlPrefix)) {
				url = new URL(url).searchParams.get('u')!;
			}

			shell.openExternal(url);
		}
	});

	webContents.on('will-navigate', (event, url) => {
		const isMessengerDotCom = (url: string): boolean => {
			const {hostname} = new URL(url);
			return hostname === 'www.messenger.com';
		};

		const isTwoFactorAuth = (url: string): boolean => {
			const twoFactorAuthURL = 'https://www.facebook.com/checkpoint/start';
			return url.startsWith(twoFactorAuthURL);
		};

		const isWorkChat = (url: string): boolean => {
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

		if (isMessengerDotCom(url) || isTwoFactorAuth(url) || isWorkChat(url)) {
			return;
		}

		event.preventDefault();
		shell.openExternal(url);
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

ipcMain.on('mute-notifications-toggled', (_event: ElectronEvent, status: boolean) => {
	setNotificationsMute(status);
});

app.on('activate', () => {
	mainWindow.show();
});

app.on('before-quit', () => {
	isQuitting = true;
	config.set('lastWindowState', mainWindow.getNormalBounds());
});

ipcMain.on(
	'notification',
	(_event: ElectronEvent, {id, title, body, icon, silent}: NotificationEvent) => {
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
	}
);
