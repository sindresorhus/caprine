(window => {
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

		if (type === 'notification-reply-callback') {
			const {callbackName, id, previousConversation, reply} = data;
			const notification = notifications.get(id);

			if (notification && notification[callbackName]) {
				notification[callbackName]();
			}
			notifications.delete(id);
			window.postMessage({type: 'notification-reply', data: {previousConversation, reply}}, '*');
		}
	});

	let counter = 1;

	window.Notification = Object.assign(
		class {
			constructor(title, options) {
				this.id = counter++;
				notifications.set(this.id, this);

				window.postMessage({type: 'notification', data: {title, id: this.id, ...options}}, '*');
			}

			// No-op, but Messenger expects this method to be present
			close() {}
		},
		window.Notification
	);
})(window);
