'use strict';
const {TouchBar, ipcMain: ipc, nativeImage} = require('electron');
const {sendAction, getWindow} = require('./util');

const {TouchBarButton} = TouchBar;

ipc.on('conversations', (event, conversations) => {
	const touchBar = new TouchBar(
		conversations.map(({label, selected, icon}, index) => {
			return new TouchBarButton({
				label: label.length > 25 ? label.slice(0, 25) + '…' : label,
				backgroundColor: selected ? '#0084ff' : undefined,
				icon: nativeImage.createFromDataURL(icon),
				iconPosition: 'left',
				click: () => {
					sendAction('jump-to-conversation', index + 1);
				}
			});
		})
	);

	const win = getWindow();
	win.setTouchBar(touchBar);
});
