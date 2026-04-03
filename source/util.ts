import {
	app,
	BrowserWindow,
	dialog,
	Menu,
} from 'electron';
import {ipcMain} from 'electron-better-ipc';
import {is} from 'electron-util';
import config from './config';
import tray from './tray';

export function getWindow(): BrowserWindow {
	const [win] = BrowserWindow.getAllWindows();
	return win;
}

export function sendAction<T>(action: string, arguments_?: T): void {
	const win = getWindow();

	if (is.macos) {
		win.restore();
	}

	ipcMain.callRenderer(win, action, arguments_);
}

export async function sendBackgroundAction<T, ReturnValue>(action: string, arguments_?: T): Promise<ReturnValue> {
	return ipcMain.callRenderer<T, ReturnValue>(getWindow(), action, arguments_);
}

export function showRestartDialog(message: string): void {
	const buttonIndex = dialog.showMessageBoxSync(
		getWindow(),
		{
			message,
			detail: 'Do you want to restart the app now?',
			buttons: [
				'Restart',
				'Ignore',
			],
			defaultId: 0,
			cancelId: 1,
		},
	);

	if (buttonIndex === 0) {
		app.relaunch();
		app.quit();
	}
}

export const messengerDomain = 'facebook.com';

export function stripTrackingFromUrl(url: string): string {
	const trackingUrlPrefix = `https://l.${messengerDomain}/l.php`;
	if (url.startsWith(trackingUrlPrefix)) {
		url = new URL(url).searchParams.get('u')!;
	}

	return url;
}

export const toggleTrayIcon = (): void => {
	const showTrayIconState = config.get('showTrayIcon');
	config.set('showTrayIcon', !showTrayIconState);

	if (showTrayIconState) {
		tray.destroy();
	} else {
		tray.create(getWindow());
	}
};

export const toggleLaunchMinimized = (menu: Menu): void => {
	config.set('launchMinimized', !config.get('launchMinimized'));
	const showTrayIconItem = menu.getMenuItemById('showTrayIcon')!;

	if (config.get('launchMinimized')) {
		if (!config.get('showTrayIcon')) {
			toggleTrayIcon();
		}

		disableMenuItem(showTrayIconItem, true);

		dialog.showMessageBox({
			type: 'info',
			message: 'The “Show Tray Icon” setting is force-enabled while the “Launch Minimized” setting is enabled.',
			buttons: ['OK'],
		});
	} else {
		showTrayIconItem.enabled = true;
	}
};

const disableMenuItem = (menuItem: Electron.MenuItem, checked: boolean): void => {
	menuItem.enabled = false;
	menuItem.checked = checked;
};
