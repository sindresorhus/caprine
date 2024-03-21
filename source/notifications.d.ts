type NotificationCallback = {
	callbackName: keyof Notification;
	id: number;
};

type NotificationReplyCallback = NotificationCallback & {
	previousConversation: number;
	reply: string;
};
