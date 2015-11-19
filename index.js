'use strict';
const path = require('path');
const fs = require('fs');
const electron = require('electron');
const app = electron.app;
const appMenu = require('./menu');
const storage = require('./storage');

require('electron-debug')();
require('electron-dl')();

electron.crashReporter.start();

let mainWindow;

function updateBadge(title) {
	if (!app.dock) {
		return;
	}

	// ignore `Sindre messaged you` blinking
	if (title.indexOf('Messenger') === -1) {
		return;
	}

	const messageCount = (/\(([0-9]+)\)/).exec(title);
	app.dock.setBadge(messageCount ? messageCount[1] : '');
}

function createMainWindow() {
	let lastWindowState = storage.get('lastWindowState');
	if (!lastWindowState) {
		lastWindowState = {
			width: 800,
			height: 600
		};
	}
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

	win.loadURL('https://www.messenger.com/login/');
	win.on('close', () => {
		if (!win.isFullScreen()) {
			const bounds = win.getBounds();
			storage.set('lastWindowState', {
				x: bounds.x,
				y: bounds.y,
				width: bounds.width,
				height: bounds.height
			});
		}
	});
	win.on('closed', app.quit);
	win.on('page-title-updated', (e, title) => updateBadge(title));

	return win;
}

app.on('ready', () => {
	electron.Menu.setApplicationMenu(appMenu);

	mainWindow = createMainWindow();

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
