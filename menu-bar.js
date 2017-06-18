'use strict';
const path = require('path');
const {Tray} = require('electron');

let menuBar = null;

exports.create = win => {
	menuBar = new Tray(getIconPath(0));
	updateToolTip(0);

	menuBar.setHighlightMode('never');

	menuBar.on('click', e => {
		if (win.isVisible())
			win.hide();
		else
			win.show();
	});
};

exports.update = messageCount => {
	updateIcon(messageCount);
	updateToolTip(messageCount);
};

function updateToolTip(counter) {
	let tip = 'Caprine';

	if (Number.isInteger(counter) && counter > 0) {
		let msg = (counter === 1 ? 'message' : 'messages');
		tip = tip.concat(' - ', counter, ' unread ', msg);
	}

	menuBar.setToolTip(tip);
}

function updateIcon(messageCount) {
	menuBar.setImage(getIconPath(messageCount));
}

function getIconPath(counter) {
	if (Number.isInteger(counter) && counter > 0)
		return path.join(__dirname, 'static/IconMenuBarUnread.png');

	return path.join(__dirname, 'static/IconMenuBar.png');
}
