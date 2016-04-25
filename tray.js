const path = require('path');
const electron = require('electron');
const app = electron.app;
let tray = null;

exports.create = win => {
	if (process.platform === 'darwin' || tray) {
		return;
	}

	const icon = process.platform === 'linux' ? 'IconTray.png' : 'Icon.ico';
	const iconPath = path.join(__dirname, `media/${icon}`);

	const toggleWin = () => {
		if (win.isVisible()) {
			win.hide();
		} else {
			win.show();
		}
	};

	const contextMenu = electron.Menu.buildFromTemplate([
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
			label: 'Quit',
			click() {
				app.quit();
			}
		}
	]);

	tray = new electron.Tray(iconPath);
	tray.setToolTip(`${app.getName()}`);
	tray.setContextMenu(contextMenu);
	tray.on('clicked', toggleWin);
};

exports.setBadge = shouldDisplayUnread => {
	if (process.platform === 'darwin' || !tray) {
		return;
	}

	let icon;
	if (process.platform === 'linux') {
		icon = shouldDisplayUnread ? 'IconTrayUnread.png' : 'IconTray.png';
	} else {
		icon = shouldDisplayUnread ? 'IconTrayUnread.ico' : 'Icon.ico';
	}

	const iconPath = path.join(__dirname, `media/${icon}`);
	tray.setImage(iconPath);
};
