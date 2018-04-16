const electron = require('electron');
const path = require('path');

const { BrowserWindow, TouchBar, ipcMain: ipc, nativeImage} = electron;
const {TouchBarButton} = TouchBar;

function getWindow() {
	const [win] = BrowserWindow.getAllWindows();
	return win;
}

function sendAction(action, ...args) {
	const win = getWindow();
	if (process.platform === 'darwin') {
		win.restore();
	}

  win.webContents.send(action, ...args);
}

ipc.on('touchBar', (event, conversations) => {
	const touchBar = new TouchBar(
		conversations.map(({label, selected, unread}, index) => {
			return new TouchBarButton({
				label,
				backgroundColor: selected ? '#0084ff' : undefined,
				icon: unread ? path.join(__dirname, 'static/IconTouchBarUnread.png') : undefined,
				iconPosition: 'right',
				click: () => {
					sendAction('jump-to-conversation', index + 1);
				}
			});
		})
	);

	const win = getWindow();
	win.setTouchBar(touchBar);
});
