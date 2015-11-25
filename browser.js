/* eslint-disable no-native-reassign no-undef */
'use strict';
const ipc = require('electron').ipcRenderer;

ipc.on('show-preferences', () => {
	// create the menu for the below
	document.querySelector('._150g._30yy._2fug._p').click();

	document.querySelector('._54nq._2i-c._150g._558b._2n_z li:first-child a').click();
});

ipc.on('new-conversation', () => {
	document.querySelector('._30yy[href=\'/new\']').click();
});

ipc.on('log-out', () => {
	// create the menu for the below
	document.querySelector('._150g._30yy._2fug._p').click();

	document.querySelector('._54nq._2i-c._150g._558b._2n_z li:last-child a').click();
});

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
