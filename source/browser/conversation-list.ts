import {ipcRenderer as ipc} from 'electron-better-ipc';
import elementReady from 'element-ready';
import {isNull} from 'lodash';
import selectors from './selectors';

const icon = {
	read: 'data-caprine-icon',
	unread: 'data-caprine-icon-unread',
};

const padding = {
	top: 3,
	right: 0,
	bottom: 3,
	left: 0,
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

async function discoverIcons(element: HTMLElement): Promise<void> {
	if (element) {
		return createIcons(element, element.getAttribute('src')!);
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

async function getIcon(element: HTMLElement, unread: boolean): Promise<string> {
	if (element === null) {
		return icon.read;
	}

	if (!element.getAttribute(icon.read)) {
		await discoverIcons(element);
	}

	return element.getAttribute(unread ? icon.unread : icon.read)!;
}

async function getLabel(element: HTMLElement): Promise<string> {
	if (isNull(element)) {
		return '';
	}

	const emojis: HTMLElement[] = [];
	if (element !== null) {
		for (const element_curr of element.children) {
			emojis.push(element_curr as HTMLElement);
		}
	}

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
	conversation.icon = await getIcon(iconElement, conversation.unread);

	return conversation as Conversation;
}

async function createConversationList(): Promise<Conversation[]> {
	const conversationListSelector = selectors.conversationList;

	const list = await elementReady(conversationListSelector, {
		stopOnDomReady: false,
	});

	if (!list) {
		console.error('Could not find conversation list', conversationListSelector);
		return [];
	}

	const elements: HTMLElement[] = [...list.children] as HTMLElement[];

	// Remove last element from childer list
	elements.splice(-1, 1);

	const conversations: Conversation[] = await Promise.all(elements.map(async element => createConversationNewDesign(element)));

	return conversations;
}

export async function sendConversationList(): Promise<void> {
	const conversationsToRender: Conversation[] = await createConversationList();
	ipc.callMain('conversations', conversationsToRender);
}

function genStringFromNode(element: Element): string {
	const cloneElement = element.cloneNode(true) as Element;
	let emojiString;

	const images = cloneElement.querySelectorAll('img');
	for (const image of images) {
		emojiString = image.alt;
		// Replace facebook's thumbs up with emoji
		if (emojiString === '(Y)' || emojiString === '(y)') {
			emojiString = '👍';
		}

		image.parentElement?.replaceWith(document.createTextNode(emojiString));
	}

	return cloneElement.textContent ?? '';
}

function countUnread(mutationsList: MutationRecord[]): void {
	const alreadyChecked: any = [];
	// Look through the mutations for the one with the unread dot
	const unreadMutations = mutationsList.filter(mutation =>
		// When text is received
		(
			mutation.type === 'characterData'
			// Make sure the text corresponds to a conversation
			&& mutation.target.parentElement?.parentElement?.parentElement?.className === 'html-span xdj266r x11i5rnm xat24cr x1mh8g0r xexx8yu x18d9i69 xkhd6sd x1hl2dhg x16tdsg8 x1vvkbs x6s0dn4 x78zum5 x193iq5w xeuugli xg83lxy'
		)
		// When an emoji is received, node(s) are added
		|| (
			mutation.type === 'childList'
			// There is a case where in the current mutation nodes are only removed and in a later one, new ones are added.
			// By using this condition we ensure that this is the mutation where nodes are added
			&& mutation.addedNodes.length > 0
			// Make sure the mutation corresponds to a conversation
			&& mutation.target.parentElement?.parentElement?.className === 'html-span xdj266r x11i5rnm xat24cr x1mh8g0r xexx8yu x18d9i69 xkhd6sd x1hl2dhg x16tdsg8 x1vvkbs x6s0dn4 x78zum5 x193iq5w xeuugli xg83lxy'
		)
		// Emoji change
		|| (
			mutation.type === 'attributes'
			&& mutation.target.parentElement?.parentElement?.parentElement?.parentElement?.className === 'html-span xdj266r x11i5rnm xat24cr x1mh8g0r xexx8yu x18d9i69 xkhd6sd x1hl2dhg x16tdsg8 x1vvkbs x6s0dn4 x78zum5 x193iq5w xeuugli xg83lxy'
		));

	// Check latest mutation first
	for (const mutation of unreadMutations.reverse()) {
		const curr = (mutation.target.parentElement as Element).closest('[class="x9f619 x1n2onr6 x1ja2u2z x78zum5 x2lah0s x1qughib x6s0dn4 xozqiw3 x1q0g3np"]')!;

		const href = curr.closest('[role="link"]')?.getAttribute('href');

		// It is possible to have multiple mutations for the same conversation, but we only want one notification.
		// So if the current conversation has already been checked, continue.
		// Additionally if the conversation is not unread, then also continue.
		if (alreadyChecked.includes(href) || !curr.querySelector('.x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x1q0g3np.x87ps6o.x1lku1pv.x78zum5.x1a2a7pz')) {
			continue;
		}

		alreadyChecked.push(href);

		// Get the image data URI from the parent of the author/text
		const imgUrl = curr.querySelector('img')?.dataset.caprineIcon;
		const textOptions = curr.querySelectorAll('[class="x1lliihq x193iq5w x6ikm8r x10wlt62 xlyipyv xuxw1ft"]');
		// Get the author and text of the new message
		const titleTextOptions = textOptions[0];
		const bodyTextOptions = textOptions[1];

		const titleText = (titleTextOptions) ? genStringFromNode(titleTextOptions) : '';
		const bodyText = (bodyTextOptions) ? genStringFromNode(bodyTextOptions) : '';

		// Send a notification
		ipc.callMain('notification', {
			id: 0,
			title: titleText,
			body: bodyText,
			icon: imgUrl,
			silent: false,
		});
	}
}

async function updateTrayIcon(): Promise<void> {
	const chatsIcon = await elementReady(selectors.chatsIcon, {
		stopOnDomReady: false,
	});

	// Extract messageCount from ariaLabel
	const messageCount = chatsIcon?.ariaLabel?.match(/\d+/g) ?? 0;
	ipc.callMain('update-tray-icon', messageCount);
}

window.addEventListener('load', async () => {
	const sidebar = await elementReady('[role=navigation]:has([role=grid])', {stopOnDomReady: false});
	const leftSidebar = await elementReady(`${selectors.leftSidebar}:has(${selectors.chatsIcon})`, {stopOnDomReady: false});

	if (sidebar) {
		const conversationListObserver = new MutationObserver(async () => sendConversationList());
		const conversationCountObserver = new MutationObserver(countUnread);

		conversationListObserver.observe(sidebar, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['class'],
		});

		conversationCountObserver.observe(sidebar, {
			characterData: true,
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['src', 'alt'],
		});
	}

	if (leftSidebar) {
		const chatsIconObserver = new MutationObserver(async () => updateTrayIcon());

		chatsIconObserver.observe(leftSidebar, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['aria-label'],
		});
	}
});
