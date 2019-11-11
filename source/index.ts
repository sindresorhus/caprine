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
	Event as ElectronEvent
} from 'electron';
import log from 'electron-log';
import {autoUpdater} from 'electron-updater';
import electronDl from 'electron-dl';
import electronContextMenu = require('electron-context-menu');
import electronLocalshortcut = require('electron-localshortcut');
import electronDebug = require('electron-debug');
import {is, darkMode} from 'electron-util';
import {bestFacebookLocaleFor} from 'facebook-locales';
import doNotDisturb = require('@sindresorhus/do-not-disturb');
import updateAppMenu from './menu';
import config from './config';
import tray from './tray';
import {sendAction, sendBackgroundAction} from './util';
import {process as processEmojiUrl} from './emoji';
import ensureOnline from './ensure-online';
import './touch-bar'; // eslint-disable-line import/no-unassigned-import
import {setUpMenuBarMode} from './menu-bar-mode';
import {caprineIconPath} from './constants';

ipcMain.setMaxListeners(100);

electronDebug({
	isEnabled: true, // TODO: This is only enabled to allow `Command+R` because messenger.com sometimes gets stuck after computer waking up
	showDevTools: false
});

electronDl();
electronContextMenu();

const domain = config.get('useWorkChat') ? 'facebook.com' : 'messenger.com';

app.setAppUserModelId('com.sindresorhus.caprine');

if (!config.get('hardwareAcceleration')) {
	app.disableHardwareAcceleration();
}

if (!is.development && !is.linux) {
	(async () => {
		log.transports.file.level = 'info';
		autoUpdater.logger = log;

		const FOUR_HOURS = 1000 * 60 * 60 * 4;
		setInterval(async () => {
			await autoUpdater.checkForUpdates();
		}, FOUR_HOURS);

		await autoUpdater.checkForUpdates();
	})();
}

let mainWindow: BrowserWindow;
let isQuitting = false;
let previousMessageCount = 0;
let dockMenu: Menu;
let isDNDEnabled = false;

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

function getMessageCount(conversations: Conversation[]): number {
	return conversations.filter(({unread}) => unread).length;
}

function updateBadge(conversations: Conversation[]): void {
	// Ignore `Sindre messaged you` blinking
	if (!Array.isArray(conversations)) {
		return;
	}

	const messageCount = getMessageCount(conversations);

	if (is.macos || is.linux) {
		if (config.get('showUnreadBadge') && !isDNDEnabled) {
			app.setBadgeCount(messageCount);
		}

		if (
			is.macos &&
			!isDNDEnabled &&
			config.get('bounceDockOnMessage') &&
			previousMessageCount !== messageCount
		) {
			app.dock.bounce('informational');
			previousMessageCount = messageCount;
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

	tray.update(messageCount);

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

function updateTrayIcon(): void {
	if (!config.get('showTrayIcon') || config.get('quitOnWindowClose')) {
		tray.destroy();
	} else {
		tray.create(mainWindow);
	}
}

ipcMain.on('update-tray-icon', updateTrayIcon);

interface BeforeSendHeadersResponse {
	cancel?: boolean;
	requestHeaders?: Record<string, string>;
}

interface OnSendHeadersDetails {
	id: number;
	url: string;
	method: string;
	webContentsId?: number;
	resourceType: string;
	referrer: string;
	timestamp: number;
	requestHeaders: Record<string, string>;
}

function enableHiresResources(): void {
	const scaleFactor = Math.max(
		...electronScreen.getAllDisplays().map(display => display.scaleFactor)
	);

	if (scaleFactor === 1) {
		return;
	}

	const filter = {urls: [`*://*.${domain}/`]};

	session.defaultSession.webRequest.onBeforeSendHeaders(
		filter,
		(details: OnSendHeadersDetails, callback: (response: BeforeSendHeadersResponse) => void) => {
			let cookie = details.requestHeaders.Cookie;

			if (cookie && details.method === 'GET') {
				if (/(?:; )?dpr=\d/.test(cookie)) {
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
			`*://*.${domain}/*delivery_receipts*`, // Delivery receipts indicator blocker
			`*://*.${domain}/*unread_threads*`, // Delivery receipts indicator blocker
			'*://*.fbcdn.net/images/emoji.php/v9/*', // Emoji
			'*://*.facebook.com/images/emoji.php/v9/*' // Emoji
		]
	};

	session.defaultSession.webRequest.onBeforeRequest(filter, async ({url}, callback) => {
		if (url.includes('emoji.php')) {
			callback(await processEmojiUrl(url));
		} else if (url.includes('typ.php')) {
			callback({cancel: config.get('block.typingIndicator' as any)});
		} else if (url.includes('change_read_status.php')) {
			callback({cancel: config.get('block.chatSeen' as any)});
		} else if (url.includes('delivery_receipts') || url.includes('unread_threads')) {
			callback({cancel: config.get('block.deliveryReceipt' as any)});
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

	session.defaultSession.cookies.set(cookie);
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
	const mainURL = config.get('useWorkChat') ?
		'https://work.facebook.com/chat' :
		'https://www.messenger.com/login/';

	const win = new BrowserWindow({
		title: app.getName(),
		show: false,
		x: lastWindowState.x,
		y: lastWindowState.y,
		width: lastWindowState.width,
		height: lastWindowState.height,
		icon: is.linux ? caprineIconPath : undefined,
		minWidth: 400,
		minHeight: 200,
		alwaysOnTop: config.get('alwaysOnTop'),
		titleBarStyle: 'hiddenInset',
		autoHideMenuBar: config.get('autoHideMenuBar'),
		darkTheme: isDarkMode, // GTK+3
		webPreferences: {
			preload: path.join(__dirname, 'browser.js'),
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

	win.on('close', event => {
		if (config.get('quitOnWindowClose')) {
			app.quit();
			return;
		}

		// Workaround for https://github.com/electron/electron/issues/20263
		// Closing the app window when on full screen leaves a black screen
		// Exit fullscreen before closing
		if (is.macos && mainWindow.isFullScreen()) {
			mainWindow.once('leave-full-screen', () => {
				mainWindow.hide();
			});
			mainWindow.setFullScreen(false);
		}

		if (!isQuitting) {
			event.preventDefault();

			// Workaround for https://github.com/electron/electron/issues/10023
			win.blur();
			if (is.macos) {
				// On macOS we're using `app.hide()` in order to focus the previous window correctly
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

	win.on('resize', () => {
		config.set('lastWindowState', win.getNormalBounds());
	});

	return win;
}

(async () => {
	await Promise.all([ensureOnline(), app.whenReady()]);

	const trackingUrlPrefix = `https://l.${domain}/l.php`;

	await updateAppMenu();
	mainWindow = createMainWindow();

	// Workaround for https://github.com/electron/electron/issues/5256
	electronLocalshortcut.register(mainWindow, 'CommandOrControl+=', () => {
		sendAction('zoom-in');
	});

	// Start in menu bar mode if enabled, otherwise start normally
	setUpMenuBarMode(mainWindow);

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

		// Dock icon is hidden initially on macOS
		if (config.get('showDockIcon')) {
			app.dock.show();
		}

		ipcMain.once('conversations', () => {
			// Messenger sorts the conversations by unread state.
			// We select the first conversation from the list.
			sendAction('jump-to-conversation', 1);
		});

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

	webContents.on('dom-ready', async () => {
		await updateAppMenu();

		webContents.insertCSS(readFileSync(path.join(__dirname, '..', 'css', 'browser.css'), 'utf8'));
		webContents.insertCSS(readFileSync(path.join(__dirname, '..', 'css', 'dark-mode.css'), 'utf8'));
		webContents.insertCSS(readFileSync(path.join(__dirname, '..', 'css', 'vibrancy.css'), 'utf8'));
		webContents.insertCSS(
			readFileSync(path.join(__dirname, '..', 'css', 'code-blocks.css'), 'utf8')
		);
		webContents.insertCSS(readFileSync(path.join(__dirname, '..', 'css', 'autoplay.css'), 'utf8'));

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

		if (is.macos) {
			ipcMain.on('update-dnd-mode', async (_event: ElectronEvent, initialSoundsValue) => {
				doNotDisturb.on('change', (doNotDisturb: boolean) => {
					isDNDEnabled = doNotDisturb;
					webContents.send('toggle-sounds', isDNDEnabled ? false : initialSoundsValue);
				});

				isDNDEnabled = await doNotDisturb.isEnabled();

				webContents.send('toggle-sounds', isDNDEnabled ? false : initialSoundsValue);
			});
		}

		webContents.send('toggle-mute-notifications', config.get('notificationsMuted'));
		webContents.send('toggle-message-buttons', config.get('showMessageButtons'));

		await webContents.executeJavaScript(
			readFileSync(path.join(__dirname, 'notifications-isolated.js'), 'utf8')
		);
	});

	webContents.on('new-window', async (event: Event, url, frameName, _disposition, options) => {
		event.preventDefault();

		if (url === 'about:blank') {
			if (frameName !== 'about:blank') {
				// Voice/video call popup
				options.show = true;
				options.titleBarStyle = 'default';
				options.webPreferences = options.webPreferences || {};
				options.webPreferences.nodeIntegration = false;
				options.webPreferences.preload = path.join(__dirname, 'browser-call.js');
				(event as any).newGuest = new BrowserWindow(options);
			}
		} else {
			if (url.startsWith(trackingUrlPrefix)) {
				url = new URL(url).searchParams.get('u')!;
			}

			await shell.openExternal(url);
		}
	});

	webContents.on('will-navigate', async (event, url) => {
		const isMessengerDotCom = (url: string): boolean => {
			const {hostname} = new URL(url);
			return hostname.endsWith('.messenger.com');
		};

		const isTwoFactorAuth = (url: string): boolean => {
			const twoFactorAuthURL = 'https://www.facebook.com/checkpoint/start';
			return url.startsWith(twoFactorAuthURL);
		};

		const isWorkChat = (url: string): boolean => {
			const {hostname, pathname} = new URL(url);

			if (hostname === 'work.facebook.com' || hostname === 'work.workplace.com') {
				return true;
			}

			if (
				// Example: https://company-name.facebook.com/login or
				//   		https://company-name.workplace.com/login
				(hostname.endsWith('.facebook.com') || hostname.endsWith('.workplace.com')) &&
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
		await shell.openExternal(url);
	});
})();

if (is.macos) {
	ipcMain.on('set-vibrancy', () => {
		mainWindow.setBackgroundColor('#00000000'); // Transparent, workaround for vibrancy issue.
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
	if (mainWindow) {
		mainWindow.show();
	}
});

app.on('before-quit', () => {
	isQuitting = true;

	// Checking whether the window exists to work around an Electron race issue:
	// https://github.com/sindresorhus/caprine/issues/809
	if (mainWindow) {
		config.set('lastWindowState', mainWindow.getNormalBounds());
	}
});

const notifications = new Map();

ipcMain.on(
	'notification',
	(_event: ElectronEvent, {id, title, body, icon, silent}: NotificationEvent) => {
		const notification = new Notification({
			title,
			body: config.get('notificationMessagePreview') ? body : 'You have a new message',
			hasReply: true,
			icon: nativeImage.createFromDataURL(icon),
			silent
		});

		notifications.set(id, notification);

		notification.on('click', () => {
			sendAction('notification-callback', {callbackName: 'onclick', id});

			notifications.delete(id);
		});

		notification.on('reply', (_event, reply: string) => {
			// We use onclick event used by messenger to go to the right convo
			sendBackgroundAction('notification-reply-callback', {callbackName: 'onclick', id, reply});

			notifications.delete(id);
		});

		notification.on('close', () => {
			sendBackgroundAction('notification-callback', {callbackName: 'onclose', id});
			notifications.delete(id);
		});

		notification.show();
	}
);
