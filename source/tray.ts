import * as path from 'path';
import {app, Menu, Tray, BrowserWindow} from 'electron';
import {is} from 'electron-util';
import config from './config';
import {toggleMenuBarMode} from '.';

let tray: Tray | null = null;
let previousMessageCount = 0;

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

		const contextMenu = Menu.buildFromTemplate([
			{
				label: 'Disable Menu Bar Mode',
				click() {
					config.set('menuBarMode', false);
					toggleMenuBarMode();
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
		if (tray) {
			tray.destroy();
			tray = null;
		}
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
		? getDarwinIconName(hasUnreadMessages)
		: getNonDarwinIconName(hasUnreadMessages);

	return path.join(__dirname, '..', `static/${icon}`);
}

function getNonDarwinIconName(hasUnreadMessages: boolean): string {
	return hasUnreadMessages ? 'IconTrayUnread.png' : 'IconTray.png';
}

function getDarwinIconName(hasUnreadMessages: boolean): string {
	return hasUnreadMessages ? 'IconMenuBarUnreadTemplate.png' : 'IconMenuBarTemplate.png';
}
