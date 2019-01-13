// Overwrite the Notification constructor in the browser process to make
// it call the main process via IPC. This enables custom notifications.
window.Notification = Object.assign(class {
	constructor(title, options) {
		window.postMessage({
			type: 'notification',
			data: {title, ...options}
		}, '*');
	}
}, window.Notification);
