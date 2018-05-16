'use strict';
const os = require('os');
const path = require('path');
const electron = require('electron');
const config = require('./config');
const {sendAction} = require('./util');
const i18n = require('./i18n')

const {app, shell} = electron;
const appName = app.getName();

const viewSubmenu = [
	{
		label: i18n._('Reset Text Size'),
		accelerator: 'CmdOrCtrl+0',
		click() {
			sendAction('zoom-reset');
		}
	},
	{
		label: i18n._('Increase Text Size'),
		accelerator: 'CmdOrCtrl+Plus',
		click() {
			sendAction('zoom-in');
		}
	},
	{
		label: i18n._('Decrease Text Size'),
		accelerator: 'CmdOrCtrl+-',
		click() {
			sendAction('zoom-out');
		}
	},
	{
		label: i18n._('Toggle Sidebar'),
		position: 'endof=toggle',
		accelerator: 'CmdOrCtrl+Shift+S',
		click() {
			sendAction('toggle-sidebar');
		}
	},
	{
		label: i18n._('Show Message Buttons'),
		type: 'checkbox',
		checked: config.get('showMessageButtons'),
		click() {
			config.set('showMessageButtons', !config.get('showMessageButtons'));
			sendAction('toggle-message-buttons');
		}
	},
	{
		label: i18n._('Toggle Dark Mode'),
		position: 'endof=toggle',
		accelerator: 'CmdOrCtrl+D',
		click() {
			sendAction('toggle-dark-mode');
		}
	},
	{
		type: 'separator'
	},
	{
		label: i18n._('Show Active Contacts'),
		click() {
			sendAction('show-active-contacts-view');
		}
	},
	{
		label: i18n._('Show Message Requests'),
		click() {
			sendAction('show-message-requests-view');
		}
	},
	{
		label: i18n._('Show Archived Threads'),
		click() {
			sendAction('show-archived-threads-view');
		}
	},
	{
		label: i18n._('Toggle Unread Threads'),
		click() {
			sendAction('toggle-unread-threads-view');
		}
	}
];

const helpSubmenu = [
	{
		label: i18n._(`Website`),
		click() {
			shell.openExternal('https://sindresorhus.com/caprine');
		}
	},
	{
		label: i18n._(`Source Code`),
		click() {
			shell.openExternal('https://github.com/sindresorhus/caprine');
		}
	},
	{
		label: i18n._(`Donate…`),
		click() {
			shell.openExternal('https://sindresorhus.com/donate');
		}
	},
	{
		label: i18n._('Report an Issue…'),
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

if (process.platform === 'darwin') {
	viewSubmenu.push({
		label: i18n._('Toggle Vibrancy'),
		position: 'endof=toggle',
		click() {
			sendAction('toggle-vibrancy');
		}
	});
} else {
	helpSubmenu.push({
		type: 'separator'
	}, {
		role: 'about',
		click() {
			electron.dialog.showMessageBox({
				title: `About ${appName}`,
				message: `${appName} ${app.getVersion()}`,
				detail: 'Created by Sindre Sorhus',
				icon: path.join(__dirname, 'static/Icon.png')
			});
		}
	});

	viewSubmenu.push({
		type: 'separator'
	}, {
		type: 'checkbox',
		label: i18n._('Always on Top'),
		accelerator: 'Ctrl+Shift+T',
		checked: config.get('alwaysOnTop'),
		click(item, focusedWindow) {
			config.set('alwaysOnTop', item.checked);
			focusedWindow.setAlwaysOnTop(item.checked);
		}
	});
}

const macosTpl = [
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
				label: i18n._('Bounce Dock on Message'),
				type: 'checkbox',
				checked: config.get('bounceDockOnMessage'),
				click() {
					config.set('bounceDockOnMessage', !config.get('bounceDockOnMessage'));
				}
			},
			{
				label: i18n._('Mute Notifications'),
				type: 'checkbox',
				checked: config.get('notificationsMuted'),
				click() {
					sendAction('toggle-mute-notifications');
				}
			},
			{
				label: i18n._('Show Unread Badge'),
				type: 'checkbox',
				checked: config.get('showUnreadBadge'),
				click() {
					config.set('showUnreadBadge', !config.get('showUnreadBadge'));
				}
			},
			{
				type: 'checkbox',
				label: i18n._('Block Seen Indicator'),
				checked: config.get('block.chatSeen'),
				click(item) {
					config.set('block.chatSeen', item.checked);
				}
			},
			{
				type: 'checkbox',
				label: i18n._('Block Typing Indicator'),
				checked: config.get('block.typingIndicator'),
				click(item) {
					config.set('block.typingIndicator', item.checked);
				}
			},
			{
				label: i18n._('Preferences…'),
				accelerator: 'Cmd+,',
				click() {
					sendAction('show-preferences');
				}
			},
			{
				type: 'separator'
			},
			{
				label: i18n._('Switch to Work Chat…'),
				visible: !config.get('useWorkChat'),
				click() {
					config.set('useWorkChat', true);
					app.relaunch();
					app.quit();
				}
			},
			{
				label: i18n._('Switch to Messenger…'),
				visible: config.get('useWorkChat'),
				click() {
					config.set('useWorkChat', false);
					app.relaunch();
					app.quit();
				}
			},
			{
				label: i18n._('Log Out'),
				click() {
					sendAction('log-out');
				}
			},
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
		label: i18n._('File'),
		submenu: [
			{
				label: i18n._('New Conversation'),
				accelerator: 'Cmd+N',
				click() {
					sendAction('new-conversation');
				}
			},
			{
				type: 'separator'
			},
			{
				label: i18n._('Mute Conversation'),
				accelerator: 'Cmd+Shift+M',
				click() {
					sendAction('mute-conversation');
				}
			},
			{
				label: i18n._('Archive Conversation'),
				accelerator: 'Cmd+Shift+A',
				click() {
					sendAction('archive-conversation');
				}
			},
			{
				label: i18n._('Delete Conversation'),
				accelerator: 'Cmd+Shift+D',
				click() {
					sendAction('delete-conversation');
				}
			}
		]
	},
	{
		role: 'editMenu'
	},
	{
		label: i18n._('View'),
		submenu: viewSubmenu
	},
	{
		role: 'window',
		submenu: [
			{
				role: 'minimize'
			},
			{
				role: 'close'
			},
			{
				type: 'separator'
			},
			{
				label: i18n._('Select Next Conversation'),
				accelerator: 'Ctrl+Tab',
				click() {
					sendAction('next-conversation');
				}
			},
			{
				label: i18n._('Select Previous Conversation'),
				accelerator: 'Ctrl+Shift+Tab',
				click() {
					sendAction('previous-conversation');
				}
			},
			{
				label: i18n._('Find Conversation'),
				accelerator: 'Cmd+K',
				click() {
					sendAction('find');
				}
			},
			{
				label: i18n._('Search Conversation'),
				accelerator: 'Cmd+F',
				click() {
					sendAction('search');
				}
			},
			{
				label: i18n._('Insert GIF'),
				accelerator: 'Cmd+G',
				click() {
					sendAction('insert-gif');
				}
			},
			{
				label: i18n._('Insert Emoji'),
				accelerator: 'Cmd+E',
				click() {
					sendAction('insert-emoji');
				}
			},
			{
				label: i18n._('Insert Text'),
				accelerator: 'Cmd+I',
				click() {
					sendAction('insert-text');
				}
			},
			{
				type: 'separator'
			},
			{
				role: 'front'
			},
			{
				role: 'togglefullscreen'
			},
			{
				type: 'separator'
			},
			{
				type: 'checkbox',
				label: i18n._('Always on Top'),
				accelerator: 'Cmd+Shift+T',
				checked: config.get('alwaysOnTop'),
				click(item, focusedWindow) {
					config.set('alwaysOnTop', item.checked);
					focusedWindow.setAlwaysOnTop(item.checked);
				}
			}
		]
	},
	{
		role: 'help',
		submenu: helpSubmenu
	}
];

const otherTpl = [
	{
		label: i18n._('File'),
		submenu: [
			{
				label: i18n._('New Conversation'),
				accelerator: 'Ctrl+N',
				click() {
					sendAction('new-conversation');
				}
			},
			{
				type: 'separator'
			},
			{
				label: i18n._('Select Next Conversation'),
				accelerator: 'Ctrl+Tab',
				click() {
					sendAction('next-conversation');
				}
			},
			{
				label: i18n._('Select Previous Conversation'),
				accelerator: 'Ctrl+Shift+Tab',
				click() {
					sendAction('previous-conversation');
				}
			},
			{
				label: i18n._('Find Conversation'),
				accelerator: 'Ctrl+K',
				click() {
					sendAction('find');
				}
			},
			{
				label: i18n._('Search Conversation'),
				accelerator: 'Ctrl+F',
				click() {
					sendAction('search');
				}
			},
			{
				label: i18n._('Insert GIF'),
				accelerator: 'Ctrl+G',
				click() {
					sendAction('insert-gif');
				}
			},
			{
				label: i18n._('Insert Emoji'),
				accelerator: 'Ctrl+E',
				click() {
					sendAction('insert-emoji');
				}
			},
			{
				label: i18n._('Insert Text'),
				accelerator: 'Ctrl+I',
				click() {
					sendAction('insert-text');
				}
			},
			{
				type: 'separator'
			},
			{
				label: i18n._('Mute Conversation'),
				accelerator: 'Ctrl+Shift+M',
				click() {
					sendAction('mute-conversation');
				}
			},
			{
				label: i18n._('Archive Conversation'),
				accelerator: 'Ctrl+Shift+A',
				click() {
					sendAction('archive-conversation');
				}
			},
			{
				label: i18n._('Delete Conversation'),
				accelerator: 'Ctrl+Shift+D',
				click() {
					sendAction('delete-conversation');
				}
			},
			{
				type: 'separator'
			},
			{
				type: 'checkbox',
				label: i18n._('Flash Window on Message'),
				visible: process.platform === 'win32',
				checked: config.get('flashWindowOnMessage'),
				click(item) {
					config.set('flashWindowOnMessage', item.checked);
				}
			},
			{
				label: i18n._('Show Unread Badge'),
				type: 'checkbox',
				checked: config.get('showUnreadBadge'),
				click() {
					config.set('showUnreadBadge', !config.get('showUnreadBadge'));
				}
			},
			{
				label: i18n._('Launch Minimized'),
				type: 'checkbox',
				checked: config.get('launchMinimized'),
				click() {
					config.set('launchMinimized', !config.get('launchMinimized'));
				}
			},
			{
				label: i18n._('Mute Notifications'),
				type: 'checkbox',
				checked: config.get('notificationsMuted'),
				click() {
					sendAction('toggle-mute-notifications');
				}
			},
			{
				type: 'checkbox',
				label: i18n._('Block Seen Indicator'),
				checked: config.get('block.chatSeen'),
				click(item) {
					config.set('block.chatSeen', item.checked);
				}
			},
			{
				type: 'checkbox',
				label: i18n._('Block Typing Indicator'),
				checked: config.get('block.typingIndicator'),
				click(item) {
					config.set('block.typingIndicator', item.checked);
				}
			},
			{
				type: 'checkbox',
				label: i18n._('Auto Hide Menu Bar'),
				checked: config.get('autoHideMenuBar'),
				click(item, focusedWindow) {
					config.set('autoHideMenuBar', item.checked);
					focusedWindow.setAutoHideMenuBar(item.checked);
					focusedWindow.setMenuBarVisibility(!item.checked);
				}
			},
			{
				type: 'separator'
			},
			{
				label: i18n._('Switch to Work Chat…'),
				visible: !config.get('useWorkChat'),
				click() {
					config.set('useWorkChat', true);
					app.relaunch();
					app.quit();
				}
			},
			{
				label: i18n._('Switch to Messenger…'),
				visible: config.get('useWorkChat'),
				click() {
					config.set('useWorkChat', false);
					app.relaunch();
					app.quit();
				}
			},
			{
				label: i18n._('Log Out'),
				click() {
					sendAction('log-out');
				}
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
		label: i18n._('Edit'),
		submenu: [
			{
				role: 'undo'
			},
			{
				role: 'redo'
			},
			{
				type: 'separator'
			},
			{
				role: 'cut'
			},
			{
				role: 'copy'
			},
			{
				role: 'paste'
			},
			{
				role: 'delete'
			},
			{
				type: 'separator'
			},
			{
				role: 'selectall'
			},
			{
				type: 'separator'
			},
			{
				label: i18n._('Preferences'),
				accelerator: 'Ctrl+,',
				click() {
					sendAction('show-preferences');
				}
			}
		]
	},
	{
		label: i18n._('View'),
		submenu: viewSubmenu
	},
	{
		role: 'help',
		submenu: helpSubmenu
	}
];

const tpl = process.platform === 'darwin' ? macosTpl : otherTpl;

module.exports = electron.Menu.buildFromTemplate(tpl);
