'use strict';
var ipc = require('ipc');

ipc.on('show-preferences', function () {
	// create the menu for the below
	document.querySelector('._150g._30yy._2fug._p').click();

	document.querySelector('._54nq._2i-c._150g._558b._2n_z li:first-child a').click();
});

ipc.on('new-conversation', function () {
	document.querySelector('._30yy._4kzv').click();
});

ipc.on('log-out', function () {
	// create the menu for the below
	document.querySelector('._150g._30yy._2fug._p').click();

	document.querySelector('._54nq._2i-c._150g._558b._2n_z li:last-child a').click();
});
