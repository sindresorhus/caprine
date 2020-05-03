import Store = require('electron-store');
import {is} from 'electron-util';

type StoreType = {
	followSystemAppearance: boolean;
	darkMode: boolean;
	privateMode: boolean;
	showPrivateModePrompt: boolean;
	vibrancy: 'none' | 'sidebar' | 'full';
	zoomFactor: number;
	lastWindowState: {
		x: number;
		y: number;
		width: number;
		height: number;
		isMaximized: boolean;
	};
	menuBarMode: boolean;
	showDockIcon: boolean;
	showTrayIcon: boolean;
	alwaysOnTop?: boolean;
	bounceDockOnMessage: boolean;
	showUnreadBadge: boolean;
	showMessageButtons: boolean;
	launchMinimized: boolean;
	flashWindowOnMessage: boolean;
	notificationMessagePreview: boolean;
	block: {
		chatSeen: boolean;
		typingIndicator: boolean;
		deliveryReceipt: boolean;
	};
	emojiStyle: 'native' | 'facebook-3-0' | 'messenger-1-0' | 'facebook-2-2';
	useWorkChat: boolean;
	sidebar: 'default' | 'hidden' | 'narrow' | 'wide';
	autoHideMenuBar: boolean;
	notificationsMuted: boolean;
	callRingtoneMuted: boolean;
	hardwareAcceleration: boolean;
	quitOnWindowClose: boolean;
	keepMeSignedIn: boolean;
	autoplayVideos: boolean;
	spellCheckerLanguages: string[];
};

const schema: {[Key in keyof StoreType]: Store.Schema} = {
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
	showPrivateModePrompt: {
		type: 'boolean',
		default: true
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
			x: {
				type: 'number'
			},
			y: {
				type: 'number'
			},
			width: {
				type: 'number'
			},
			height: {
				type: 'number'
			},
			isMaximized: {
				type: 'boolean'
			}
		},
		default: {
			x: undefined,
			y: undefined,
			width: 800,
			height: 600,
			isMaximized: false
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
				type: 'boolean'
			},
			typingIndicator: {
				type: 'boolean'
			},
			deliveryReceipt: {
				type: 'boolean'
			}
		},
		default: {
			chatSeen: false,
			typingIndicator: false,
			deliveryReceipt: false
		}
	},
	emojiStyle: {
		type: 'string',
		enum: ['native', 'facebook-3-0', 'messenger-1-0', 'facebook-2-2'],
		default: 'facebook-3-0'
	},
	useWorkChat: {
		type: 'boolean',
		default: false
	},
	sidebar: {
		type: 'string',
		enum: ['default', 'hidden', 'narrow', 'wide'],
		default: 'default'
	},
	autoHideMenuBar: {
		type: 'boolean',
		default: false
	},
	notificationsMuted: {
		type: 'boolean',
		default: false
	},
	callRingtoneMuted: {
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
	},
	spellCheckerLanguages: {
		type: 'array',
		items: {
			type: 'string'
		},
		default: []
	}
};

function updateVibrancySetting(store: Store): void {
	const vibrancy = store.get('vibrancy');

	if (!is.macos || !vibrancy) {
		store.set('vibrancy', 'none');
	} else if (vibrancy === true) {
		store.set('vibrancy', 'full');
	} else if (vibrancy === false) {
		store.set('vibrancy', 'sidebar');
	}
}

function updateSidebarSetting(store: Store): void {
	if (store.get('sidebarHidden')) {
		store.set('sidebar', 'hidden');
		store.delete('sidebarHidden');
	} else if (!store.has('sidebar')) {
		store.set('sidebar', 'default');
	}
}

function migrate(store: Store): void {
	updateVibrancySetting(store);
	updateSidebarSetting(store);
}

const store = new Store<StoreType>({schema});
migrate(store);

export default store;
