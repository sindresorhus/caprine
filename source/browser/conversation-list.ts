import {ipcRenderer as ipc} from 'electron';
import elementReady = require('element-ready');
import selectors from './selectors';

const icon = {
	read: 'data-caprine-icon',
	unread: 'data-caprine-icon-unread'
};

const padding = {
	top: 3,
	right: 0,
	bottom: 3,
	left: 0
};

function drawIcon(size: number, img?: HTMLImageElement): HTMLCanvasElement {
	const canvas = document.createElement('canvas');

	if (img) {
		canvas.width = size + padding.left + padding.right;
		canvas.height = size + padding.top + padding.bottom;

		const ctx = canvas.getContext('2d')!;
		ctx.beginPath();
		ctx.arc((size / 2) + padding.left, (size / 2) + padding.top, (size / 2), 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.clip();

		ctx.drawImage(img, padding.left, padding.top, size, size);
	} else {
		canvas.width = 0;
		canvas.height = 0;
	}

	return canvas;
}

// Return canvas with rounded image
async function urlToCanvas(url: string, size: number): Promise<HTMLCanvasElement> {
	return new Promise(resolve => {
		const img = new Image();

		img.setAttribute('crossorigin', 'anonymous');

		img.addEventListener('load', () => {
			resolve(drawIcon(size, img));
		});

		img.addEventListener('error', () => {
			console.error('Image not found', url);
			resolve(drawIcon(size));
		});

		img.src = url;
	});
}

async function createIcons(el: HTMLElement, url: string): Promise<void> {
	const canvas = await urlToCanvas(url, 50);

	el.setAttribute(icon.read, canvas.toDataURL());

	const markerSize = 8;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#f42020';
	ctx.beginPath();
	ctx.ellipse(canvas.width - markerSize, markerSize, markerSize, markerSize, 0, 0, 2 * Math.PI);
	ctx.closePath();
	ctx.fill();

	el.setAttribute(icon.unread, canvas.toDataURL());
}

async function discoverIcons(el: HTMLElement): Promise<void> {
	const profilePicElement = el.querySelector<HTMLImageElement>('img:first-of-type');

	if (profilePicElement) {
		return createIcons(el, profilePicElement.src);
	}

	const groupPicElement = el.firstElementChild as (HTMLElement | null);

	if (groupPicElement) {
		const groupPicBackground = groupPicElement.style.backgroundImage;

		if (groupPicBackground) {
			// TODO: Fix this lint violation.
			// eslint-disable-next-line prefer-named-capture-group
			return createIcons(el, groupPicBackground.replace(/^url\(["']?(.*?)["']?\)$/, '$1'));
		}
	}

	console.warn('Could not discover profile picture. Falling back to default image.');

	// Fall back to messenger favicon
	const messengerIcon = document.querySelector('link[rel~="icon"]');

	if (messengerIcon) {
		return createIcons(el, messengerIcon.getAttribute('href')!);
	}

	// Fall back to facebook favicon
	return createIcons(el, 'https://facebook.com/favicon.ico');
}

async function getIcon(el: HTMLElement, unread: boolean): Promise<string> {
	if (!el.getAttribute(icon.read)) {
		await discoverIcons(el);
	}

	return el.getAttribute(unread ? icon.unread : icon.read)!;
}

async function createConversation(el: HTMLElement): Promise<Conversation> {
	const conversation: Partial<Conversation> = {};
	const muted = el.classList.contains('_569x');

	conversation.selected = el.classList.contains('_1ht2');
	conversation.unread = !muted && el.getAttribute('aria-live') !== null;

	const profileElement = el.querySelector<HTMLElement>('div[data-tooltip-content]')!;

	conversation.label = profileElement.getAttribute('data-tooltip-content')!;
	conversation.icon = await getIcon(profileElement, conversation.unread);

	return conversation as Conversation;
}

async function createConversationList(): Promise<Conversation[]> {
	const list = await elementReady<HTMLElement>(selectors.conversationList, {
		stopOnDomReady: false
	});

	if (!list) {
		console.error('Could not find conversation list', selectors.conversationList);
		return [];
	}

	const items: HTMLElement[] = [...list.children] as HTMLElement[];

	const conversations: Conversation[] = await Promise.all(items.map(createConversation));

	return conversations;
}

export async function sendConversationList(): Promise<void> {
	const conversationsToRender: Conversation[] = await createConversationList();
	ipc.send('conversations', conversationsToRender);
}

window.addEventListener('load', async () => {
	const sidebar = document.querySelector<HTMLElement>('[role=navigation]');

	if (sidebar) {
		const conversationListObserver = new MutationObserver(sendConversationList);

		conversationListObserver.observe(sidebar, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['class']
		});
	}
});
