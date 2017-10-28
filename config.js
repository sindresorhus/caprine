'use strict';
const Store = require('electron-store');

module.exports = new Store({
	defaults: {
		darkMode: false,
		vibrancy: false,
		zoomFactor: 1,
		lastWindowState: {
			width: 800,
			height: 600
		},
		continuity: false,
		alwaysOnTop: false,
		bounceDockOnMessage: false,
		showUnreadBadge: true,
		flashWindowOnMessage: true,
		block: {
			chatSeen: false,
			typingIndicator: false
		},
		confirmImagePaste: true,
		useWorkChat: false
	}
});
