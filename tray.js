const path = require('path');
const electron = require('electron');
const app = electron.app;
const icon = process.platform === 'linux' ? 'IconTray.png' : 'Icon.ico';
const iconPath = path.join(__dirname, `media/${icon}`);

module.exports = win => {
	if (process.platform === 'darwin') {
		return false;
	}

	const toggleWin = () => {
		if (win.isVisible()) {
			win.hide();
		} else {
			win.show();
		}
	};

	const tray = new electron.Tray(iconPath);

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

	tray.setToolTip(`${app.getName()}`);
	tray.setContextMenu(contextMenu);
	tray.on('clicked', toggleWin);

	return tray;
};
