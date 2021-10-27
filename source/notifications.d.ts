interface NotificationCallback {
	callbackName: keyof Notification;
	id: number;
}

interface NotificationReplyCallback extends NotificationCallback {
	previousConversation: number;
	reply: string;
}
