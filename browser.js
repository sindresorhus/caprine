'use strict';
const ipc = require('electron').ipcRenderer;
const listSelector = 'ul[aria-label="Conversation List"] > li';

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
})

ipc.on('next-conversation', () => {
	const index = getSelectedIndex() + 1;
	document.querySelectorAll(listSelector)[index].firstChild.firstChild.click();
});

ipc.on('previous-conversation', () => {
	const index = getSelectedIndex() - 1;
	if (index >= 0) {
		document.querySelectorAll(listSelector)[index].firstChild.firstChild.click();
	}
});

function getSelectedIndex() {
	const selected = document.querySelector('._5l-3._1ht1._1ht2');
	const list = selected.parentNode;

	return Array.prototype.indexOf.call(list.children, selected);
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
