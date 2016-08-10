'use strict';
const path = require('path');
const fs = require('fs');
const electron = require('electron');
const appMenu = require('./menu');
const config = require('./config');
const tray = require('./tray');

const app = electron.app;

require('electron-debug')();
require('electron-dl')();
require('electron-context-menu')();

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

	let messageCount = (/\(([0-9]+)\)/).exec(title);
	messageCount = messageCount ? Number(messageCount[1]) : 0;

	if (process.platform === 'darwin' || process.platform === 'linux') {
		app.setBadgeCount(messageCount);
	}

	if (process.platform === 'linux' || process.platform === 'win32') {
		tray.setBadge(messageCount);
	}
}

var lastWindowState = config.get('lastWindowState');
var width, height;

function createMainWindow() {
	var {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;
	const isDarkMode = config.get('darkMode');
	const isMax = config.get('isMax');

	const win = new electron.BrowserWindow({
		title: app.getName(),
		show: false,
		x: lastWindowState.x,
		y: lastWindowState.y,
		width: lastWindowState.width,
		height: lastWindowState.height,
		icon: (process.platform === 'linux' && path.join(__dirname, 'static/Icon.png')) || path.join(__dirname, 'static/Icon.ico'),
		minWidth: 400,
		minHeight: 200,
		titleBarStyle: 'hidden-inset',
		// autoHideMenuBar: true,
		darkTheme: isDarkMode, // GTK+3
		backgroundColor: isDarkMode ? '#192633' : '#fff',
		webPreferences: {
			preload: path.join(__dirname, 'browser.js'),
			nodeIntegration: false,
			plugins: true
		}
	});

	if (isMax) {
		if (lastWindowState.width >= 0.9*width && lastWindowState.height >= 0.9*height) {
			config.set('lastWindowState', {width: 800, height: 650});
		}
		win.maximize();
	}

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

	win.on('unmaximize', (e) => {
		lastWindowState = config.get('lastWindowState');
		win.setPosition(lastWindowState.x, lastWindowState.y);
		win.setSize(lastWindowState.width, lastWindowState.height);
		if (!lastWindowState.x && !lastWindowState.y) {
			win.center();
		}
	});

	win.on('resize', e => {
		config.set('lastWindowState', mainWindow.getBounds());
		lastWindowState = config.get('lastWindowState');
		if (lastWindowState.width >= 0.9*width && lastWindowState.height >= 0.9*height) {
			config.set('lastWindowState', {width: 800, height: 650, x: 283, y: 39});
		}
	});

	return win;
}

app.on('ready', () => {
	electron.Menu.setApplicationMenu(appMenu);
	mainWindow = createMainWindow();
	tray.create(mainWindow);

	const page = mainWindow.webContents;

	page.on('dom-ready', () => {
		page.insertCSS(fs.readFileSync(path.join(__dirname, 'browser.css'), 'utf8'));
		page.insertCSS(fs.readFileSync(path.join(__dirname, 'dark-mode.css'), 'utf8'));
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

	if(mainWindow.isMaximized()) {
		config.set('isMax', true);
	} else {
		config.set('isMax', false);
		config.set('lastWindowState', mainWindow.getBounds());
	}

});
