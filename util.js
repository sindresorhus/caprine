'use strict';
const {BrowserWindow} = require('electron');

function getWindow() {
	const [win] = BrowserWindow.getAllWindows();
	return win;
}

function sendAction(action, ...args) {
	const win = getWindow();
	if (process.platform === 'darwin') {
		win.restore();
	}

	win.webContents.send(action, ...args);
}

exports.getWindow = getWindow;
exports.sendAction = sendAction;
