const electron = require('electron');

const {BrowserWindow, TouchBar, ipcMain: ipc} = electron;
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
		conversations.map((label, index) => {
			return new TouchBarButton({
				label,
				click: () => {
					sendAction('jumpToConversation', index + 1);
				}
			});
		})
	);

	const win = getWindow();
	win.setTouchBar(touchBar);
});
