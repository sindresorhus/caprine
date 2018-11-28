'use strict';
const path = require('path');
const electron = require('electron');
const {
	is,
	appMenu,
	openUrlMenuItem,
	aboutMenuItem,
	openNewGitHubIssue,
	debugInfo
} = require('electron-util');
const config = require('./config');
const vibrancyConfig = require('./vibrancy-config');
const {sendAction} = require('./util');

const {app} = electron;

const newConversationItem = {
	label: 'New Conversation',
	accelerator: 'CommandOrControl+N',
	click() {
		sendAction('new-conversation');
	}
};

const switchItems = [
	{
		label: 'Switch to Work Chat…',
		accelerator: 'CommandOrControl+Shift+2',
		visible: !config.get('useWorkChat'),
		click() {
			config.set('useWorkChat', true);
			app.relaunch();
			app.quit();
		}
	},
	{
		label: 'Switch to Messenger…',
		accelerator: 'CommandOrControl+Shift+1',
		visible: config.get('useWorkChat'),
		click() {
			config.set('useWorkChat', false);
			app.relaunch();
			app.quit();
		}
	},
	{
		label: 'Log Out',
		click() {
			sendAction('log-out');
		}
	}
];

const preferencesSubmenu = [
	{
		label: 'Bounce Dock on Message',
		visible: is.macos,
		type: 'checkbox',
		checked: config.get('bounceDockOnMessage'),
		click() {
			config.set('bounceDockOnMessage', !config.get('bounceDockOnMessage'));
		}
	},
	{
		label: 'Mute Notifications',
		id: 'mute-notifications',
		type: 'checkbox',
		checked: config.get('notificationsMuted'),
		click() {
			sendAction('toggle-mute-notifications');
		}
	},
	{
		label: 'Show Unread Badge',
		type: 'checkbox',
		checked: config.get('showUnreadBadge'),
		click() {
			config.set('showUnreadBadge', !config.get('showUnreadBadge'));
		}
	},
	{
		type: 'checkbox',
		label: 'Block Seen Indicator',
		checked: config.get('block.chatSeen'),
		click(item) {
			config.set('block.chatSeen', item.checked);
		}
	},
	{
		type: 'checkbox',
		label: 'Block Typing Indicator',
		checked: config.get('block.typingIndicator'),
		click(item) {
			config.set('block.typingIndicator', item.checked);
		}
	},
	{
		label: 'Hardware Acceleration (requires restart)',
		type: 'checkbox',
		checked: config.get('hardwareAcceleration'),
		click() {
			config.set('hardwareAcceleration', !config.get('hardwareAcceleration'));
		}
	},
	{
		type: 'checkbox',
		label: 'Always on Top',
		accelerator: 'CommandOrControl+Shift+T',
		checked: config.get('alwaysOnTop'),
		click(item, focusedWindow) {
			config.set('alwaysOnTop', item.checked);
			focusedWindow.setAlwaysOnTop(item.checked);
		}
	},
	{
		label: 'Auto Hide Menu Bar',
		visible: !is.macos,
		type: 'checkbox',
		checked: config.get('autoHideMenuBar'),
		click(item, focusedWindow) {
			config.set('autoHideMenuBar', item.checked);
			focusedWindow.setAutoHideMenuBar(item.checked);
			focusedWindow.setMenuBarVisibility(!item.checked);
		}
	},
	{
		label: 'Flash Window on Message',
		visible: !is.macos,
		type: 'checkbox',
		checked: config.get('flashWindowOnMessage'),
		click(item) {
			config.set('flashWindowOnMessage', item.checked);
		}
	},
	{
		label: 'Launch Minimized',
		visible: !is.macos,
		type: 'checkbox',
		checked: config.get('launchMinimized'),
		click() {
			config.set('launchMinimized', !config.get('launchMinimized'));
		}
	},
	{
		label: 'Quit on Window Close',
		type: 'checkbox',
		checked: config.get('quitOnWindowClose'),
		click() {
			config.set('quitOnWindowClose', !config.get('quitOnWindowClose'));
		}
	}
];

const vibrancySubmenu = [
	{
		label: 'Disabled',
		type: 'radio',
		visible: is.macos,
		checked: config.get('vibrancy') === 'disabled',
		click() {
			config.set('vibrancy', 'disabled');
			sendAction('set-vibrancy-mode');
		}
	}
];

vibrancyConfig.forEach(vconf => {
	vibrancySubmenu.push({
		label: vconf.label,
		type: 'radio',
		visible: is.macos,
		checked: config.get('vibrancy') === vconf.name,
		click() {
			config.set('vibrancy', vconf.name);
			sendAction('set-vibrancy-mode');
		}
	});
});

const viewSubmenu = [
	{
		label: 'Reset Text Size',
		accelerator: 'CommandOrControl+0',
		click() {
			sendAction('zoom-reset');
		}
	},
	{
		label: 'Increase Text Size',
		accelerator: 'CommandOrControl+Plus',
		click() {
			sendAction('zoom-in');
		}
	},
	{
		label: 'Decrease Text Size',
		accelerator: 'CommandOrControl+-',
		click() {
			sendAction('zoom-out');
		}
	},
	{
		type: 'separator'
	},
	{
		label: 'Dark Mode',
		type: 'checkbox',
		checked: config.get('darkMode'),
		accelerator: 'CommandOrControl+D',
		click() {
			config.set('darkMode', !config.get('darkMode'));
			sendAction('set-dark-mode');
		}
	},
	{
		label: 'Vibrancy',
		submenu: vibrancySubmenu
	},
	{
		type: 'separator'
	},
	{
		label: 'Show Sidebar',
		type: 'checkbox',
		checked: !config.get('sidebarHidden'),
		accelerator: 'CommandOrControl+Shift+S',
		click() {
			sendAction('toggle-sidebar');
		}
	},
	{
		label: 'Show Message Buttons',
		type: 'checkbox',
		checked: config.get('showMessageButtons'),
		click() {
			config.set('showMessageButtons', !config.get('showMessageButtons'));
			sendAction('toggle-message-buttons');
		}
	},
	{
		type: 'separator'
	},
	{
		label: 'Show Active Contacts',
		click() {
			sendAction('show-active-contacts-view');
		}
	},
	{
		label: 'Show Message Requests',
		click() {
			sendAction('show-message-requests-view');
		}
	},
	{
		label: 'Show Archived Threads',
		click() {
			sendAction('show-archived-threads-view');
		}
	},
	{
		label: 'Toggle Unread Threads',
		click() {
			sendAction('toggle-unread-threads-view');
		}
	}
];

const conversationSubmenu = [
	{
		label: 'Mute Conversation',
		accelerator: 'CommandOrControl+Shift+M',
		click() {
			sendAction('mute-conversation');
		}
	},
	{
		label: 'Archive Conversation',
		accelerator: 'CommandOrControl+Shift+A',
		click() {
			sendAction('archive-conversation');
		}
	},
	{
		label: 'Delete Conversation',
		accelerator: 'CommandOrControl+Shift+D',
		click() {
			sendAction('delete-conversation');
		}
	},
	{
		type: 'separator'
	},
	{
		label: 'Select Next Conversation',
		accelerator: 'Control+Tab',
		click() {
			sendAction('next-conversation');
		}
	},
	{
		label: 'Select Previous Conversation',
		accelerator: 'Control+Shift+Tab',
		click() {
			sendAction('previous-conversation');
		}
	},
	{
		type: 'separator'
	},
	{
		label: 'Find Conversation',
		accelerator: 'CommandOrControl+K',
		click() {
			sendAction('find');
		}
	},
	{
		label: 'Search in Conversation',
		accelerator: 'CommandOrControl+F',
		click() {
			sendAction('search');
		}
	},
	{
		type: 'separator'
	},
	{
		label: 'Insert GIF',
		accelerator: 'CommandOrControl+G',
		click() {
			sendAction('insert-gif');
		}
	},
	{
		label: 'Insert Emoji',
		accelerator: 'CommandOrControl+E',
		click() {
			sendAction('insert-emoji');
		}
	},
	{
		label: 'Insert Text',
		accelerator: 'CommandOrControl+I',
		click() {
			sendAction('insert-text');
		}
	}
];

const helpSubmenu = [
	openUrlMenuItem({
		label: 'Website',
		url: 'https://sindresorhus.com/caprine'
	}),
	openUrlMenuItem({
		label: 'Source Code',
		url: 'https://github.com/sindresorhus/caprine'
	}),
	openUrlMenuItem({
		label: 'Donate…',
		url: 'https://sindresorhus.com/donate'
	}),
	{
		label: 'Report an Issue…',
		click() {
			const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->


---

${debugInfo()}`;

			openNewGitHubIssue({
				user: 'sindresorhus',
				repo: 'caprine',
				body
			});
		}
	}
];

if (!is.macos) {
	helpSubmenu.push(
		{
			type: 'separator'
		},
		aboutMenuItem({
			icon: path.join(__dirname, 'static/Icon.png'),
			text: 'Created by Sindre Sorhus'
		})
	);
}

const macosTemplate = [
	appMenu([
		{
			label: 'Caprine Preferences',
			submenu: preferencesSubmenu
		},
		{
			label: 'Messenger Preferences…',
			accelerator: 'Command+,',
			click() {
				sendAction('show-preferences');
			}
		},
		{
			type: 'separator'
		},
		...switchItems
	]),
	{
		label: 'File',
		submenu: [
			newConversationItem
		]
	},
	{
		role: 'editMenu'
	},
	{
		label: 'View',
		submenu: viewSubmenu
	},
	{
		label: 'Conversation',
		submenu: conversationSubmenu
	},
	{
		role: 'windowMenu'
	},
	{
		role: 'help',
		submenu: helpSubmenu
	}
];

const linuxWindowsTemplate = [
	{
		label: 'File',
		submenu: [
			newConversationItem,
			{
				type: 'separator'
			},
			{
				label: 'Caprine Settings',
				submenu: preferencesSubmenu
			},
			{
				label: 'Messenger Settings',
				accelerator: 'Control+,',
				click() {
					sendAction('show-preferences');
				}
			},
			{
				type: 'separator'
			},
			...switchItems,
			{
				type: 'separator'
			},
			{
				role: 'quit'
			}
		]
	},
	{
		role: 'editMenu'
	},
	{
		label: 'View',
		submenu: viewSubmenu
	},
	{
		label: 'Conversation',
		submenu: conversationSubmenu
	},
	{
		role: 'help',
		submenu: helpSubmenu
	}
];

const template = is.macos ? macosTemplate : linuxWindowsTemplate;

module.exports = electron.Menu.buildFromTemplate(template);
