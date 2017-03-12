'use strict';
const electron = require('electron');
const config = require('./config');

const ipc = electron.ipcRenderer;

const listSelector = 'div[role="navigation"] > div > ul';
const conversationSelector = '._4u-c._1wfr > ._5f0v.uiScrollableArea';
const selectedConversationSelector = '._5l-3._1ht1._1ht2';

ipc.on('show-preferences', () => {
	// Create the menu for the below
	document.querySelector('._30yy._2fug._p').click();

	const nodes = document.querySelectorAll('._54nq._2i-c._558b._2n_z li:first-child a');
	nodes[nodes.length - 1].click();
});

ipc.on('new-conversation', () => {
	document.querySelector('._30yy[href=\'/new\']').click();
});

ipc.on('log-out', () => {
	// Create the menu for the below
	document.querySelector('._30yy._2fug._p').click();

	const nodes = document.querySelectorAll('._54nq._2i-c._558b._2n_z li:last-child a');
	nodes[nodes.length - 1].click();
});

ipc.on('find', () => {
	document.querySelector('._58al').focus();
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
	// Open the modal for the below
	openDeleteModal();

	const archiveSelector = '._3quh._30yy._2u0._5ixy';

	// Wait for the button to be created
	window.setTimeout(() => {
		document.querySelectorAll(archiveSelector)[1].click();
	}, 10);
});

function setDarkMode() {
	document.documentElement.classList.toggle('dark-mode', config.get('darkMode'));
}

ipc.on('toggle-dark-mode', () => {
	config.set('darkMode', !config.get('darkMode'));
	setDarkMode();
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
	const menu = document.querySelectorAll('.uiPopover')[index + 1].firstChild;
	menu.click();
	menu.click();

	return true;
}

function openMuteModal() {
	if (!openConversationMenu()) {
		return;
	}

	const selector = '._54nq._2i-c._558b._2n_z li:nth-child(1) a';
	const nodes = document.querySelectorAll(selector);
	nodes[nodes.length - 1].click();
}

function openDeleteModal() {
	if (!openConversationMenu()) {
		return;
	}

	const selector = `._54nq._2i-c._558b._2n_z ul`;
	const nodes = document.querySelectorAll(selector);
	const menuList = nodes[nodes.length - 1];
	const position = menuList.childNodes.length - 3;

	menuList.childNodes[position - 1].firstChild.click();
}

// Inject a global style node to maintain zoom factor after conversation change.
// Also set the zoom factor if it was set before quitting.
document.addEventListener('DOMContentLoaded', () => {
	const zoomFactor = config.get('zoomFactor') || 1.0;
	const style = document.createElement('style');
	style.id = 'zoomFactor';
	document.body.appendChild(style);
	setZoom(zoomFactor);

	// Activate Dark Mode if it was set before quitting
	setDarkMode();

	// Prevent flash of white on startup when in dark mode
	// TODO: find a CSS only solution
	if (config.get('darkMode')) {
		document.documentElement.style.backgroundColor = '#192633';
	}
});

// It's not possible to add multiple accelerators
// so need to do this the oldschool way
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
