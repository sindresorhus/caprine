'use strict';
const path = require('path');
const fs = require('fs');
const electron = require('electron');
const app = electron.app;
const appMenu = require('./menu');
const storage = require('./storage');
const tray = require('./tray');

require('electron-debug')();
require('electron-dl')();

let mainWindow;
let isQuitting = false;

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

	const messageCount = (/\(([0-9]+)\)/).exec(title);

	if (process.platform === 'darwin') {
		app.dock.setBadge(messageCount ? messageCount[1] : '');
	} else {
		tray.setBadge(messageCount);
	}
}

function createMainWindow() {
	const lastWindowState = storage.get('lastWindowState') || {width: 800, height: 600};

	const win = new electron.BrowserWindow({
		title: app.getName(),
		show: false,
		x: lastWindowState.x,
		y: lastWindowState.y,
		width: lastWindowState.width,
		height: lastWindowState.height,
		icon: process.platform === 'linux' && path.join(__dirname, 'media', 'Icon.png'),
		minWidth: 400,
		minHeight: 200,
		titleBarStyle: 'hidden-inset',
		webPreferences: {
			// fails without this because of CommonJS script detection
			nodeIntegration: false,
			preload: path.join(__dirname, 'browser.js'),
			// required for Facebook active ping thingy
			webSecurity: false,
			plugins: true
		}
	});

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

	win.on('page-title-updated', (e, title) => updateBadge(title));

	return win;
}

app.on('ready', () => {
	electron.Menu.setApplicationMenu(appMenu);
	mainWindow = createMainWindow();
	tray.create(mainWindow);

	const page = mainWindow.webContents;

	page.on('dom-ready', () => {
		page.insertCSS(fs.readFileSync(path.join(__dirname, 'browser.css'), 'utf8'));
		mainWindow.show();
	});

	page.on('new-window', (e, url) => {
		e.preventDefault();
		electron.shell.openExternal(url);
	});
});

app.on('activate', () => {
	mainWindow.show();
});

app.on('before-quit', () => {
	isQuitting = true;

	if (!mainWindow.isFullScreen()) {
		storage.set('lastWindowState', mainWindow.getBounds());
	}
});
