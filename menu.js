'use strict';
const os = require('os');
const app = require('app');
const Menu = require('menu');
const BrowserWindow = require('browser-window');
const shell = require('shell');
const appName = app.getName();

function sendAction(action) {
	BrowserWindow.getFocusedWindow().webContents.send(action);
}

const tpl = [
	{
		label: 'File',
		submenu: [
			{
				label: 'New Conversation',
				accelerator: 'CmdOrCtrl+N',
				click() {
					sendAction('new-conversation');
				}
			}
		]
	},
	{
		label: 'Edit',
		submenu: [
			{
				label: 'Undo',
				accelerator: 'CmdOrCtrl+Z',
				role: 'undo'
			},
			{
				label: 'Redo',
				accelerator: 'Shift+CmdOrCtrl+Z',
				role: 'redo'
			},
			{
				type: 'separator'
			},
			{
				label: 'Cut',
				accelerator: 'CmdOrCtrl+X',
				role: 'cut'
			},
			{
				label: 'Copy',
				accelerator: 'CmdOrCtrl+C',
				role: 'copy'
			},
			{
				label: 'Paste',
				accelerator: 'CmdOrCtrl+V',
				role: 'paste'
			},
			{
				label: 'Select All',
				accelerator: 'CmdOrCtrl+A',
				role: 'selectall'
			}
		]
	},
	{
		label: 'Window',
		role: 'window',
		submenu: [
			{
				label: 'Minimize',
				accelerator: 'CmdOrCtrl+M',
				role: 'minimize'
			},
			{
				label: 'Close',
				accelerator: 'CmdOrCtrl+W',
				role: 'close'
			}
		]
	},
	{
		label: 'Help',
		role: 'help',
		submenu: [
			{
				label: 'Website',
				click() {
					shell.openExternal('https://github.com/sindresorhus/caprine');
				}
			},
			{
				label: 'Report Issue',
				click() {
					const body = `
**Please succinctly describe your issue and steps to reproduce it.**

-

${app.getName()} ${app.getVersion()}
${process.platform} ${process.arch} ${os.release()}`;

					shell.openExternal(`https://github.com/sindresorhus/caprine/issues/new?body=${encodeURIComponent(body)}`);
				}
			}
		]
	}
];

const appMenu = [
	{
		label: `About ${appName}`,
		role: 'about'
	},
	{
		type: 'separator'
	},
	{
		label: 'Preferences...',
		accelerator: 'CmdOrCtrl+,',
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
	}
];

if (process.platform === 'darwin') {
	// add primary menu with app name
	tpl.unshift({
		label: appName,
		submenu: appMenu
	});

	// add OS X-only hide options
	tpl[0].submenu.push([{
		type: 'separator'
	},
	{
		label: `Hide ${appName}`,
		accelerator: 'CmdOrCtrl+H',
		role: 'hide'
	},
	{
		label: 'Hide Others',
		accelerator: 'CmdOrCtrl+Shift+H',
		role: 'hideothers'
	},
	{
		label: 'Show All',
		role: 'unhide'
	}]);

	tpl[3].submenu.push(
		{
			type: 'separator'
		},
		{
			label: 'Bring All to Front',
			role: 'front'
		}
	);
} else {
	// add main menu items to File menu
	tpl[0].submenu = tpl[0].submenu.concat(appMenu);
}

// add quit to either app menu or File
tpl[0].submenu.push(
	{
		type: 'separator'
	},
	{
		label: `Quit ${appName}`,
		accelerator: 'CmdOrCtrl+Q',
		click() {
			app.quit();
		}
	}
);

module.exports = Menu.buildFromTemplate(tpl);
