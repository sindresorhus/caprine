import {app, BrowserWindow, dialog} from 'electron';
import {is} from 'electron-util';
import config from './config';

export function getWindow(): BrowserWindow {
	const [win] = BrowserWindow.getAllWindows();
	return win;
}

export function sendAction(action: string, ...args: unknown[]): void {
	const win = getWindow();

	if (is.macos) {
		win.restore();
	}

	win.webContents.send(action, ...args);
}

export function sendBackgroundAction(action: string, ...args: unknown[]): void {
	getWindow().webContents.send(action, ...args);
}

export function showRestartDialog(message: string): void {
	const buttonIndex = dialog.showMessageBoxSync({
		message,
		detail: 'Do you want to restart the app now?',
		buttons: [
			'Restart',
			'Ignore'
		],
		defaultId: 0,
		cancelId: 1
	});

	if (buttonIndex === 0) {
		app.relaunch();
		app.quit();
	}
}

export const messengerDomain = config.get('useWorkChat') ? 'facebook.com' : 'messenger.com';

export function stripTrackingFromUrl(url: string): string {
	const trackingUrlPrefix = `https://l.${messengerDomain}/l.php`;
	if (url.startsWith(trackingUrlPrefix)) {
		url = new URL(url).searchParams.get('u')!;
	}

	return url;
}
