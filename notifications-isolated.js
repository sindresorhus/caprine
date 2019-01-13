(function (window) {
	const notifications = new Map();

	// Handle events sent from the browser process
	window.addEventListener('message', ({data: {type, data}}) => {
		if (type === 'notification-callback') {
			const {callbackName, id} = data;
			const notification = notifications.get(id);

			if (notification && notification[callbackName]) {
				notification[callbackName]();
			}

			if (callbackName === 'onclose') {
				notifications.delete(id);
			}
		}
	});

	let counter = 1;

	window.Notification = Object.assign(class {
		constructor(title, options) {
			this.id = counter++;
			notifications.set(this.id, this);

			window.postMessage({type: 'notification', data: {title, id: this.id, ...options}}, '*');
		}
	}, window.Notification);
})(window);
