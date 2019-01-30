import * as path from 'path';
import {app, Menu, Tray, BrowserWindow} from 'electron';
import {is} from 'electron-util';

let tray: Tray | null = null;

export default {
	create: (win: BrowserWindow) => {
		if (is.macos || tray) {
			return;
		}

		const iconPath = path.join(__dirname, '..', 'static', 'IconTray.png');

		const toggleWin = (): void => {
			if (win.isVisible()) {
				win.hide();
			} else {
				win.show();
			}
		};

		const contextMenu = Menu.buildFromTemplate([
			{
				label: 'Toggle',
				click() {
					toggleWin();
				}
			},
			{
				type: 'separator'
			},
			{
				role: 'quit'
			}
		]);

		tray = new Tray(iconPath);
		tray.setToolTip(`${app.getName()}`);
		tray.setContextMenu(contextMenu);
		tray.on('click', toggleWin);
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
