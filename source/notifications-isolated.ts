((window, Notification) => {
	const notifications = new Map<number, Notification>();

	// Handle events sent from the browser process
	window.addEventListener('message', ({data: {type, data}}) => {
		if (type === 'notification-callback') {
			const {callbackName, id} = data;
			const notification = notifications.get(id);

			if (!notification) {
				return;
			}

			if ((notification as any)[callbackName]) {
				(notification as any)[callbackName]();
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

			constructor(title: string, options: NotificationOptions) {
				// According to https://github.com/sindresorhus/caprine/pull/637 the Notification
				// constructor can be called with non-string title and body
				let {body} = options;
				const bodyProps = (body as any).props;
				body = bodyProps ? bodyProps.content[0] : options.body;

				const titleProps = (title as any).props;
				title = titleProps ? titleProps.content[0] : title;

				this._id = counter++;
				notifications.set(this._id, this as any);

				window.postMessage(
					{type: 'notification', data: {title, id: this._id, ...options, body}},
					'*'
				);
			}

			// No-op, but Messenger expects this method to be present
			close(): void {}
		},
		Notification
	);

	Object.assign(window, {Notification: AugmentedNotification});
})(window, Notification);
