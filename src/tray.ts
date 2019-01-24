import {join} from 'path';
import {app, Menu, Tray} from 'electron';
import {is} from 'electron-util';

let tray = null;

export default {
	create: win => {
		if (is.macos || tray) {
			return;
		}

		const iconPath = join(__dirname, 'static/IconTray.png');

		const toggleWin = () => {
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

	setBadge: shouldDisplayUnread => {
		if (is.macos || !tray) {
			return;
		}

		const icon = shouldDisplayUnread ? 'IconTrayUnread.png' : 'IconTray.png';
		const iconPath = join(__dirname, `static/${icon}`);
		tray.setImage(iconPath);
	}
};
