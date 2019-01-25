((window, Notification) => {
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

	const AugmentedNotification = Object.assign(
		class {
			private _id: number;

			constructor(title, options) {
				this._id = counter++;
				notifications.set(this._id, this as any);

				window.postMessage({type: 'notification', data: {title, id: this._id, ...options}}, '*');
			}

			// No-op, but Messenger expects this method to be present
			close(): void {}
		},
		Notification
	);

	Object.assign(window, {Notification: AugmentedNotification});
})(window, Notification);
