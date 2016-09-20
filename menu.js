'use strict';
const os = require('os');
const path = require('path');
const electron = require('electron');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const shell = electron.shell;
const appName = app.getName();

function sendAction(action) {
	const win = BrowserWindow.getAllWindows()[0];

	if (process.platform === 'darwin') {
		win.restore();
	}

	win.webContents.send(action);
}

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
	}
];

const helpSubmenu = [
	{
		label: `${appName} Website`,
		click() {
			shell.openExternal('https://github.com/sindresorhus/caprine');
		}
	},
	{
		label: 'Report an Issue...',
		click() {
			const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->

-

${app.getName()} ${app.getVersion()}
Electron ${process.versions.electron}
${process.platform} ${process.arch} ${os.release()}`;

			shell.openExternal(`https://github.com/sindresorhus/caprine/issues/new?body=${encodeURIComponent(body)}`);
		}
	}
];

if (process.platform !== 'darwin') {
	helpSubmenu.push({
		type: 'separator'
	}, {
		role: 'about',
		click() {
			electron.dialog.showMessageBox({
				title: `About ${appName}`,
				message: `${appName} ${app.getVersion()}`,
				detail: 'Created by Sindre Sorhus',
				icon: path.join(__dirname, 'static/Icon.png'),
				buttons: []
			});
		}
	});
}

const darwinTpl = [
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
				label: 'Toggle Dark Mode',
				accelerator: 'Cmd+D',
				click() {
					sendAction('toggle-dark-mode');
				}
			},
			{
				label: 'Preferences...',
				accelerator: 'Cmd+,',
				click() {
					sendAction('show-preferences');
				}
			},
			{
				type: 'separator'
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
				role: 'pasteandmatchstyle'
			},
			{
				role: 'delete'
			},
			{
				role: 'selectall'
			}
		]
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
				accelerator: 'Cmd+F',
				click() {
					sendAction('find');
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
				label: 'Toggle Dark Mode',
				accelerator: 'Ctrl+D',
				click() {
					sendAction('toggle-dark-mode');
				}
			},
			{
				type: 'separator'
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
				role: 'pasteandmatchstyle'
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

const tpl = process.platform === 'darwin' ? darwinTpl : otherTpl;

module.exports = electron.Menu.buildFromTemplate(tpl);
