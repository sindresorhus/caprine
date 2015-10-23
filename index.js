'use strict';
const path = require('path');
const fs = require('fs');
const app = require('app');
const BrowserWindow = require('browser-window');
const shell = require('shell');
const Menu = require('menu');
const appMenu = require('./menu');

require('electron-debug')();
require('crash-reporter').start();

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
	const win = new BrowserWindow({
		'title': app.getName(),
		'show': false,
		'width': 800,
		'height': 600,
		'icon': process.platform === 'linux' && path.join(__dirname, 'media', 'Icon.png'),
		'min-width': 400,
		'min-height': 200,
		'title-bar-style': 'hidden-inset',
		'web-preferences': {
			// fails without this because of CommonJS script detection
			'node-integration': false,

			'preload': path.join(__dirname, 'browser.js'),

			// required for Facebook active ping thingy
			'web-security': false,

			'plugins': true
		}
	});

	win.loadUrl('https://www.messenger.com/login/');
	win.on('closed', app.quit);
	win.on('page-title-updated', (e, title) => updateBadge(title));

	return win;
}

app.on('ready', () => {
	Menu.setApplicationMenu(appMenu);

	mainWindow = createMainWindow();

	const page = mainWindow.webContents;

	page.on('dom-ready', () => {
		page.insertCSS(fs.readFileSync(path.join(__dirname, 'browser.css'), 'utf8'));
		mainWindow.show();
	});

	page.on('new-window', (e, url) => {
		e.preventDefault();
		shell.openExternal(url);
	});
});
