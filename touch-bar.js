'use strict';
const path = require('path');
const {TouchBar, ipcMain: ipc} = require('electron');
const {sendAction, getWindow} = require('./util');

const {TouchBarButton} = TouchBar;

ipc.on('touch-bar', (event, conversations) => {
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
