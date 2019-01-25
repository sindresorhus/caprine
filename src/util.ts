import {app, BrowserWindow, dialog} from 'electron';

import electronUtil = require('electron-util');
const {is} = electronUtil;

export function getWindow(): BrowserWindow {
	const [win] = BrowserWindow.getAllWindows();
	return win;
}

export function sendAction(action: string, ...args: any[]): void {
	const win = getWindow();

	if (is.macos) {
		win.restore();
	}

	win.webContents.send(action, ...args);
}

export function showRestartDialog(message: string): void {
	dialog.showMessageBox(
		{
			message,
			detail: 'Do you want to restart the app now?',
			buttons: ['Restart', 'Ignore'],
			defaultId: 0,
			cancelId: 1
		},
		response => {
			if (response === 0) {
				app.relaunch();
				app.quit();
			}
		}
	);
}
