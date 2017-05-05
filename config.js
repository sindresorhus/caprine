'use strict';
const Config = require('electron-config');

module.exports = new Config({
	defaults: {
		darkMode: false,
		vibrancy: false,
		zoomFactor: 1,
		lastWindowState: {
			width: 800,
			height: 600
		},
		alwaysOnTop: false,
		bounceDockOnMessage: false,
		block: {
			chatSeen: false,
			typingIndicator: false
		}
	}
});
