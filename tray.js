'use strict';
const path = require('path');
const electron = require('electron');
const config = require('./config');

const {app} = electron;
let contextMenu = null;
let tray = null;
let lastCounter = 0;

exports.create = win => {
	if (tray !== null && !tray.isDestroyed()) {
		return;
	}

	contextMenu = electron.Menu.buildFromTemplate([
		{
			label: 'Disable Continuity',
			click() {
				config.set('continuity', false);
				win.toggleContinuity();
			}
		},
		{
			type: 'separator'
		},
		{
			role: 'quit'
		}
	]);

	tray = new electron.Tray(getIconPath(false));
	updateToolTip(0);

	tray.on('click', () => {
		win.toggle();
	});

	tray.on('double-click', () => {
		win.toggle();
	});

	tray.on('right-click', () => {
		if (process.platform === 'darwin') {
			tray.popUpContextMenu(contextMenu);
		}
	});
};

exports.update = messageCount => {
	if (!tray || !Number.isInteger(messageCount) || lastCounter === messageCount) {
		return;
	}

	lastCounter = messageCount;

	tray.setImage(getIconPath(messageCount > 0));

	updateToolTip(messageCount);
};

exports.destroy = () => {
	if (tray !== null && !tray.isDestroyed()) {
		tray.destroy();
	}
};

function updateToolTip(counter) {
	let tip = app.getName();

	if (counter > 0) {
		const msg = (counter === 1 ? 'message' : 'messages');
		tip += ` - ${counter} unread ${msg}`;
	}

	tray.setToolTip(tip);
}

function getIconPath(hasUnreadMessages) {
	let icon = '';

	if (process.platform === 'darwin') {
		icon = getDarwinIconPath(hasUnreadMessages);
	} else {
		icon = getNonDarwinIconPath(hasUnreadMessages);
	}

	return path.join(__dirname, `static/${icon}`);
}

function getNonDarwinIconPath(hasUnreadMessages) {
	return hasUnreadMessages ? 'IconTrayUnread.png' : 'IconTray.png';
}

function getDarwinIconPath(hasUnreadMessages) {
	return hasUnreadMessages ? 'IconMenuBarUnreadTemplate.png' : 'IconMenuBarTemplate.png';
}
