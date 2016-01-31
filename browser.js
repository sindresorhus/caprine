'use strict';
const ipc = require('electron').ipcRenderer;
const storage = require("remote").require("./storage");
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

ipc.on('next-conversation', () => {
	const index = getNextIndex(true);
	document.querySelectorAll(listSelector)[index].firstChild.firstChild.click();
});

ipc.on('previous-conversation', () => {
	const index = getNextIndex(false);
	document.querySelectorAll(listSelector)[index].firstChild.firstChild.click();
});

ipc.on('night-mode', () => {
	toggleNightMode();
});

function inNightMode() {
	return storage.get('nightMode') || false;
}

function toggleNightMode() {
	if (inNightMode()) {
		deactivateNightMode();
	} else {
		activateNightMode();
	}
}

function activateNightMode() {
	document.querySelector('html').classList.add('nightMode');
	storage.set('nightMode', true);
}

function deactivateNightMode() {
	document.querySelector('html').classList.remove('nightMode');
	storage.set('nightMode', false);
}

// return the index for next node if next is true,
// else returns index for the previous node
function getNextIndex(next) {
	const selected = document.querySelector('._5l-3._1ht1._1ht2');
	const list = Array.from(selected.parentNode.children);
	const index = list.indexOf(selected) + (next ? 1 : -1);

	return (index % list.length + list.length) % list.length;
}

// activate Night Mode if it was set before quitting
if (inNightMode()) {
	activateNightMode();
}

/* eslint-disable no-native-reassign, no-undef */
// Extend and replace the native notifications.
const NativeNotification = Notification;

Notification = function (title, options) {
	const notification = new NativeNotification(title, options);
	notification.addEventListener('click', () => {
		ipc.send('notification-click');
	});

	return notification;
};
Notification.prototype = NativeNotification.prototype;
Notification.permission = NativeNotification.permission;
Notification.requestPermission = NativeNotification.requestPermission.bind(Notification);
/* eslint-enable no-native-reassign, no-undef */
