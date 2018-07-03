'use strict';
const electron = require('electron');
const elementReady = require('element-ready');
const config = require('./config');

const {ipcRenderer: ipc} = electron;

const listSelector = 'div[role="navigation"] > div > ul';
const conversationSelector = '._4u-c._1wfr > ._5f0v.uiScrollableArea';
const selectedConversationSelector = '._5l-3._1ht1._1ht2';

function showSettingsMenu() {
	document.querySelector('._30yy._2fug._p').click();
}

function selectMenuItem(itemNumber) {
	const selector = document.querySelector(`._54nq._2i-c._558b._2n_z li:nth-child(${itemNumber}) a`);
	selector.click();
}

function selectOtherListViews(itemNumber) {
	// In case one of other views is shown
	clickBackButton();

	// Create the menu for the below
	showSettingsMenu();

	selectMenuItem(itemNumber);
}

function clickBackButton() {
	const backButton = document.querySelector('._30yy._2oc9');
	if (backButton) {
		backButton.click();
	}
}

ipc.on('show-preferences', async () => {
	if (isPreferencesOpen()) {
		return;
	}

	await openPreferences();
});

ipc.on('new-conversation', () => {
	document.querySelector('._30yy[data-href$=\'/new\']').click();
});

ipc.on('log-out', () => {
	if (config.get('useWorkChat')) {
		// Create the menu for the below
		document.querySelector('._5lxs._3qct._p').click();
		// Menu creation is slow
		setTimeout(() => {
			const nodes = document.querySelectorAll('._54nq._9jo._558b._2n_z li:last-child a');
			nodes[nodes.length - 1].click();
		}, 250);
	} else {
		showSettingsMenu();
		const nodes = document.querySelectorAll('._54nq._2i-c._558b._2n_z li:last-child a');
		nodes[nodes.length - 1].click();
	}
});

ipc.on('find', () => {
	document.querySelector('._58al').focus();
});

ipc.on('search', () => {
	document.querySelector('._3szn:nth-of-type(1)').click();
});

ipc.on('insert-gif', () => {
	document.querySelector('._yht').click();
});

ipc.on('insert-emoji', () => {
	document.querySelector('._5s2p').click();
});

ipc.on('insert-text', () => {
	document.querySelector('._5rpu').focus();
});

ipc.on('next-conversation', nextConversation);

ipc.on('previous-conversation', previousConversation);

ipc.on('mute-conversation', () => {
	openMuteModal();
});

ipc.on('delete-conversation', () => {
	openDeleteModal();
});

ipc.on('archive-conversation', () => {
	openArchiveModal();
});

function setSidebarVisibility() {
	document.documentElement.classList.toggle('sidebar-hidden', config.get('sidebarHidden'));
	ipc.send('set-sidebar-visibility');
}

ipc.on('toggle-mute-notifications', async (event, defaultStatus) => {
	const preferencesAreOpen = isPreferencesOpen();
	if (!preferencesAreOpen) {
		await openPreferences();
	}

	const notificationCheckbox = document.querySelector('._374b:nth-of-type(4) ._4ng2 input');

	if (defaultStatus === undefined) {
		notificationCheckbox.click();
	} else if ((defaultStatus && notificationCheckbox.checked) || (!defaultStatus && !notificationCheckbox.checked)) {
		notificationCheckbox.click();
	}

	ipc.send('mute-notifications-toggled', !notificationCheckbox.checked);

	if (!preferencesAreOpen) {
		closePreferences();
	}
});

ipc.on('toggle-message-buttons', async () => {
	const messageButtons = await elementReady('._39bj');
	messageButtons.style.display = config.get('showMessageButtons') ? 'flex' : 'none';
});

ipc.on('show-active-contacts-view', () => {
	selectOtherListViews(3);
});

ipc.on('show-message-requests-view', () => {
	selectOtherListViews(4);
});

ipc.on('show-archived-threads-view', () => {
	selectOtherListViews(5);
});

ipc.on('toggle-unread-threads-view', () => {
	selectOtherListViews(6);
});

function setDarkMode() {
	document.documentElement.classList.toggle('dark-mode', config.get('darkMode'));
	/// ipc.send('set-vibrancy');
}

/// function setVibrancy() {
// 	document.documentElement.classList.toggle('vibrancy', config.get('vibrancy'));
// 	ipc.send('set-vibrancy');
// }

function renderOverlayIcon(messageCount) {
	const canvas = document.createElement('canvas');
	canvas.height = 128;
	canvas.width = 128;
	canvas.style.letterSpacing = '-5px';
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#f42020';
	ctx.beginPath();
	ctx.ellipse(64, 64, 64, 64, 0, 0, 2 * Math.PI);
	ctx.fill();
	ctx.textAlign = 'center';
	ctx.fillStyle = 'white';
	ctx.font = '90px sans-serif';
	ctx.fillText(String(Math.min(99, messageCount)), 64, 96);
	return canvas;
}

ipc.on('toggle-sidebar', () => {
	config.set('sidebarHidden', !config.get('sidebarHidden'));
	setSidebarVisibility();
});

ipc.on('set-dark-mode', setDarkMode);

// Disabled because of https://github.com/electron/electron/issues/10886
// and other vibrancy bugs with Electron v2
/// ipc.on('toggle-vibrancy', () => {
// 	config.set('vibrancy', !config.get('vibrancy'));
// 	setVibrancy();

// 	document.documentElement.style.backgroundColor = 'transparent';
// });

ipc.on('render-overlay-icon', (event, messageCount) => {
	ipc.send('update-overlay-icon', renderOverlayIcon(messageCount).toDataURL(), String(messageCount));
});

ipc.on('zoom-reset', () => {
	setZoom(1.0);
});

ipc.on('zoom-in', () => {
	const zoomFactor = config.get('zoomFactor') + 0.1;

	if (zoomFactor < 1.6) {
		setZoom(zoomFactor);
	}
});

ipc.on('zoom-out', () => {
	const zoomFactor = config.get('zoomFactor') - 0.1;

	if (zoomFactor >= 0.8) {
		setZoom(zoomFactor);
	}
});

ipc.on('jump-to-conversation', (event, index) => {
	jumpToConversation(index);
});

function nextConversation() {
	const index = getNextIndex(true);
	selectConversation(index);
}

function previousConversation() {
	const index = getNextIndex(false);
	selectConversation(index);
}

function jumpToConversation(key) {
	const index = key - 1;
	selectConversation(index);
}

// Focus on the conversation with the given index
function selectConversation(index) {
	document.querySelector(listSelector).children[index].firstChild.firstChild.click();
}

// Returns the index of the selected conversation.
// If no conversation is selected, returns null.
function getIndex() {
	const selected = document.querySelector(selectedConversationSelector);
	if (!selected) {
		return null;
	}

	const list = [...selected.parentNode.children];

	return list.indexOf(selected);
}

// Return the index for next node if next is true,
// else returns index for the previous node
function getNextIndex(next) {
	const selected = document.querySelector(selectedConversationSelector);
	if (!selected) {
		return 0;
	}

	const list = [...selected.parentNode.children];
	const index = list.indexOf(selected) + (next ? 1 : -1);

	return ((index % list.length) + list.length) % list.length;
}

function setZoom(zoomFactor) {
	const node = document.getElementById('zoomFactor');
	node.textContent = `${conversationSelector} {zoom: ${zoomFactor} !important}`;
	config.set('zoomFactor', zoomFactor);
}

function openConversationMenu() {
	const index = getIndex();
	if (index === null) {
		return false;
	}

	// Open and close the menu for the below
	const menu = document.querySelectorAll('._2j6._5l-3 ._3d85')[index].firstChild;
	menu.click();

	return true;
}

function openMuteModal() {
	if (!openConversationMenu()) {
		return;
	}

	selectMenuItem(1);
}

function openArchiveModal() {
	if (!openConversationMenu()) {
		return;
	}

	selectMenuItem(3);
}

function openDeleteModal() {
	if (!openConversationMenu()) {
		return;
	}

	selectMenuItem(4);
}

async function openPreferences() {
	// Create the menu for the below
	(await elementReady('._30yy._2fug._p')).click();

	selectMenuItem(1);
}

function isPreferencesOpen() {
	return Boolean(document.querySelector('._3quh._30yy._2t_._5ixy'));
}

function closePreferences() {
	const doneButton = document.querySelector('._3quh._30yy._2t_._5ixy');
	doneButton.click();
}
async function sendConversationList() {
	const sidebar = document.querySelector('[role=navigation]');

	const conversations = await Promise.all(
		[...sidebar.querySelectorAll('._1ht1')]
			.splice(0, 10)
			.map(async el => ({
				label: el.querySelector('._1ht6').textContent,
				selected: el.classList.contains('_1ht2'),
				unread: el.classList.contains('_1ht3'),
				icon: await getDataUrlFromImg(
					el.querySelector('._55lt img'),
					el.classList.contains('_1ht3')
				)
			}))
	);

	ipc.send('conversations', conversations);
}

// Return canvas with rounded image
function urlToCanvas(url, size) {
	return new Promise(resolve => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.addEventListener('load', () => {
			const canvas = document.createElement('canvas');
			const padding = {
				top: 3,
				right: 0,
				bottom: 3,
				left: 0
			};

			canvas.width = size + padding.left + padding.right;
			canvas.height = size + padding.top + padding.bottom;

			const ctx = canvas.getContext('2d');

			ctx.save();
			ctx.beginPath();
			ctx.arc((size / 2) + padding.left, (size / 2) + padding.top, size / 2, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.clip();

			ctx.drawImage(img, padding.left, padding.top, size, size);

			ctx.restore();

			resolve(canvas);
		});
		img.src = url;
	});
}

// Return data url for user avatar
function getDataUrlFromImg(img, unread) {
	return new Promise(async resolve => {
		if (!unread) {
			if (img.dataUrl) {
				return resolve(img.dataUrl);
			}
		} else if (img.dataUnreadUrl) {
			return resolve(img.dataUnreadUrl);
		}

		const canvas = await urlToCanvas(img.src, 30);
		const ctx = canvas.getContext('2d');
		img.dataUrl = canvas.toDataURL();

		if (!unread) {
			return resolve(img.dataUrl);
		}

		const markerSize = 8;
		ctx.fillStyle = '#f42020';
		ctx.beginPath();
		ctx.ellipse(canvas.width - markerSize, markerSize, markerSize, markerSize, 0, 0, 2 * Math.PI);
		ctx.fill();
		img.dataUnreadUrl = canvas.toDataURL();
		resolve(img.dataUnreadUrl);
	});
}

// Inject a global style node to maintain custom appearance after conversation change or startup
document.addEventListener('DOMContentLoaded', () => {
	const style = document.createElement('style');
	style.id = 'zoomFactor';
	document.body.appendChild(style);

	// Set the zoom factor if it was set before quitting
	const zoomFactor = config.get('zoomFactor') || 1.0;
	setZoom(zoomFactor);

	// Enable OS specific styles
	document.documentElement.classList.add(`os-${process.platform}`);

	// Hide sidebar if it was hidden before quitting
	setSidebarVisibility();

	// Activate Dark Mode if it was set before quitting
	setDarkMode();

	// Prevent flash of white on startup when in dark mode
	// TODO: find a CSS-only solution
	if (config.get('darkMode')) {
		document.documentElement.style.backgroundColor = '#192633';
	}

	// Activate vibrancy effect if it was set before quitting
	// setVibrancy();
});

window.addEventListener('load', () => {
	const sidebar = document.querySelector('[role=navigation]');

	sendConversationList();

	const conversationListObserver = new MutationObserver(sendConversationList);
	conversationListObserver.observe(sidebar, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: ['class']
	});
});

// It's not possible to add multiple accelerators
// so this needs to be done the old-school way
document.addEventListener('keydown', event => {
	const combineKey = process.platform === 'darwin' ? event.metaKey : event.ctrlKey;

	if (!combineKey) {
		return;
	}

	if (event.key === ']') {
		nextConversation();
	}

	if (event.key === '[') {
		previousConversation();
	}

	const num = parseInt(event.key, 10);

	if (num >= 1 && num <= 9) {
		jumpToConversation(num);
	}
});
