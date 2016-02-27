'use strict';
const ipc = require('electron').ipcRenderer;
const storage = require('remote').require('./storage');
const listSelector = 'div[role="navigation"] > ul > li';

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

// activate Dark Mode if it was set before quitting
setDarkMode();

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
