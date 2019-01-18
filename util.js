'use strict';
const {app, BrowserWindow, dialog} = require('electron');
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

function sendBackgroundAction(action, ...args) {
	getWindow().webContents.send(action, ...args);
}

function showRestartDialog(message) {
	return dialog.showMessageBox({
		message,
		detail: 'Do you want to restart the app now?',
		buttons: [
			'Restart',
			'Ignore'
		],
		defaultId: 0,
		cancelId: 1
	}, response => {
		if (response === 0) {
			app.relaunch();
			app.quit();
		}
	});
}

exports.getWindow = getWindow;
exports.sendAction = sendAction;
exports.sendBackgroundAction = sendBackgroundAction;
exports.showRestartDialog = showRestartDialog;
