const Store = require('electron-store');

const defaults = {
	defaults: {
		followSystemAppearance: true,
		darkMode: false,

		// TODO: Change the default to 'sidebar' when the vibrancy issue in Electron is fixed.
		// See https://github.com/electron/electron/issues/10420
		vibrancy: 'none', // Possible values: 'none', 'sidebar', 'full'

		zoomFactor: 1,
		lastWindowState: {
			width: 800,
			height: 600
		},
		alwaysOnTop: false,
		bounceDockOnMessage: false,
		showUnreadBadge: true,
		showMessageButtons: true,
		launchMinimized: false,
		flashWindowOnMessage: true,
		block: {
			chatSeen: false,
			typingIndicator: false
		},
		emojiStyle: 'facebook-3-0',
		confirmImagePaste: true,
		useWorkChat: false,
		sidebarHidden: false,
		autoHideMenuBar: false,
		notificationsMuted: false,
		hardwareAcceleration: true,
		quitOnWindowClose: false,
		keepMeSignedIn: true
	}
};

function updateVibrancySetting(store) {
	const vibrancy = store.get('vibrancy');

	if (vibrancy === true) {
		store.set('vibrancy', 'full');
	} else if (vibrancy === false) {
		store.set('vibrancy', 'sidebar');
	}
}

function migrate(store) {
	updateVibrancySetting(store);
}

const store = new Store(defaults);
migrate(store);

module.exports = store;
