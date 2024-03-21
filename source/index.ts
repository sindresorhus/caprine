import path from 'node:path';
import {readFileSync, existsSync} from 'node:fs';
import {
	app,
	nativeImage,
	screen as electronScreen,
	session,
	shell,
	BrowserWindow,
	Menu,
	Notification,
	MenuItemConstructorOptions,
	systemPreferences,
	nativeTheme,
} from 'electron';
import {ipcMain as ipc} from 'electron-better-ipc';
import {autoUpdater} from 'electron-updater';
import electronDl from 'electron-dl';
import electronContextMenu from 'electron-context-menu';
import electronLocalshortcut from 'electron-localshortcut';
import electronDebug from 'electron-debug';
import {is, darkMode} from 'electron-util';
import {bestFacebookLocaleFor} from 'facebook-locales';
import doNotDisturb from '@sindresorhus/do-not-disturb';
import updateAppMenu from './menu';
import config, {StoreType} from './config';
import tray from './tray';
import {
	sendAction,
	sendBackgroundAction,
	messengerDomain,
	stripTrackingFromUrl,
} from './util';
import {process as processEmojiUrl} from './emoji';
import ensureOnline from './ensure-online';
import {setUpMenuBarMode} from './menu-bar-mode';
import {caprineIconPath} from './constants';

ipc.setMaxListeners(100);

electronDebug({
	isEnabled: true, // TODO: This is only enabled to allow `Command+R` because messenger.com sometimes gets stuck after computer waking up
	showDevTools: false,
});

electronDl();
electronContextMenu({
	showCopyImageAddress: true,
	prepend(defaultActions) {
		/*
		TODO: Use menu option or use replacement of options (https://github.com/sindresorhus/electron-context-menu/issues/70)
		See explanation for this hacky solution here: https://github.com/sindresorhus/caprine/pull/1169
		*/
		defaultActions.copyLink({
			transform: stripTrackingFromUrl,
		});

		return [];
	},
});

app.setAppUserModelId('com.sindresorhus.caprine');

if (!config.get('hardwareAcceleration')) {
	app.disableHardwareAcceleration();
}

if (!is.development && config.get('autoUpdate')) {
	(async () => {
		const FOUR_HOURS = 1000 * 60 * 60 * 4;
		setInterval(async () => {
			await autoUpdater.checkForUpdatesAndNotify();
		}, FOUR_HOURS);

		await autoUpdater.checkForUpdatesAndNotify();
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

// Preserves the window position when a display is removed and Caprine is moved to a different screen.
app.on('ready', () => {
	electronScreen.on('display-removed', () => {
		const [x, y] = mainWindow.getPosition();
		mainWindow.setPosition(x, y);
	});
});

async function updateBadge(messageCount: number): Promise<void> {
	if (!is.windows) {
		if (config.get('showUnreadBadge') && !isDNDEnabled) {
			app.badgeCount = messageCount;
		}

		if (
			is.macos
			&& !isDNDEnabled
			&& config.get('bounceDockOnMessage')
			&& previousMessageCount !== messageCount
		) {
			app.dock.bounce('informational');
			previousMessageCount = messageCount;
		}
	}

	if (!is.macos) {
		if (config.get('showUnreadBadge')) {
			tray.setBadge(messageCount > 0);
		}

		if (config.get('flashWindowOnMessage')) {
			mainWindow.flashFrame(messageCount !== 0);
		}
	}

	tray.update(messageCount);

	if (is.windows) {
		if (!config.get('showUnreadBadge') || messageCount === 0) {
			mainWindow.setOverlayIcon(null, '');
		} else {
			// Delegate drawing of overlay icon to renderer process
			updateOverlayIcon(await ipc.callRenderer(mainWindow, 'render-overlay-icon', messageCount));
		}
	}
}

function updateOverlayIcon({data, text}: {data: string; text: string}): void {
	const img = nativeImage.createFromDataURL(data);
	mainWindow.setOverlayIcon(img, text);
}

type BeforeSendHeadersResponse = {
	cancel?: boolean;
	requestHeaders?: Record<string, string>;
};

type OnSendHeadersDetails = {
	id: number;
	url: string;
	method: string;
	webContentsId?: number;
	resourceType: string;
	referrer: string;
	timestamp: number;
	requestHeaders: Record<string, string>;
};

function enableHiresResources(): void {
	const scaleFactor = Math.max(
		...electronScreen.getAllDisplays().map(display => display.scaleFactor),
	);

	if (scaleFactor === 1) {
		return;
	}

	const filter = {urls: [`*://*.${messengerDomain}/`]};

	session.defaultSession.webRequest.onBeforeSendHeaders(
		filter,
		(details: OnSendHeadersDetails, callback: (response: BeforeSendHeadersResponse) => void) => {
			let cookie = details.requestHeaders.Cookie;

			if (cookie && details.method === 'GET') {
				cookie = /(?:; )?dpr=\d/.test(cookie) ? cookie.replace(/dpr=\d/, `dpr=${scaleFactor}`) : `${cookie}; dpr=${scaleFactor}`;

				(details.requestHeaders as any).Cookie = cookie;
			}

			callback({
				cancel: false,
				requestHeaders: details.requestHeaders,
			});
		},
	);
}

function initRequestsFiltering(): void {
	const filter = {
		urls: [
			`*://*.${messengerDomain}/*typ.php*`, // Type indicator blocker
			`*://*.${messengerDomain}/*change_read_status.php*`, // Seen indicator blocker
			`*://*.${messengerDomain}/*delivery_receipts*`, // Delivery receipts indicator blocker
			`*://*.${messengerDomain}/*unread_threads*`, // Delivery receipts indicator blocker
			'*://*.fbcdn.net/images/emoji.php/v9/*', // Emoji
			'*://*.facebook.com/images/emoji.php/v9/*', // Emoji
		],
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

	session.defaultSession.webRequest.onHeadersReceived({
		urls: ['*://static.xx.fbcdn.net/rsrc.php/*'],
	}, ({responseHeaders}, callback) => {
		if (!config.get('callRingtoneMuted') || !responseHeaders) {
			callback({});
			return;
		}

		const callRingtoneHash = '2NAu/QVqg211BbktgY5GkA==';
		callback({
			cancel: responseHeaders['content-md5'][0] === callRingtoneHash,
		});
	});
}

function setUserLocale(): void {
	const userLocale = bestFacebookLocaleFor(app.getLocale().replace('-', '_'));
	const cookie = {
		url: 'https://www.messenger.com/',
		name: 'locale',
		secure: true,
		value: userLocale,
	};

	session.defaultSession.cookies.set(cookie);
}

function setNotificationsMute(status: boolean): void {
	const label = 'Mute Notifications';
	const muteMenuItem = Menu.getApplicationMenu()!.getMenuItemById('mute-notifications')!;

	config.set('notificationsMuted', status);
	muteMenuItem.checked = status;

	if (is.macos) {
		const item = dockMenu.items.find(x => x.label === label);
		item!.checked = status;
	}
}

function createMainWindow(): BrowserWindow {
	const lastWindowState = config.get('lastWindowState');

	// Messenger or Work Chat
	const mainURL = config.get('useWorkChat')
		? 'https://work.facebook.com/chat'
		: 'https://www.messenger.com/login/';

	const win = new BrowserWindow({
		title: app.name,
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
		trafficLightPosition: {
			x: 80,
			y: 20,
		},
		autoHideMenuBar: config.get('autoHideMenuBar'),
		webPreferences: {
			preload: path.join(__dirname, 'browser.js'),
			contextIsolation: true,
			nodeIntegration: true,
			spellcheck: config.get('isSpellCheckerEnabled'),
			plugins: true,
		},
	});

	require('@electron/remote/main').initialize();
	require('@electron/remote/main').enable(win.webContents);

	setUserLocale();
	initRequestsFiltering();

	let previousDarkMode = darkMode.isEnabled;
	darkMode.onChange(() => {
		if (darkMode.isEnabled !== previousDarkMode) {
			previousDarkMode = darkMode.isEnabled;
			win.webContents.send('set-theme');
		}
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
		const {isMaximized} = config.get('lastWindowState');
		config.set('lastWindowState', {...win.getNormalBounds(), isMaximized});
	});

	win.on('maximize', () => {
		config.set('lastWindowState.isMaximized', true);
	});

	win.on('unmaximize', () => {
		config.set('lastWindowState.isMaximized', false);
	});

	return win;
}

(async () => {
	await Promise.all([ensureOnline(), app.whenReady()]);
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
			async click() {
				setNotificationsMute(await ipc.callRenderer(mainWindow, 'toggle-mute-notifications'));
			},
		};

		dockMenu = Menu.buildFromTemplate([firstItem]);
		app.dock.setMenu(dockMenu);

		// Dock icon is hidden initially on macOS
		if (config.get('showDockIcon')) {
			app.dock.show();
		}

		ipc.once('conversations', () => {
			// Messenger sorts the conversations by unread state.
			// We select the first conversation from the list.
			sendAction('jump-to-conversation', 1);
		});

		ipc.answerRenderer('conversations', (conversations: Conversation[]) => {
			if (conversations.length === 0) {
				return;
			}

			const items = conversations.map(({label, icon}, index) => ({
				label: `${label}`,
				icon: nativeImage.createFromDataURL(icon),
				click() {
					mainWindow.show();
					sendAction('jump-to-conversation', index + 1);
				},
			}));

			app.dock.setMenu(Menu.buildFromTemplate([firstItem, {type: 'separator'}, ...items]));
		});
	}

	// Update badge on conversations change
	ipc.answerRenderer('update-tray-icon', async (messageCount: number) => {
		updateBadge(messageCount);
	});

	enableHiresResources();

	const {webContents} = mainWindow;

	webContents.on('dom-ready', async () => {
		// Set window title to Caprine
		mainWindow.setTitle(app.name);

		await updateAppMenu();

		const files = ['browser.css', 'dark-mode.css', 'vibrancy.css', 'code-blocks.css', 'autoplay.css', 'scrollbar.css'];

		const cssPath = path.join(__dirname, '..', 'css');

		for (const file of files) {
			if (existsSync(path.join(cssPath, file))) {
				webContents.insertCSS(readFileSync(path.join(cssPath, file), 'utf8'));
			}
		}

		if (config.get('useWorkChat') && existsSync(path.join(cssPath, 'workchat.css'))) {
			webContents.insertCSS(
				readFileSync(path.join(cssPath, 'workchat.css'), 'utf8'),
			);
		}

		if (existsSync(path.join(app.getPath('userData'), 'custom.css'))) {
			webContents.insertCSS(readFileSync(path.join(app.getPath('userData'), 'custom.css'), 'utf8'));
		}

		if (config.get('launchMinimized') || app.getLoginItemSettings().wasOpenedAsHidden) {
			mainWindow.hide();
			tray.create(mainWindow);
		} else {
			if (config.get('lastWindowState').isMaximized) {
				mainWindow.maximize();
			}

			mainWindow.show();
		}

		if (is.macos) {
			ipc.answerRenderer('update-dnd-mode', async (initialSoundsValue: boolean) => {
				doNotDisturb.on('change', (doNotDisturb: boolean) => {
					isDNDEnabled = doNotDisturb;
					ipc.callRenderer(mainWindow, 'toggle-sounds', {checked: isDNDEnabled ? false : initialSoundsValue});
				});

				isDNDEnabled = await doNotDisturb.isEnabled();

				return isDNDEnabled ? false : initialSoundsValue;
			});
		}

		setNotificationsMute(await ipc.callRenderer(mainWindow, 'toggle-mute-notifications', {
			defaultStatus: config.get('notificationsMuted'),
		}));

		ipc.callRenderer(mainWindow, 'toggle-message-buttons', config.get('showMessageButtons'));

		await webContents.executeJavaScript(
			readFileSync(path.join(__dirname, 'notifications-isolated.js'), 'utf8'),
		);

		if (is.macos) {
			await import('./touch-bar');
		}
	});

	webContents.setWindowOpenHandler(details => {
		if (details.disposition === 'foreground-tab' || details.disposition === 'background-tab') {
			const url = stripTrackingFromUrl(details.url);
			shell.openExternal(url);
			return {action: 'deny'};
		}

		if (details.disposition === 'new-window') {
			if (details.url === 'about:blank' || details.url === 'about:blank#blocked') {
				if (details.frameName !== 'about:blank') {
					// Voice/video call popup
					return {
						action: 'allow',
						overrideBrowserWindowOptions: {
							show: true,
							titleBarStyle: 'default',
							webPreferences: {
								nodeIntegration: false,
								preload: path.join(__dirname, 'browser-call.js'),
							},
						},
					};
				}
			} else {
				const url = stripTrackingFromUrl(details.url);
				shell.openExternal(url);
			}

			return {action: 'deny'};
		}

		return {action: 'allow'};
	});

	webContents.on('will-navigate', async (event, url) => {
		const isMessengerDotCom = (url: string): boolean => {
			const {hostname} = new URL(url);
			return hostname.endsWith('.messenger.com');
		};

		const isTwoFactorAuth = (url: string): boolean => {
			const twoFactorAuthURL = 'https://www.facebook.com/checkpoint';
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
				(hostname.endsWith('.facebook.com') || hostname.endsWith('.workplace.com'))
				&& (pathname.startsWith('/login') || pathname.startsWith('/chat'))
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
	ipc.answerRenderer('set-vibrancy', () => {
		mainWindow.setBackgroundColor('#80FFFFFF'); // Transparent, workaround for vibrancy issue.
		mainWindow.setVibrancy('sidebar');
	});
}

function toggleMaximized(): void {
	if (mainWindow.isMaximized()) {
		mainWindow.unmaximize();
	} else {
		mainWindow.maximize();
	}
}

ipc.answerRenderer('titlebar-doubleclick', () => {
	if (is.macos) {
		const doubleClickAction = systemPreferences.getUserDefault('AppleActionOnDoubleClick', 'string');

		if (doubleClickAction === 'Minimize') {
			mainWindow.minimize();
		} else if (doubleClickAction === 'Maximize') {
			toggleMaximized();
		}
	} else {
		toggleMaximized();
	}
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
		const {isMaximized} = config.get('lastWindowState');
		config.set('lastWindowState', {...mainWindow.getNormalBounds(), isMaximized});
	}
});

const notifications = new Map();

ipc.answerRenderer(
	'notification',
	({id, title, body, icon, silent}: {id: number; title: string; body: string; icon: string; silent: boolean}) => {
		// Don't send notifications when the window is focused
		if (mainWindow.isFocused()) {
			return;
		}

		const notification = new Notification({
			title,
			body: config.get('notificationMessagePreview') ? body : 'You have a new message',
			hasReply: true,
			icon: nativeImage.createFromDataURL(icon),
			silent,
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
	},
);

type ThemeSource = typeof nativeTheme.themeSource;

ipc.answerRenderer<undefined, StoreType['useWorkChat']>('get-config-useWorkChat', async () => config.get('useWorkChat'));
ipc.answerRenderer<undefined, StoreType['showMessageButtons']>('get-config-showMessageButtons', async () => config.get('showMessageButtons'));
ipc.answerRenderer<undefined, ThemeSource>('get-config-theme', async () => config.get('theme'));
ipc.answerRenderer<undefined, StoreType['privateMode']>('get-config-privateMode', async () => config.get('privateMode'));
ipc.answerRenderer<undefined, StoreType['vibrancy']>('get-config-vibrancy', async () => config.get('vibrancy'));
ipc.answerRenderer<undefined, StoreType['sidebar']>('get-config-sidebar', async () => config.get('sidebar'));
ipc.answerRenderer<undefined, StoreType['zoomFactor']>('get-config-zoomFactor', async () => config.get('zoomFactor'));
ipc.answerRenderer<StoreType['zoomFactor'], void>('set-config-zoomFactor', async zoomFactor => {
	config.set('zoomFactor', zoomFactor);
});
ipc.answerRenderer<undefined, StoreType['keepMeSignedIn']>('get-config-keepMeSignedIn', async () => config.get('keepMeSignedIn'));
ipc.answerRenderer<StoreType['keepMeSignedIn'], void>('set-config-keepMeSignedIn', async keepMeSignedIn => {
	config.set('keepMeSignedIn', keepMeSignedIn);
});
ipc.answerRenderer<undefined, StoreType['autoplayVideos']>('get-config-autoplayVideos', async () => config.get('autoplayVideos'));
ipc.answerRenderer<undefined, StoreType['emojiStyle']>('get-config-emojiStyle', async () => config.get('emojiStyle'));
ipc.answerRenderer<StoreType['emojiStyle'], void>('set-config-emojiStyle', async emojiStyle => {
	config.set('emojiStyle', emojiStyle);
});
