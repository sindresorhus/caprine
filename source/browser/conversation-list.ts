import {ipcRenderer as ipc} from 'electron-better-ipc';
import elementReady = require('element-ready');
import selectors from './selectors';
import {isNewDesign} from '../browser';
import {isNull} from 'lodash';

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

async function createIcons(element: HTMLElement, url: string): Promise<void> {
	const canvas = await urlToCanvas(url, 50);

	element.setAttribute(icon.read, canvas.toDataURL());

	const markerSize = 8;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#f42020';
	ctx.beginPath();
	ctx.ellipse(canvas.width - markerSize, markerSize, markerSize, markerSize, 0, 0, 2 * Math.PI);
	ctx.closePath();
	ctx.fill();

	element.setAttribute(icon.unread, canvas.toDataURL());
}

async function discoverIcons(isNewDesign: boolean, element: HTMLElement): Promise<void> {
	if (isNewDesign) {
		if (element) {
			return createIcons(element, element.getAttribute('src')!);
		}
	} else {
		const profilePicElement = element.querySelector<HTMLImageElement>('img:first-of-type');

		if (profilePicElement) {
			return createIcons(element, profilePicElement.src);
		}

		const groupPicElement = element.firstElementChild as (HTMLElement | null);

		if (groupPicElement) {
			const groupPicBackground = groupPicElement.style.backgroundImage;

			if (groupPicBackground) {
				return createIcons(element, groupPicBackground.replace(/^url\(["']?(.*?)["']?\)$/, '$1'));
			}
		}
	}

	console.warn('Could not discover profile picture. Falling back to default image.');

	// Fall back to messenger favicon
	const messengerIcon = document.querySelector('link[rel~="icon"]');

	if (messengerIcon) {
		return createIcons(element, messengerIcon.getAttribute('href')!);
	}

	// Fall back to facebook favicon
	return createIcons(element, 'https://facebook.com/favicon.ico');
}

async function getIcon(isNewDesign: boolean, element: HTMLElement, unread: boolean): Promise<string> {
	if (element === null) {
		return icon.read;
	}

	if (!element.getAttribute(icon.read)) {
		await discoverIcons(isNewDesign, element);
	}

	return element.getAttribute(unread ? icon.unread : icon.read)!;
}

async function createConversation(element: HTMLElement): Promise<Conversation> {
	const conversation: Partial<Conversation> = {};
	const muted = element.classList.contains('_569x');

	conversation.selected = element.classList.contains('_1ht2');
	conversation.unread = !muted && element.getAttribute('aria-live') !== null;

	const profileElement = element.querySelector<HTMLElement>('div[data-tooltip-content]')!;

	conversation.label = profileElement.getAttribute('data-tooltip-content')!;
	conversation.icon = await getIcon(false, profileElement, conversation.unread);

	return conversation as Conversation;
}

async function getLabel(element: HTMLElement): Promise<string> {
	if (isNull(element)) {
		return '';
	}

	const emojis: HTMLElement[] = [...element.children] as HTMLElement[];
	for (const emoji of emojis) {
		emoji.outerHTML = emoji.querySelector('img')?.getAttribute('alt') ?? '';
	}

	return element.textContent ?? '';
}

async function createConversationNewDesign(element: HTMLElement): Promise<Conversation> {
	const conversation: Partial<Conversation> = {};
	// TODO: Exclude muted conversations
	/*
	const muted = Boolean(element.querySelector(selectors.muteIconNewDesign));
	*/

	conversation.selected = Boolean(element.querySelector('[role=row] [role=link] > div:only-child'));
	conversation.unread = Boolean(element.querySelector('[aria-label="Mark as Read"]'));

	const unparsedLabel = element.querySelector<HTMLElement>('.a8c37x1j.ni8dbmo4.stjgntxs.l9j0dhe7 > span > span')!;
	conversation.label = await getLabel(unparsedLabel);

	const iconElement = element.querySelector<HTMLElement>('img')!;
	conversation.icon = await getIcon(true, iconElement, conversation.unread);

	return conversation as Conversation;
}

async function createConversationList(isNewDesign: boolean): Promise<Conversation[]> {
	const conversationListSelector = isNewDesign ? selectors.conversationListNewDesign : selectors.conversationList;

	const list = await elementReady<HTMLElement>(conversationListSelector, {
		stopOnDomReady: false
	});

	if (!list) {
		console.error('Could not find conversation list', conversationListSelector);
		return [];
	}

	const elements: HTMLElement[] = [...list.children] as HTMLElement[];

	if (isNewDesign) {
		// Remove last element from childer list on new design
		elements.splice(-1, 1);
	}

	const conversations: Conversation[] = await Promise.all(elements.map(async element => isNewDesign ? createConversationNewDesign(element) : createConversation(element)));

	return conversations;
}

export async function sendConversationList(isNewDesign: boolean): Promise<void> {
	const conversationsToRender: Conversation[] = await createConversationList(isNewDesign);
	ipc.callMain('conversations', conversationsToRender);
}

function countUnread(mutationsList: MutationRecord[]): void {
	// Look through the mutations for the one with the unread dot
	const unreadMutations = mutationsList.filter(mutation => mutation.type === 'childList' && mutation.addedNodes.length > 0 && ((mutation.addedNodes[0] as Element).getAttribute('aria-label') === 'Mark as read'));

	for (const mutation of unreadMutations) {
		let curr = (mutation.addedNodes[0] as Element).parentElement;
		// Find the parent element with the message preview and sender
		while (curr?.className !== 'rq0escxv l9j0dhe7 du4w35lb j83agx80 pfnyh3mw i1fnvgqd bp9cbjyn owycx6da btwxx1t3') {
			curr = curr?.parentElement ?? null;
		}

		// Get the image data URI from the parent of the author/text
		const imgUrl = curr.parentElement?.getElementsByTagName('img')[0].getAttribute('data-caprine-icon');
		// Get the author and text of the new message
		// const titleText = curr.querySelectorAll('.d2edcug0.hpfvmrgz.qv66sw1b.c1et5uql.b0tq1wua.jq4qci2q.a3bd9o3v.lrazzd5p.oo9gr5id')[0].textContent;
		let titleTextOptions = curr.querySelectorAll('.a8c37x1j.d2edcug0.ni8dbmo4.ltmttdrg.g0qnabr5');
		if (titleTextOptions.length === 0) {
			titleTextOptions = curr.querySelectorAll('.a8c37x1j.ni8dbmo4.stjgntxs.l9j0dhe7.ltmttdrg.g0qnabr5');
		}

		const titleText = titleTextOptions[0].textContent;
		let bodyTextOptions = curr.querySelectorAll('.a8c37x1j.ni8dbmo4.stjgntxs.l9j0dhe7.ltmttdrg.g0qnabr5');
		if (bodyTextOptions.length === 0) {
			bodyTextOptions = curr.querySelectorAll('.a8c37x1j.d2edcug0.ni8dbmo4.ltmttdrg.g0qnabr5');
		}

		let loc = 0;
		if (bodyTextOptions.length >= 2) {
			loc = 1;
		}

		const bodyText = bodyTextOptions[loc].textContent;

		// Send a notification
		ipc.callMain('notification', {
			id: 0,
			title: titleText,
			body: bodyText,
			icon: imgUrl,
			silent: false
		});
	}
}

window.addEventListener('load', async () => {
	const sidebar = await elementReady<HTMLElement>('[role=navigation]', {stopOnDomReady: false});
	const newDesign = await isNewDesign();

	if (sidebar) {
		const conversationListObserver = new MutationObserver(async () => sendConversationList(newDesign));
		const conversationCountObserver = new MutationObserver(countUnread);

		conversationListObserver.observe(sidebar, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['class']
		});

		conversationCountObserver.observe(sidebar, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['class']
		});
	}
});
