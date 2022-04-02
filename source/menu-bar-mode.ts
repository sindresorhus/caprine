import {app, globalShortcut, BrowserWindow, Menu} from 'electron';
import {is} from 'electron-util';
import config from './config';
import tray from './tray';

const menuBarShortcut = 'Command+Shift+y';

export function toggleMenuBarMode(window: BrowserWindow): void {
	const isEnabled = config.get('menuBarMode');
	const menuItem = Menu.getApplicationMenu()!.getMenuItemById('menuBarMode')!;

	menuItem.checked = isEnabled;

	window.setVisibleOnAllWorkspaces(isEnabled);

	if (isEnabled) {
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

export function setUpMenuBarMode(window: BrowserWindow): void {
	if (is.macos) {
		toggleMenuBarMode(window);
	} else if (config.get('showTrayIcon') && !config.get('quitOnWindowClose')) {
		tray.create(window);
	}
}
