'use strict';
const electron = require('electron');

const {ipcRenderer: ipc} = electron;

const onReady = fn => {
	window.addEventListener('load', () => {
		const check = () => {
			if (document.querySelector('._3quh._30yy._2t_')) {
				fn();
			} else {
				setTimeout(check, 100);
			}
		};

		check();
	});
}

onReady(() => {
	// Start call
	document.querySelector('._3quh._30yy._2t_').click();
});
