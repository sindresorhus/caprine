'use strict';
const path = require('path');
const fs = require('fs');
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
const {sendAction} = require('./util');

const {app, shell} = electron;

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

const advancedSubmenu = [
	{
		label: 'Custom Styles',
		click() {
			const filePath = path.join(app.getPath('userData'), 'custom.css');
			const defaultCustomStyle = `/*
This is the custom styles file where you can add anything you want.
The styles here will be injected into Caprine and will override default styles.
If you want to disable styles but keep the config, just comment the lines that you don't want to be used.

Here are some dark mode color variables to get you started.
Edit them to change color scheme of Caprine.
Press Command/Ctrl+R in Caprine to see your changes.
*/

:root {
	--base: #000;
	--base-ninety: rgba(255, 255, 255, 0.9);
	--base-seventy-five: rgba(255, 255, 255, 0.75);
	--base-seventy: rgba(255, 255, 255, 0.7);
	--base-fifty: rgba(255, 255, 255, 0.5);
	--base-fourty: rgba(255, 255, 255, 0.4);
	--base-thirty: rgba(255, 255, 255, 0.3);
	--base-twenty: rgba(255, 255, 255, 0.2);
	--base-five: rgba(255, 255, 255, 0.05);
	--base-ten: rgba(255, 255, 255, 0.1);
	--base-nine: rgba(255, 255, 255, 0.09);
	--container-color: #323232;
	--container-dark-color: #1e1e1e;
	--list-header-color: #222;
	--blue: #0084ff;
	--selected-conversation-background: linear-gradient(hsla(209, 110%, 45%, 0.9), hsla(209, 110%, 42%, 0.9));
}
`;

			if (!fs.existsSync(filePath)) {
				fs.writeFileSync(filePath, defaultCustomStyle, 'utf8');
			}

			shell.openItem(filePath);
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
		label: 'Use old emoji (requires restart)',
		type: 'checkbox',
		checked: config.get('oldEmoji'),
		click() {
			config.set('oldEmoji', !config.get('oldEmoji'));
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
	},
	{
		type: 'separator'
	},
	{
		label: 'Advanced',
		submenu: advancedSubmenu
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
		label: 'Follow System Appearance',
		type: 'checkbox',
		visible: is.macos,
		checked: config.get('followSystemAppearance'),
		click() {
			config.set('followSystemAppearance', !config.get('followSystemAppearance'));
			sendAction('set-dark-mode');
			const menuItem = menu.getMenuItemById('darkMode');
			menuItem.enabled = !config.get('followSystemAppearance');
		}
	},
	{
		label: 'Dark Mode',
		id: 'darkMode',
		type: 'checkbox',
		checked: config.get('darkMode'),
		enabled: !config.get('followSystemAppearance'),
		accelerator: 'CommandOrControl+D',
		click() {
			config.set('darkMode', !config.get('darkMode'));
			sendAction('set-dark-mode');
		}
	},
	{
		label: 'Full-Window Vibrancy',
		type: 'checkbox',
		visible: is.macos,
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

const menu = electron.Menu.buildFromTemplate(template);

module.exports = menu;
