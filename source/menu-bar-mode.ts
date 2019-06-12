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

	if (enabled) {
		globalShortcut.register(menuBarShortcut, () => {
			if (window.isVisible()) {
				window.hide();
			} else {
				window.show();
			}
		});

		tray.create(window);
	} else {
		globalShortcut.unregister(menuBarShortcut);

		tray.destroy();
		app.dock.show();
		window.show();
	}
}

export function setupMenuBarMode(window: BrowserWindow): void {
	if (is.macos) {
		toggleMenuBarMode(window);

		if (config.get('menuBarMode') && !config.get('showDockIcon')) {
			app.dock.hide();
		}
	} else {
		tray.create(window);
	}
}
