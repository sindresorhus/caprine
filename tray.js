const electron = require('electron');
const app = electron.app;
const Menu = electron.Menu;
const Tray = electron.Tray;

const path = require('path');
const iconPath = path.join(__dirname, 'media', 'Icon.ico');

module.exports = function (win) {
	if (process.platform === 'darwin') {
		return false;
	}

	const appIcon = new Tray(iconPath);
	const contextMenu = Menu.buildFromTemplate([
		{
			label: 'Show',
			click() {
				win.show();
			}
		},
		{
			label: 'Hide',
			click() {
				win.hide();
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
	appIcon.setToolTip(`${app.getName()}`);
	appIcon.setContextMenu(contextMenu);
	return appIcon;
};
