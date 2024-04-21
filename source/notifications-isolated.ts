((window, notification) => {
	const notifications = new Map<number, Notification>();

	// Handle events sent from the browser process
	window.addEventListener('message', ({data: {type, data}}) => {
		if (type === 'notification-callback') {
			const {callbackName, id}: NotificationCallback = data;
			const notification = notifications.get(id);

			if (!notification) {
				return;
			}

			if (notification[callbackName]) {
				notification[callbackName]();
			}

			if (callbackName === 'onclose') {
				notifications.delete(id);
			}
		}

		if (type === 'notification-reply-callback') {
			const {callbackName, id, previousConversation, reply}: NotificationReplyCallback = data;
			const notification = notifications.get(id);

			if (!notification) {
				return;
			}

			if (notification[callbackName]) {
				notification[callbackName]();
			}

			notifications.delete(id);
			window.postMessage({type: 'notification-reply', data: {previousConversation, reply}}, '*');
		}
	});

	let counter = 1;

	const augmentedNotification = Object.assign(
		class {
			private readonly _id: number;

			constructor(title: string, options: NotificationOptions) {
				// According to https://github.com/sindresorhus/caprine/pull/637, the Notification
				// constructor can be called with non-string title and body.
				let {body} = options;
				const bodyProperties = (body as any).props;
				body = bodyProperties ? bodyProperties.content[0] : options.body;

				const titleProperties = (title as any).props;
				title = titleProperties ? titleProperties.content[0] : title;

				this._id = counter++;

				notifications.set(this._id, this as any);

				window.postMessage(
					{
						type: 'notification',
						data: {
							title,
							id: this._id,
							...options,
							body,
						},
					},
					'*',
				);
			}

			// No-op, but Messenger expects this method to be present
			close(): void {} // eslint-disable-line @typescript-eslint/no-empty-function
		},
		notification,
	);

	Object.assign(window, {notification: augmentedNotification});
})(window, Notification);
