'use strict';
const {BrowserWindow} = require('electron');
const {is} = require('electron-util');

function getWindow() {
	const [win] = BrowserWindow.getAllWindows();
	return win;
}

function sendAction(action, ...args) {
	const win = getWindow();
	if (is.macos) {
		win.restore();
	}

	win.webContents.send(action, ...args);
}

exports.getWindow = getWindow;
exports.sendAction = sendAction;
