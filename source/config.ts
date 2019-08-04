import Store = require('electron-store');
import {is} from 'electron-util';
import {JSONSchema} from 'json-schema-typed';

const schema: {[key: string]: JSONSchema} = {
	followSystemAppearance: {
		type: 'boolean',
		default: true
	},
	darkMode: {
		type: 'boolean',
		default: false
	},
	privateMode: {
		type: 'boolean',
		default: false
	},
	vibrancy: {
		type: 'string',
		enum: ['none', 'sidebar', 'full'],
		// TODO: Change the default to 'sidebar' when the vibrancy issue in Electron is fixed.
		// See https://github.com/electron/electron/issues/10420
		default: 'none'
	},
	zoomFactor: {
		type: 'number',
		default: 1
	},
	lastWindowState: {
		type: 'object',
		properties: {
			width: {
				type: 'number',
				default: 800
			},
			height: {
				type: 'number',
				default: 600
			},
			x: {
				type: 'number'
			},
			y: {
				type: 'number'
			}
		}
	},
	menuBarMode: {
		type: 'boolean',
		default: false
	},
	showDockIcon: {
		type: 'boolean',
		default: true
	},
	showTrayIcon: {
		type: 'boolean',
		default: true
	},
	alwaysOnTop: {
		type: 'boolean'
	},
	bounceDockOnMessage: {
		type: 'boolean',
		default: false
	},
	showUnreadBadge: {
		type: 'boolean',
		default: true
	},
	showMessageButtons: {
		type: 'boolean',
		default: true
	},
	launchMinimized: {
		type: 'boolean',
		default: false
	},
	flashWindowOnMessage: {
		type: 'boolean',
		default: true
	},
	notificationMessagePreview: {
		type: 'boolean',
		default: true
	},
	block: {
		type: 'object',
		properties: {
			chatSeen: {
				type: 'boolean',
				default: false
			},
			typingIndicator: {
				type: 'boolean',
				default: false
			},
			deliveryReceipt: {
				type: 'boolean',
				default: false
			}
		}
	},
	emojiStyle: {
		type: 'string',
		enum: ['native', 'facebook-3-0', 'messenger-1-0', 'facebook-2-2'],
		default: 'facebook-3-0'
	},
	confirmImagePaste: {
		type: 'boolean',
		default: true
	},
	useWorkChat: {
		type: 'boolean',
		default: false
	},
	sidebarHidden: {
		type: 'boolean',
		default: false
	},
	autoHideMenuBar: {
		type: 'boolean',
		default: false
	},
	notificationsMuted: {
		type: 'boolean',
		default: false
	},
	hardwareAcceleration: {
		type: 'boolean',
		default: true
	},
	quitOnWindowClose: {
		type: 'boolean',
		default: false
	},
	keepMeSignedIn: {
		type: 'boolean',
		default: true
	},
	autoplayVideos: {
		type: 'boolean',
		default: true
	}
};

function updateVibrancySetting(store: Store<any>): void {
	const vibrancy = store.get('vibrancy');

	if (!is.macos) {
		store.set('vibrancy', 'none');
	} else if (vibrancy === true) {
		store.set('vibrancy', 'full');
	} else if (vibrancy === false) {
		store.set('vibrancy', 'sidebar');
	}
}

function migrate(store: Store<any>): void {
	updateVibrancySetting(store);
}

const store: Store<any> = new Store({schema});
migrate(store);

export default store;
