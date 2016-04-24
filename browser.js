'use strict';
const electron = require('electron');
const ipc = electron.ipcRenderer;
const app = electron.remote.app;
const storage = electron.remote.require('./storage');
const listSelector = 'div[role="navigation"] > ul > li';
const conversationSelector = '._4u-c._1wfr > ._5f0v.uiScrollableArea';

ipc.on('show-preferences', () => {
	// create the menu for the below
	document.querySelector('._30yy._2fug._p').click();

	document.querySelector('._54nq._2i-c._558b._2n_z li:first-child a').click();
});

ipc.on('new-conversation', () => {
	document.querySelector('._30yy[href=\'/new\']').click();
});

ipc.on('log-out', () => {
	// create the menu for the below
	document.querySelector('._30yy._2fug._p').click();

	document.querySelector('._54nq._2i-c._558b._2n_z li:last-child a').click();
});

ipc.on('find', () => {
	document.querySelector('._58al').focus();
});

ipc.on('next-conversation', nextConversation);

ipc.on('previous-conversation', previousConversation);

ipc.on('dark-mode', toggleDarkMode);

app.on('platform-theme-changed', () => {
	storage.set('darkMode', app.isDarkMode());
	setDarkMode();
});

ipc.on('zoom-reset', () => {
	setZoom(1.0);
});

ipc.on('zoom-in', () => {
	const zoomFactor = storage.get('zoomFactor') + 0.1;

	if (zoomFactor < 1.6) {
		setZoom(zoomFactor);
	}
});

ipc.on('zoom-out', () => {
	const zoomFactor = storage.get('zoomFactor') - 0.1;

	if (zoomFactor >= 0.8) {
		setZoom(zoomFactor);
	}
});

function nextConversation() {
	const index = getNextIndex(true);
	document.querySelectorAll(listSelector)[index].firstChild.firstChild.click();
}

function previousConversation() {
	const index = getNextIndex(false);
	document.querySelectorAll(listSelector)[index].firstChild.firstChild.click();
}

function setDarkMode() {
	document.documentElement.classList.toggle('darkMode', storage.get('darkMode'));
}

function toggleDarkMode() {
	storage.set('darkMode', !storage.get('darkMode'));
	setDarkMode();
}

// return the index for next node if next is true,
// else returns index for the previous node
function getNextIndex(next) {
	const selected = document.querySelector('._5l-3._1ht1._1ht2');
	const list = Array.from(selected.parentNode.children);
	const index = list.indexOf(selected) + (next ? 1 : -1);

	return (index % list.length + list.length) % list.length;
}

function setZoom(zoomFactor) {
	const node = document.getElementById('zoomFactor');
	node.textContent = `${conversationSelector} {zoom: ${zoomFactor} !important}`;
	storage.set('zoomFactor', zoomFactor);
}

// link the theme if it was changed while the app was closed
if (process.platform === 'darwin') {
	storage.set('darkMode', app.isDarkMode());
}

// activate Dark Mode if it was set before quitting
setDarkMode();

// Inject a global style node to maintain zoom factor after conversation change.
// Also set the zoom factor if it was set before quitting.
document.addEventListener('DOMContentLoaded', () => {
	const zoomFactor = storage.get('zoomFactor') || 1.0;
	const style = document.createElement('style');
	style.id = 'zoomFactor';

	document.body.appendChild(style);
	setZoom(zoomFactor);
});

// it's not possible to add multiple accelerators
// so need to do this the oldschool way
document.addEventListener('keydown', event => {
	if (process.platform === 'darwin' && event.metaKey && event.shiftKey) {
		if (event.keyCode === 221/* ] */) {
			nextConversation();
		}

		if (event.keyCode === 219/* [ */) {
			previousConversation();
		}
	}
});
