'use strict';
const Store = require('electron-store');

module.exports = new Store({
	defaults: {
		followSystemAppearance: false,
		darkMode: false,
		vibrancy: false,
		zoomFactor: 1,
		lastWindowState: {
			width: 800,
			height: 600
		},
		alwaysOnTop: false,
		bounceDockOnMessage: false,
		oldEmoji: false,
		showUnreadBadge: true,
		showMessageButtons: true,
		launchMinimized: false,
		flashWindowOnMessage: true,
		block: {
			chatSeen: false,
			typingIndicator: false
		},
		confirmImagePaste: true,
		useWorkChat: false,
		sidebarHidden: false,
		autoHideMenuBar: false,
		notificationsMuted: false,
		hardwareAcceleration: true,
		quitOnWindowClose: false,
		keepMeSignedIn: true
	}
});
