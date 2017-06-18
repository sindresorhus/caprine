'use strict';
const path = require('path');
const electron = require('electron');

const {app} = electron;
let tray = null;
let lastCounter = 0;

exports.create = win => {
	if (tray) {
		return;
	}

	let iconPath = '';

	if (process.platform === 'darwin') {
		iconPath = getDarwinIconPath(0);
	} else {
		iconPath = path.join(__dirname, 'static/IconTray.png');
	}

	const contextMenu = electron.Menu.buildFromTemplate([
		{
			label: 'Toggle',
			click() {
				win.toggle();
			}
		},
		{
			type: 'separator'
		},
		{
			role: 'quit'
		}
	]);

	tray = new electron.Tray(iconPath);
	tray.setToolTip(`${app.getName()}`);

	tray.on('click', () => {
		win.toggle();
	});

	tray.on('right-click', () => {
		tray.popUpContextMenu(contextMenu);
	});
};

exports.update = messageCount => {
	if (process.platform === 'darwin') {
		tray.setImage(getDarwinIconPath(messageCount));
	} else {
		setBadge(messageCount);
	}

	updateToolTip(messageCount);
};

function setBadge(shouldDisplayUnread) {
	if (process.platform === 'darwin' || !tray) {
		return;
	}

	const icon = shouldDisplayUnread ? 'IconTrayUnread.png' : 'IconTray.png';
	const iconPath = path.join(__dirname, `static/${icon}`);
	tray.setImage(iconPath);
}

function updateToolTip(counter) {
	if (!Number.isInteger(counter) || lastCounter === counter) {
		return;
	}

	lastCounter = counter;

	let tip = app.getName();

	if (counter > 0) {
		const msg = (counter === 1 ? 'message' : 'messages');
		tip = tip.concat(' - ', counter, ' unread ', msg);
	}

	tray.setToolTip(tip);
}

function getDarwinIconPath(counter) {
	if (Number.isInteger(counter) && counter > 0) {
		return path.join(__dirname, 'static/IconMenuBarUnread.png');
	}

	return path.join(__dirname, 'static/IconMenuBar.png');
}
