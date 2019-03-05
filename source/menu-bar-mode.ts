import {app, globalShortcut, BrowserWindow, Menu} from 'electron';
import {is} from 'electron-util';

import config from './config';
import tray from './tray';

const menuBarShortcut = 'CommandOrControl+Shift+Y';

export function toggleMenuBarMode(window: BrowserWindow): void {
	const enabled = config.get('menuBarMode');
	const menuItem = Menu.getApplicationMenu()!.getMenuItemById('menuBarMode');

	menuItem.checked = enabled;

	window.setVisibleOnAllWorkspaces(enabled);
	window.setAlwaysOnTop(enabled);

	if (enabled) {
		if (!window.isFullScreen()) {
			app.dock.hide();
		}
	} else {
		app.dock.show();
		window.show();
	}

	if (enabled) {
		globalShortcut.register(menuBarShortcut, () => {
			if (window.isVisible()) {
				window.hide();
			} else {
				window.show();
			}
		});
	} else {
		globalShortcut.unregister(menuBarShortcut);
	}

	if (enabled) {
		tray.create(window);
	} else {
		tray.destroy();
	}
}

export function setupMenuBarMode(window: BrowserWindow): void {
	if (is.macos) {
		toggleMenuBarMode(window);

		window.on('enter-full-screen', () => {
			app.dock.show();
		});

		window.on('leave-full-screen', () => {
			if (config.get('menuBarMode')) {
				app.dock.hide();
			}
		});
	} else {
		tray.create(window);
	}
}
