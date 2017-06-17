'use strict';
const path = require('path');
const menubar = require('menubar');

let mb = null;

exports.create = () => {
	const iconPath = path.join(__dirname, 'static/IconMenuBarUnread.png');

	mb = menubar({
		tooltip: "Caprine",
		icon: iconPath
	});

	mb.on('after-show', () => {
		mb.hideWindow();
	});
};
