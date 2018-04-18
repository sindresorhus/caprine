'use strict';
const os = require('os');
const path = require('path');
const electron = require('electron');
const config = require('./config');
const {sendAction} = require('./util');

const {app, shell} = electron;
const appName = app.getName();

const viewSubmenu = [
	{
		label: 'Reset Text Size',
		accelerator: 'CmdOrCtrl+0',
		click() {
			sendAction('zoom-reset');
		}
	},
	{
		label: 'Increase Text Size',
		accelerator: 'CmdOrCtrl+Plus',
		click() {
			sendAction('zoom-in');
		}
	},
	{
		label: 'Decrease Text Size',
		accelerator: 'CmdOrCtrl+-',
		click() {
			sendAction('zoom-out');
		}
	},
	{
		label: 'Toggle Sidebar',
		position: 'endof=toggle',
		accelerator: 'CmdOrCtrl+Shift+S',
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
		label: 'Toggle Dark Mode',
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

const helpSubmenu = [
	{
		label: `Website`,
		click() {
			shell.openExternal('https://sindresorhus.com/caprine');
		}
	},
	{
		label: `Source Code`,
		click() {
			shell.openExternal('https://github.com/sindresorhus/caprine');
		}
	},
	{
		label: `Donate…`,
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

if (process.platform === 'darwin') {
	viewSubmenu.push({
		label: 'Toggle Vibrancy',
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
		label: 'Always on Top',
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
				label: 'Bounce Dock on Message',
				type: 'checkbox',
				checked: config.get('bounceDockOnMessage'),
				click() {
					config.set('bounceDockOnMessage', !config.get('bounceDockOnMessage'));
				}
			},
			{
				label: 'Mute Notifications',
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
				label: 'Preferences…',
				accelerator: 'Cmd+,',
				click() {
					sendAction('show-preferences');
				}
			},
			{
				type: 'separator'
			},
			{
				label: 'Switch to Work Chat…',
				visible: !config.get('useWorkChat'),
				click() {
					config.set('useWorkChat', true);
					app.relaunch();
					app.quit();
				}
			},
			{
				label: 'Switch to Messenger…',
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
		label: 'File',
		submenu: [
			{
				label: 'New Conversation',
				accelerator: 'Cmd+N',
				click() {
					sendAction('new-conversation');
				}
			},
			{
				type: 'separator'
			},
			{
				label: 'Mute Conversation',
				accelerator: 'Cmd+Shift+M',
				click() {
					sendAction('mute-conversation');
				}
			},
			{
				label: 'Archive Conversation',
				accelerator: 'Cmd+Shift+A',
				click() {
					sendAction('archive-conversation');
				}
			},
			{
				label: 'Delete Conversation',
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
		label: 'View',
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
				label: 'Select Next Conversation',
				accelerator: 'Ctrl+Tab',
				click() {
					sendAction('next-conversation');
				}
			},
			{
				label: 'Select Previous Conversation',
				accelerator: 'Ctrl+Shift+Tab',
				click() {
					sendAction('previous-conversation');
				}
			},
			{
				label: 'Find Conversation',
				accelerator: 'Cmd+K',
				click() {
					sendAction('find');
				}
			},
			{
				label: 'Search Conversation',
				accelerator: 'Cmd+F',
				click() {
					sendAction('search');
				}
			},
			{
				label: 'Insert GIF',
				accelerator: 'Cmd+G',
				click() {
					sendAction('insert-gif');
				}
			},
			{
				label: 'Insert Emoji',
				accelerator: 'Cmd+E',
				click() {
					sendAction('insert-emoji');
				}
			},
			{
				label: 'Insert Text',
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
				label: 'Always on Top',
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
		label: 'File',
		submenu: [
			{
				label: 'New Conversation',
				accelerator: 'Ctrl+N',
				click() {
					sendAction('new-conversation');
				}
			},
			{
				type: 'separator'
			},
			{
				label: 'Select Next Conversation',
				accelerator: 'Ctrl+Tab',
				click() {
					sendAction('next-conversation');
				}
			},
			{
				label: 'Select Previous Conversation',
				accelerator: 'Ctrl+Shift+Tab',
				click() {
					sendAction('previous-conversation');
				}
			},
			{
				label: 'Find Conversation',
				accelerator: 'Ctrl+K',
				click() {
					sendAction('find');
				}
			},
			{
				label: 'Search Conversation',
				accelerator: 'Ctrl+F',
				click() {
					sendAction('search');
				}
			},
			{
				label: 'Insert GIF',
				accelerator: 'Ctrl+G',
				click() {
					sendAction('insert-gif');
				}
			},
			{
				label: 'Insert Emoji',
				accelerator: 'Ctrl+E',
				click() {
					sendAction('insert-emoji');
				}
			},
			{
				label: 'Insert Text',
				accelerator: 'Ctrl+I',
				click() {
					sendAction('insert-text');
				}
			},
			{
				type: 'separator'
			},
			{
				label: 'Mute Conversation',
				accelerator: 'Ctrl+Shift+M',
				click() {
					sendAction('mute-conversation');
				}
			},
			{
				label: 'Archive Conversation',
				accelerator: 'Ctrl+Shift+A',
				click() {
					sendAction('archive-conversation');
				}
			},
			{
				label: 'Delete Conversation',
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
				label: 'Flash Window on Message',
				visible: process.platform === 'win32',
				checked: config.get('flashWindowOnMessage'),
				click(item) {
					config.set('flashWindowOnMessage', item.checked);
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
				label: 'Launch Minimized',
				type: 'checkbox',
				checked: config.get('launchMinimized'),
				click() {
					config.set('launchMinimized', !config.get('launchMinimized'));
				}
			},
			{
				label: 'Mute Notifications',
				type: 'checkbox',
				checked: config.get('notificationsMuted'),
				click() {
					sendAction('toggle-mute-notifications');
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
				type: 'checkbox',
				label: 'Auto Hide Menu Bar',
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
				label: 'Switch to Work Chat…',
				visible: !config.get('useWorkChat'),
				click() {
					config.set('useWorkChat', true);
					app.relaunch();
					app.quit();
				}
			},
			{
				label: 'Switch to Messenger…',
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
		label: 'Edit',
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
				label: 'Preferences',
				accelerator: 'Ctrl+,',
				click() {
					sendAction('show-preferences');
				}
			}
		]
	},
	{
		label: 'View',
		submenu: viewSubmenu
	},
	{
		role: 'help',
		submenu: helpSubmenu
	}
];

const tpl = process.platform === 'darwin' ? macosTpl : otherTpl;

module.exports = electron.Menu.buildFromTemplate(tpl);
