import * as path from 'path';
import {existsSync, writeFileSync} from 'fs';
import {app, shell, Menu, MenuItemConstructorOptions, dialog} from 'electron';
import {
	is,
	appMenu,
	openUrlMenuItem,
	aboutMenuItem,
	openNewGitHubIssue,
	debugInfo
} from 'electron-util';
import config from './config';
import getSpellCheckerLanguages from './spell-checker';
import {sendAction, showRestartDialog, getWindow, toggleTrayIcon, toggleLaunchMinimized} from './util';
import {generateSubmenu as generateEmojiSubmenu} from './emoji';
import {toggleMenuBarMode} from './menu-bar-mode';
import {caprineIconPath} from './constants';

export default async function updateMenu(): Promise<Menu> {
	const newConversationItem: MenuItemConstructorOptions = {
		label: 'New Conversation',
		accelerator: 'CommandOrControl+N',
		click() {
			sendAction('new-conversation');
		}
	};

	const switchItems: MenuItemConstructorOptions[] = [
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

	const vibrancySubmenu: MenuItemConstructorOptions[] = [
		{
			label: 'No Vibrancy',
			type: 'checkbox',
			checked: config.get('vibrancy') === 'none',
			async click() {
				config.set('vibrancy', 'none');
				sendAction('update-vibrancy');
				await updateMenu();
			}
		},
		{
			label: 'Sidebar-only Vibrancy',
			type: 'checkbox',
			checked: config.get('vibrancy') === 'sidebar',
			async click() {
				config.set('vibrancy', 'sidebar');
				sendAction('update-vibrancy');
				await updateMenu();
			}
		},
		{
			label: 'Full-window Vibrancy',
			type: 'checkbox',
			checked: config.get('vibrancy') === 'full',
			async click() {
				config.set('vibrancy', 'full');
				sendAction('update-vibrancy');
				await updateMenu();
			}
		}
	];

	const sidebarSubmenu: MenuItemConstructorOptions[] = [
		{
			label: 'Adaptive Sidebar',
			type: 'checkbox',
			checked: config.get('sidebar') === 'default',
			async click() {
				config.set('sidebar', 'default');
				sendAction('update-sidebar');
				await updateMenu();
			}
		},
		{
			label: 'Hide Sidebar',
			type: 'checkbox',
			checked: config.get('sidebar') === 'hidden',
			accelerator: 'CommandOrControl+Shift+S',
			async click() {
				// Toggle between default and hidden
				config.set('sidebar', config.get('sidebar') === 'hidden' ? 'default' : 'hidden');
				sendAction('update-sidebar');
				await updateMenu();
			}
		},
		{
			label: 'Narrow Sidebar',
			type: 'checkbox',
			checked: config.get('sidebar') === 'narrow',
			async click() {
				config.set('sidebar', 'narrow');
				sendAction('update-sidebar');
				await updateMenu();
			}
		},
		{
			label: 'Wide Sidebar',
			type: 'checkbox',
			checked: config.get('sidebar') === 'wide',
			async click() {
				config.set('sidebar', 'wide');
				sendAction('update-sidebar');
				await updateMenu();
			}
		}
	];

	const privacySubmenu: MenuItemConstructorOptions[] = [
		{
			label: 'Block Seen Indicator',
			type: 'checkbox',
			checked: config.get('block.chatSeen' as any),
			click(menuItem) {
				config.set('block.chatSeen' as any, menuItem.checked);
			}
		},
		{
			label: 'Block Typing Indicator',
			type: 'checkbox',
			checked: config.get('block.typingIndicator' as any),
			click(menuItem) {
				config.set('block.typingIndicator' as any, menuItem.checked);
			}
		},
		{
			label: 'Block Delivery Receipts',
			type: 'checkbox',
			checked: config.get('block.deliveryReceipt' as any),
			click(menuItem) {
				config.set('block.deliveryReceipt' as any, menuItem.checked);
			}
		}
	];

	const advancedSubmenu: MenuItemConstructorOptions[] = [
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

				if (!existsSync(filePath)) {
					writeFileSync(filePath, defaultCustomStyle, 'utf8');
				}

				shell.openPath(filePath);
			}
		}
	];

	const preferencesSubmenu: MenuItemConstructorOptions[] = [
		{
			label: 'Privacy',
			submenu: privacySubmenu
		},
		{
			label: 'Emoji Style',
			submenu: await generateEmojiSubmenu(updateMenu)
		},
		{
			label: 'Bounce Dock on Message',
			type: 'checkbox',
			visible: is.macos,
			checked: config.get('bounceDockOnMessage'),
			click() {
				config.set('bounceDockOnMessage', !config.get('bounceDockOnMessage'));
			}
		},
		{
			label: 'Autoplay Videos',
			id: 'video-autoplay',
			type: 'checkbox',
			checked: config.get('autoplayVideos'),
			click() {
				config.set('autoplayVideos', !config.get('autoplayVideos'));
				sendAction('toggle-video-autoplay');
			}
		},
		{
			label: 'Show Message Preview in Notifications',
			type: 'checkbox',
			checked: config.get('notificationMessagePreview'),
			click(menuItem) {
				config.set('notificationMessagePreview', menuItem.checked);
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
			label: 'Mute Call Ringtone',
			type: 'checkbox',
			checked: config.get('callRingtoneMuted'),
			click() {
				config.set('callRingtoneMuted', !config.get('callRingtoneMuted'));
			}
		},
		{
			label: 'Show Unread Badge',
			type: 'checkbox',
			checked: config.get('showUnreadBadge'),
			click() {
				config.set('showUnreadBadge', !config.get('showUnreadBadge'));
				sendAction('reload');
			}
		},
		{
			label: 'Spell Checker',
			type: 'checkbox',
			checked: config.get('isSpellCheckerEnabled'),
			click() {
				config.set('isSpellCheckerEnabled', !config.get('isSpellCheckerEnabled'));
				showRestartDialog('Caprine needs to be restarted to enable or disable the spell checker.');
			}
		},
		{
			label: 'Hardware Acceleration',
			type: 'checkbox',
			checked: config.get('hardwareAcceleration'),
			click() {
				config.set('hardwareAcceleration', !config.get('hardwareAcceleration'));
				showRestartDialog('Caprine needs to be restarted to change hardware acceleration.');
			}
		},
		{
			label: 'Show Menu Bar Icon',
			id: 'menuBarMode',
			type: 'checkbox',
			visible: is.macos,
			checked: config.get('menuBarMode'),
			click() {
				config.set('menuBarMode', !config.get('menuBarMode'));
				toggleMenuBarMode(getWindow());
			}
		},
		{
			label: 'Always on Top',
			id: 'always-on-top',
			type: 'checkbox',
			accelerator: 'CommandOrControl+Shift+T',
			checked: config.get('alwaysOnTop'),
			click(menuItem, focusedWindow) {
				config.set('alwaysOnTop', menuItem.checked);
				focusedWindow.setAlwaysOnTop(menuItem.checked);
			}
		},
		{
			label: 'Launch at Login',
			visible: is.macos || is.windows,
			type: 'checkbox',
			checked: app.getLoginItemSettings().openAtLogin,
			click(menuItem) {
				app.setLoginItemSettings({
					openAtLogin: menuItem.checked,
					openAsHidden: menuItem.checked
				});
			}
		},
		{
			label: 'Auto Hide Menu Bar',
			type: 'checkbox',
			visible: !is.macos,
			checked: config.get('autoHideMenuBar'),
			click(menuItem, focusedWindow) {
				config.set('autoHideMenuBar', menuItem.checked);
				focusedWindow.setAutoHideMenuBar(menuItem.checked);
				focusedWindow.setMenuBarVisibility(!menuItem.checked);

				if (menuItem.checked) {
					dialog.showMessageBox({
						type: 'info',
						message: 'Press the Alt key to toggle the menu bar.',
						buttons: ['OK']
					});
				}
			}
		},
		{
			label: 'Flash Window on Message',
			type: 'checkbox',
			visible: !is.macos,
			checked: config.get('flashWindowOnMessage'),
			click(menuItem) {
				config.set('flashWindowOnMessage', menuItem.checked);
			}
		},
		{
			id: 'showTrayIcon',
			label: 'Show Tray Icon',
			type: 'checkbox',
			enabled: (is.linux || is.windows) && !config.get('launchMinimized'),
			checked: config.get('showTrayIcon'),
			click() {
				toggleTrayIcon();
			}
		},
		{
			label: 'Launch Minimized',
			type: 'checkbox',
			visible: !is.macos,
			checked: config.get('launchMinimized'),
			click() {
				toggleLaunchMinimized(menu);
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

	const viewSubmenu: MenuItemConstructorOptions[] = [
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
			async click() {
				config.set('followSystemAppearance', !config.get('followSystemAppearance'));
				sendAction('set-dark-mode');
				await updateMenu();
			}
		},
		{
			label: 'Dark Mode',
			id: 'darkMode',
			type: 'checkbox',
			checked: config.get('darkMode'),
			enabled: !is.macos || !config.get('followSystemAppearance'),
			accelerator: 'CommandOrControl+D',
			click() {
				config.set('darkMode', !config.get('darkMode'));
				sendAction('set-dark-mode');
			}
		},
		{
			label: 'Vibrancy',
			visible: is.macos,
			submenu: vibrancySubmenu
		},
		{
			type: 'separator'
		},
		{
			label: 'Hide Names and Avatars',
			id: 'privateMode',
			type: 'checkbox',
			checked: config.get('privateMode'),
			accelerator: 'CommandOrControl+Shift+N',
			async click(menuItem, _browserWindow, event) {
				if (!config.get('privateMode') && config.get('showPrivateModePrompt') && event.shiftKey) {
					const result = await dialog.showMessageBox(_browserWindow, {
						message: 'Are you sure you want to hide names and avatars?',
						detail: 'This was triggered by Command/Control+Shift+N.',
						buttons: [
							'Hide',
							'Don\'t Hide'
						],
						defaultId: 0,
						cancelId: 1,
						checkboxLabel: 'Don\'t ask me again'
					});

					config.set('showPrivateModePrompt', !result.checkboxChecked);

					if (result.response === 0) {
						config.set('privateMode', !config.get('privateMode'));
						sendAction('set-private-mode');
					} else if (result.response === 1) {
						menuItem.checked = false;
					}
				} else {
					config.set('privateMode', !config.get('privateMode'));
					sendAction('set-private-mode');
				}
			}
		},
		{
			type: 'separator'
		},
		{
			label: 'Sidebar',
			submenu: sidebarSubmenu
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
			label: 'Show Hidden Threads',
			click() {
				sendAction('show-hidden-threads-view');
			}
		},
		{
			label: 'Toggle Unread Threads',
			click() {
				sendAction('toggle-unread-threads-view');
			}
		}
	];

	const spellCheckerSubmenu: MenuItemConstructorOptions[] = getSpellCheckerLanguages();

	const conversationSubmenu: MenuItemConstructorOptions[] = [
		{
			label: 'Mute Conversation',
			accelerator: 'CommandOrControl+Shift+M',
			click() {
				sendAction('mute-conversation');
			}
		},
		{
			label: 'Hide Conversation',
			accelerator: 'CommandOrControl+Shift+H',
			click() {
				sendAction('hide-conversation');
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
			label: 'Insert Sticker',
			accelerator: 'CommandOrControl+S',
			click() {
				sendAction('insert-sticker');
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
			label: 'Attach Files',
			accelerator: 'CommandOrControl+T',
			click() {
				sendAction('attach-files');
			}
		},
		{
			label: 'Focus Text Input',
			accelerator: 'CommandOrControl+I',
			click() {
				sendAction('focus-text-input');
			}
		},
		{
			type: 'separator'
		},
		{
			label: 'Spell Checker Language',
			visible: !is.macos && config.get('isSpellCheckerEnabled'),
			submenu: spellCheckerSubmenu
		}
	];

	const helpSubmenu: MenuItemConstructorOptions[] = [
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
			url: 'https://github.com/sindresorhus/caprine?sponsor=1'
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
				icon: caprineIconPath,
				text: 'Created by Sindre Sorhus'
			})
		);
	}

	const debugSubmenu: MenuItemConstructorOptions[] = [
		{
			label: 'Show Settings',
			click() {
				config.openInEditor();
			}
		},
		{
			label: 'Show App Data',
			click() {
				shell.openPath(app.getPath('userData'));
			}
		},
		{
			type: 'separator'
		},
		{
			label: 'Delete Settings',
			click() {
				config.clear();
				app.relaunch();
				app.quit();
			}
		},
		{
			label: 'Delete App Data',
			click() {
				shell.moveItemToTrash(app.getPath('userData'));
				app.relaunch();
				app.quit();
			}
		}
	];

	const macosTemplate: MenuItemConstructorOptions[] = [
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
			role: 'fileMenu',
			submenu: [
				newConversationItem,
				{
					type: 'separator'
				},
				{
					role: 'close'
				}
			]
		},
		{
			role: 'editMenu'
		},
		{
			role: 'viewMenu',
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

	const linuxWindowsTemplate: MenuItemConstructorOptions[] = [
		{
			role: 'fileMenu',
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
			role: 'viewMenu',
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

	if (is.development) {
		template.push({
			label: 'Debug',
			submenu: debugSubmenu
		});
	}

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);

	return menu;
}
