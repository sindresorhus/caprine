interface NotificationCallback {
	callbackName: keyof Notification;
	id: number;
}

interface NotificationReplyCallback {
	callbackName: keyof Notification;
	id: number;
	previousConversation: number;
	reply: string;
}
