import * as path from 'path';
import {app, Menu, Tray, BrowserWindow} from 'electron';
import {is} from 'electron-util';
import config from './config';
import {toggleMenuBarMode} from './menu-bar-mode';

let tray: Tray | null = null;
let previousMessageCount = 0;

let contextMenu: any;

export default {
	create: (win: BrowserWindow) => {
		if (tray) {
			return;
		}

		const toggleWin = (): void => {
			if (win.isVisible()) {
				win.hide();
			} else {
				win.show();
			}
		};

		contextMenu = Menu.buildFromTemplate([
			{
				label: 'Disable Menu Bar Mode',
				click() {
					config.set('menuBarMode', false);
					toggleMenuBarMode(win);
				}
			},
			{
				type: 'separator'
			},
			{
				role: 'quit'
			}
		]);

		tray = new Tray(getIconPath(false));

		updateToolTip(0);

		const trayClickHandler = (): void => {
			if (!win.isFullScreen()) {
				toggleWin();
			}
		};

		tray.on('click', trayClickHandler);
		tray.on('double-click', trayClickHandler);
		tray.on('right-click', () => {
			if (is.macos && tray) {
				tray.popUpContextMenu(contextMenu);
			}
		});
	},

	destroy: () => {
		// Workaround for https://github.com/electron/electron/issues/14036
		setTimeout(() => {
			if (tray) {
				tray.destroy();
				tray = null;
			}
		}, 500);
	},

	update: (messageCount: number) => {
		if (!tray || previousMessageCount === messageCount) {
			return;
		}

		previousMessageCount = messageCount;
		tray.setImage(getIconPath(messageCount > 0));
		updateToolTip(messageCount);
	},

	setBadge: (shouldDisplayUnread: boolean) => {
		if (is.macos || !tray) {
			return;
		}

		const icon = shouldDisplayUnread ? 'IconTrayUnread.png' : 'IconTray.png';
		const iconPath = path.join(__dirname, '..', 'static', icon);
		tray.setImage(iconPath);
	}
};

function updateToolTip(counter: number): void {
	if (!tray) {
		return;
	}

	let tooltip = app.getName();

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
