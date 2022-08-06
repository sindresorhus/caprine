import * as path from 'node:path';
import {app, Menu, Tray, BrowserWindow, MenuItemConstructorOptions} from 'electron';
import {is} from 'electron-util';
import config from './config';
import {toggleMenuBarMode} from './menu-bar-mode';

let tray: Tray | undefined;
let previousMessageCount = 0;

let contextMenu: Menu;

export default {
	create(win: BrowserWindow) {
		if (tray) {
			return;
		}

		function toggleWindow(): void {
			if (win.isVisible()) {
				win.hide();
			} else {
				if (config.get('lastWindowState').isMaximized) {
					win.maximize();
					win.focus();
				} else {
					win.show();
				}

				// Workaround for https://github.com/electron/electron/issues/20858
				// `setAlwaysOnTop` stops working after hiding the window on KDE Plasma.
				const alwaysOnTopMenuItem = Menu.getApplicationMenu()!.getMenuItemById('always-on-top')!;
				win.setAlwaysOnTop(alwaysOnTopMenuItem.checked);
			}
		}

		const macosMenuItems: MenuItemConstructorOptions[] = is.macos
			? [
				{
					label: 'Disable Menu Bar Mode',
					click() {
						config.set('menuBarMode', false);
						toggleMenuBarMode(win);
					},
				},
				{
					label: 'Show Dock Icon',
					type: 'checkbox',
					checked: config.get('showDockIcon'),
					click(menuItem) {
						config.set('showDockIcon', menuItem.checked);

						if (menuItem.checked) {
							app.dock.show();
						} else {
							app.dock.hide();
						}

						const dockMenuItem = contextMenu.getMenuItemById('dockMenu')!;
						dockMenuItem.visible = !menuItem.checked;
					},
				},
				{
					type: 'separator',
				},
				{
					id: 'dockMenu',
					label: 'Menu',
					visible: !config.get('showDockIcon'),
					submenu: Menu.getApplicationMenu()!,
				},
			] : [];

		contextMenu = Menu.buildFromTemplate([
			{
				label: 'Toggle',
				visible: !is.macos,
				click() {
					toggleWindow();
				},
			},
			...macosMenuItems,
			{
				type: 'separator',
			},
			{
				role: 'quit',
			},
		]);

		tray = new Tray(getIconPath(false));

		tray.setContextMenu(contextMenu);

		updateToolTip(0);

		const trayClickHandler = (): void => {
			if (!win.isFullScreen()) {
				toggleWindow();
			}
		};

		tray.on('click', trayClickHandler);
		tray.on('double-click', trayClickHandler);
		tray.on('right-click', () => {
			tray?.popUpContextMenu(contextMenu);
		});
	},

	destroy() {
		// Workaround for https://github.com/electron/electron/issues/14036
		setTimeout(() => {
			tray?.destroy();
			tray = undefined;
		}, 500);
	},

	update(messageCount: number) {
		if (!tray || previousMessageCount === messageCount) {
			return;
		}

		previousMessageCount = messageCount;
		tray.setImage(getIconPath(messageCount > 0));
		updateToolTip(messageCount);
	},

	setBadge(shouldDisplayUnread: boolean) {
		if (is.macos || !tray) {
			return;
		}

		tray.setImage(getIconPath(shouldDisplayUnread));
	},
};

function updateToolTip(counter: number): void {
	if (!tray) {
		return;
	}

	let tooltip = app.name;

	if (counter > 0) {
		tooltip += `- ${counter} unread ${counter === 1 ? 'message' : 'messages'}`;
	}

	tray.setToolTip(tooltip);
}

function getIconPath(hasUnreadMessages: boolean): string {
	const icon = is.macos
		? getMacOSIconName(hasUnreadMessages)
		: getNonMacOSIconName(hasUnreadMessages);

	return path.join(__dirname, '..', `static/${icon}`);
}

function getNonMacOSIconName(hasUnreadMessages: boolean): string {
	return hasUnreadMessages ? 'IconTrayUnread.png' : 'IconTray.png';
}

function getMacOSIconName(hasUnreadMessages: boolean): string {
	return hasUnreadMessages ? 'IconMenuBarUnreadTemplate.png' : 'IconMenuBarTemplate.png';
}
