(window => {
	const notifications = new Map<number, Notification>();

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

	window['Notification'] = Object.assign(
		class {
			private id: number;

			constructor(title, options) {
				this.id = counter++;
				notifications.set(this.id, this as any);

				window.postMessage({type: 'notification', data: {title, id: this.id, ...options}}, '*');
			}

			// No-op, but Messenger expects this method to be present
			close() {}
		},
		window['Notification']
	);
})(window);
