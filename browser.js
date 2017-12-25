'use strict';
const electron = require('electron');
const config = require('./config');

const {ipcRenderer: ipc} = electron;

const listSelector = 'div[role="navigation"] > div > ul';
const conversationSelector = '._4u-c._1wfr > ._5f0v.uiScrollableArea';
const selectedConversationSelector = '._5l-3._1ht1._1ht2';

ipc.on('show-preferences', () => {
	if (isPreferencesOpen()) {
		return;
	}

	openPreferences();
});

ipc.on('new-conversation', () => {
	document.querySelector('._30yy[href=\'/new\']').click();
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
		document.querySelector('._30yy._2fug._p').click();
		const nodes = document.querySelectorAll('._54nq._2i-c._558b._2n_z li:last-child a');
		nodes[nodes.length - 1].click();
	}
});

ipc.on('find', () => {
	document.querySelector('._58al').focus();
});

ipc.on('insert-gif', () => {
	document.querySelector('._yht').click();
});

ipc.on('insert-emoji', () => {
	document.querySelector('._5s2p').click();
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

ipc.on('toggle-mute-notifications', (event, defaultStatus) => {
	const wasPreferencesOpen = isPreferencesOpen();

	if (!wasPreferencesOpen) {
		openPreferences();
	}

	const notificationCheckbox = document.querySelector('._374b:nth-of-type(3) ._55sg._4ng2._kv1 input');

	if (defaultStatus === undefined) {
		notificationCheckbox.click();
	} else if ((defaultStatus && !notificationCheckbox.checked) || (!defaultStatus && notificationCheckbox.checked)) {
		notificationCheckbox.click();
	}

	ipc.send('mute-notifications-toggled', !notificationCheckbox.checked);

	if (!wasPreferencesOpen) {
		closePreferences();
	}
});

function setDarkMode() {
	document.documentElement.classList.toggle('dark-mode', config.get('darkMode'));
	ipc.send('set-vibrancy');
}

function setVibrancy() {
	document.documentElement.classList.toggle('vibrancy', config.get('vibrancy'));
	ipc.send('set-vibrancy');
}

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

ipc.on('toggle-dark-mode', () => {
	config.set('darkMode', !config.get('darkMode'));
	setDarkMode();
});

ipc.on('toggle-vibrancy', () => {
	config.set('vibrancy', !config.get('vibrancy'));
	setVibrancy();

	document.documentElement.style.backgroundColor = 'transparent';
});

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

	const list = Array.from(selected.parentNode.children);

	return list.indexOf(selected);
}

// Return the index for next node if next is true,
// else returns index for the previous node
function getNextIndex(next) {
	const selected = document.querySelector(selectedConversationSelector);
	if (!selected) {
		return 0;
	}

	const list = Array.from(selected.parentNode.children);
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

	const selector = '._54nq._2i-c._558b._2n_z li:nth-child(1) a';
	document.querySelector(selector).click();
}

function openArchiveModal() {
	if (!openConversationMenu()) {
		return;
	}

	const selector = '._54nq._2i-c._558b._2n_z li:nth-child(3) a';
	document.querySelector(selector).click();
}

function openDeleteModal() {
	if (!openConversationMenu()) {
		return;
	}

	const selector = '._54nq._2i-c._558b._2n_z li:nth-child(4) a';
	document.querySelector(selector).click();
}

function openPreferences() {
	// Create the menu for the below
	document.querySelector('._30yy._2fug._p').click();

	const nodes = document.querySelectorAll('._54nq._2i-c._558b._2n_z li:first-child a');
	nodes[nodes.length - 1].click();
}

function isPreferencesOpen() {
	return document.querySelector('._3quh._30yy._2t_._5ixy');
}

function closePreferences() {
	const doneButton = document.querySelector('._3quh._30yy._2t_._5ixy');
	doneButton.click();
}

// Inject a global style node to maintain custom appearance after conversation change or startup
document.addEventListener('DOMContentLoaded', () => {
	const style = document.createElement('style');
	style.id = 'zoomFactor';
	document.body.appendChild(style);

	// Set the zoom factor if it was set before quitting
	const zoomFactor = config.get('zoomFactor') || 1.0;
	setZoom(zoomFactor);

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
	setVibrancy();
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
