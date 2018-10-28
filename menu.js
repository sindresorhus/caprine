'use strict';
const os = require('os');
const path = require('path');
const electron = require('electron');
const config = require('./config');
const {sendAction} = require('./util');

const {app, shell} = electron;
const appName = app.getName();

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
		visible: process.platform === 'darwin',
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
		visible: process.platform !== 'darwin',
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
		visible: process.platform !== 'darwin',
		type: 'checkbox',
		checked: config.get('flashWindowOnMessage'),
		click(item) {
			config.set('flashWindowOnMessage', item.checked);
		}
	},
	{
		label: 'Launch Minimized',
		visible: process.platform !== 'darwin',
		type: 'checkbox',
		checked: config.get('launchMinimized'),
		click() {
			config.set('launchMinimized', !config.get('launchMinimized'));
		}
	},
	{
		label: 'Exit on close',
		type: 'checkbox',
		checked: config.get('exitOnClose'),
		click () {
			config.set('exitOnClose', !config.get('exitOnClose'));
		}
	}
];

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
		type: 'checkbox',
		visible: process.platform === 'darwin',
		checked: config.get('vibrancy'),
		click() {
			sendAction('toggle-vibrancy');
		}
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
		label: 'Search Conversation',
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
	{
		label: 'Website',
		click() {
			shell.openExternal('https://sindresorhus.com/caprine');
		}
	},
	{
		label: 'Source Code',
		click() {
			shell.openExternal('https://github.com/sindresorhus/caprine');
		}
	},
	{
		label: 'Donate…',
		click() {
			shell.openExternal('https://sindresorhus.com/donate');
		}
	},
	{
		label: 'Report an Issue…',
		click() {
			const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->


---

${app.getName()} ${app.getVersion()}
Electron ${process.versions.electron}
${process.platform} ${process.arch} ${os.release()}`;

			shell.openExternal(`https://github.com/sindresorhus/caprine/issues/new?body=${encodeURIComponent(body)}`);
		}
	}
];

if (process.platform !== 'darwin') {
	helpSubmenu.push(
		{
			type: 'separator'
		},
		{
			role: 'about',
			click() {
				electron.dialog.showMessageBox({
					title: `About ${appName}`,
					message: `${appName} ${app.getVersion()}`,
					detail: 'Created by Sindre Sorhus',
					icon: path.join(__dirname, 'static/Icon.png')
				});
			}
		}
	);
}

const macosTemplate = [
	{
		label: appName,
		submenu: [
			{
				role: 'about'
			},
			{
				type: 'separator'
			},
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
			...switchItems,
			{
				type: 'separator'
			},
			{
				role: 'services',
				submenu: []
			},
			{
				type: 'separator'
			},
			{
				role: 'hide'
			},
			{
				role: 'hideothers'
			},
			{
				role: 'unhide'
			},
			{
				type: 'separator'
			},
			{
				role: 'quit'
			}
		]
	},
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

const template = process.platform === 'darwin' ? macosTemplate : linuxWindowsTemplate;

module.exports = electron.Menu.buildFromTemplate(template);
