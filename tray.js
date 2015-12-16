const path = require('path');
const electron = require('electron');
const app = electron.app;
const iconPath = path.join(__dirname, 'media/Icon.ico');

module.exports = win => {
	if (process.platform === 'darwin') {
		return false;
	}

	const tray = new electron.Tray(iconPath);

	const contextMenu = electron.Menu.buildFromTemplate([
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

	tray.setToolTip(`${app.getName()}`);
	tray.setContextMenu(contextMenu);

	return tray;
};
