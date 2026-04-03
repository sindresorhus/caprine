import {ipcRenderer as ipc} from 'electron-better-ipc';
import elementReady from 'element-ready';
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

// Track last notified content per conversation to prevent DOM mutation repeats
// New messages with different content will still notify immediately
const lastNotifiedContent = new Map<string, string>();

function drawIcon(size: number, img?: HTMLImageElement): HTMLCanvasElement {
	const canvas = document.createElement('canvas');

	if (img) {
		canvas.width = size + padding.left + padding.right;
		canvas.height = size + padding.top + padding.bottom;

		const context = canvas.getContext('2d')!;
		context.beginPath();
		context.arc((size / 2) + padding.left, (size / 2) + padding.top, (size / 2), 0, Math.PI * 2, true);
		context.closePath();
		context.clip();

		context.drawImage(img, padding.left, padding.top, size, size);
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
	const context = canvas.getContext('2d')!;

	context.fillStyle = '#f42020';
	context.beginPath();
	context.ellipse(canvas.width - markerSize, markerSize, markerSize, markerSize, 0, 0, 2 * Math.PI);
	context.closePath();
	context.fill();

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

async function getLabel(element: HTMLElement | undefined): Promise<string> {
	if (!element) {
		return '';
	}

	let label = element.textContent ?? '';

	if (label.trim() === '') {
		const ariaLabel = element.getAttribute('aria-label');
		if (ariaLabel && ariaLabel.trim() !== '') {
			label = ariaLabel;
		}
	}

	if (label.trim() === '') {
		const emojis: HTMLElement[] = [];
		for (const elementCurrent of element.children) {
			emojis.push(elementCurrent as HTMLElement);
		}

		for (const emoji of emojis) {
			emoji.outerHTML = emoji.querySelector('img')?.getAttribute('alt') ?? '';
		}

		label = element.textContent ?? '';
	}

	return label.trim();
}

// Detect unread conversations by the visually-hidden accessibility span that
// Facebook inserts for screen readers (1px × 1px, position:absolute, overflow:hidden).
// This approach is language-independent — it detects the hidden element by CSS style,
// not by its text content which varies by language.
// IMPORTANT: The parent element must have 'html-span' class to distinguish the unread
// indicator from other hidden accessibility labels like "Online now", "Sent", etc.
function isUnreadConversation(element: HTMLElement): boolean {
	for (const child of element.querySelectorAll<HTMLElement>('div, span')) {
		if (child.childElementCount === 0 && child.textContent?.trim()) {
			const style = window.getComputedStyle(child);
			if (
				style.position === 'absolute'
				&& (style.width === '1px' || style.height === '1px' || style.overflow === 'hidden')
				&& child.parentElement?.classList.contains('html-span')
			) {
				return true;
			}
		}
	}

	return false;
}

async function createConversationNewDesign(element: HTMLElement): Promise<Conversation> {
	const conversation: Partial<Conversation> = {};

	conversation.selected = Boolean(element.querySelector('[role=row] [role=link] > div:only-child'));
	conversation.unread = isUnreadConversation(element);

	let unparsedLabel: HTMLElement | undefined;
	for (const selector of selectors.conversationLabelSelectors) {
		// For attribute-based selectors that might match multiple elements,
		// take only the first match which is always the conversation name
		const candidates = element.querySelectorAll<HTMLElement>(selector);
		if (candidates.length > 0) {
			unparsedLabel = candidates[0]!;
			break;
		}
	}

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

	const promises = elements.map(async element => {
		const conversation = await createConversationNewDesign(element);
		return conversation.label ? conversation : undefined;
	});
	const conversationsResult = await Promise.all(promises);
	const conversations = conversationsResult.filter(Boolean) as Conversation[];

	return conversations;
}

export async function sendConversationList(): Promise<void> {
	const conversationsToRender: Conversation[] = await createConversationList();
	ipc.callMain('conversations', conversationsToRender);
}

function generateStringFromNode(element: Element): string | undefined {
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

	return cloneElement.textContent ?? undefined;
}

function countUnread(mutationsList: MutationRecord[]): void {
	const alreadyChecked: string[] = [];

	// Check latest mutation first
	for (const mutation of mutationsList.reverse()) {
		// Find the conversation row containing this mutation.
		// For childList mutations the target is the parent element; for others it's the
		// element/text node itself, so go up one level first.
		const target = mutation.type === 'childList'
			? (mutation.target as Element)
			: (mutation.target.parentElement as Element);

		if (!target) {
			continue;
		}

		// Walk up to the nearest [role=row] (a single conversation entry in the grid).
		let current = target.closest<HTMLElement>(selectors.conversationSidebarSelector);

		// When a whole row is added (conversation moves to top of list), the target
		// is the grid container. Check addedNodes for a [role=row] directly.
		if (!current && mutation.type === 'childList') {
			for (const node of mutation.addedNodes) {
				const element = node as Element;
				if (element.matches?.(selectors.conversationSidebarSelector)) {
					current = element as HTMLElement;
					break;
				}
			}
		}

		if (!current) {
			continue;
		}

		// Make sure this row is inside the chats grid (not some other [role=row] on the page).
		if (!current.closest('[role=grid]')) {
			continue;
		}

		const href = current.querySelector('[role="link"]')?.getAttribute('href');

		if (!href) {
			continue;
		}

		// Deduplicate: only process each conversation once per batch of mutations.
		if (alreadyChecked.includes(href)) {
			continue;
		}

		// Only notify for unread conversations.
		if (!isUnreadConversation(current)) {
			continue;
		}

		// Skip notifications for muted conversations (exclude from popup/badge/sound)
		const isMuted = Boolean(current.querySelector(selectors.mutedConversation));
		if (isMuted) {
			continue;
		}

		alreadyChecked.push(href);

		// Get the icon data URI (set by createConversationList via createIcons).
		const imgUrl = current.querySelector('img')?.dataset.caprineIcon;
		const textOptions = current.querySelectorAll<HTMLElement>(selectors.conversationSidebarTextSelector);
		const titleText = generateStringFromNode(textOptions[0]);
		const bodyText = textOptions[1] ? generateStringFromNode(textOptions[1]) : undefined;

		if (!titleText || !imgUrl) {
			continue;
		}

		// Generate conversation ID for notification tracking
		const conversationId = [...href].reduce((hash, char) => ((hash * 31) + char.codePointAt(0)!) % 2_147_483_647, 0);

		// Track last notified content per conversation to prevent DOM mutation repeats
		// New messages with different content will still notify immediately
		const currentContent = bodyText ?? '';
		const lastContent = lastNotifiedContent.get(href);

		// Only skip if content is exactly the same (DOM mutation duplicate)
		if (lastContent === currentContent) {
			continue;
		}

		// Track this conversation's latest content
		lastNotifiedContent.set(href, currentContent);

		// Send a notification
		ipc.callMain('notification', {
			id: conversationId,
			title: titleText,
			body: bodyText ?? 'New message',
			icon: imgUrl,
			silent: false,
		});
	}
}

// Track unread count state for badge persistence
// currentBadgeCount: what's currently shown in the badge
// consecutiveZeroCount: how many times we've seen 0 unread in a row
// Required to prevent badge from clearing on temporary DOM changes
let currentBadgeCount = 0;
let consecutiveZeroCount = 0;
const ZERO_CONFIRMATION_THRESHOLD = 3; // Require 3 consecutive zero readings before clearing badge
const BADGE_POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

function getUnreadCount(): number {
	// Count unread conversations directly from the conversation grid.
	// facebook.com/messages only shows the last message body in the sidebar —
	// there is no per-conversation unread message count exposed in the DOM.
	// The badge therefore reflects the number of conversations with unread messages.
	const rows = document.querySelectorAll<HTMLElement>('[role=grid] [role=row]');
	let count = 0;

	for (const row of rows) {
		if (isUnreadConversation(row)) {
			// Skip muted conversations from badge count
			const isMuted = Boolean(row.querySelector(selectors.mutedConversation));

			if (isMuted) {
				continue;
			}

			count++;
		}
	}

	return count;
}

function updateTrayIcon(): void {
	const actualUnreadCount = getUnreadCount();

	// Case 1: We have unread messages - always show them immediately
	if (actualUnreadCount > 0) {
		currentBadgeCount = actualUnreadCount;
		consecutiveZeroCount = 0;
	} else if (actualUnreadCount === 0 && currentBadgeCount > 0) {
		// Case 2: DOM shows 0 but badge currently shows unread
		// This could be because:
		// - Messages were actually read
		// - Facebook cleared the DOM on window focus (temporary)
		// - Some other DOM manipulation
		consecutiveZeroCount++;

		// Only clear the badge after multiple consecutive zero readings
		// This prevents the badge from disappearing on temporary DOM changes
		if (consecutiveZeroCount >= ZERO_CONFIRMATION_THRESHOLD) {
			currentBadgeCount = 0;
			consecutiveZeroCount = 0;
			lastNotifiedContent.clear();
		}
		// If not enough consecutive zeros, keep showing the current badge count
	}

	ipc.callMain('update-tray-icon', currentBadgeCount);
	ipc.callMain('update-titlebar-count', currentBadgeCount);
}

// Poll for badge updates to ensure it stays in sync
// This handles cases where DOM mutations are missed or delayed
function startBadgePolling(): void {
	setInterval(() => {
		updateTrayIcon();
	}, BADGE_POLL_INTERVAL_MS);
}

// Trigger immediate badge update when window gains focus or becomes visible
// This ensures the badge updates instantly when user restores/minimizes the app
function setupFocusTriggers(): void {
	// Update on window focus
	window.addEventListener('focus', () => {
		updateTrayIcon();
	});

	// Update when window becomes visible (restored from minimized/hidden)
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden) {
			updateTrayIcon();
		}
	});
}

window.addEventListener('load', async () => {
	const sidebar = await elementReady('[role=navigation]:has([role=grid])', {stopOnDomReady: false});

	if (sidebar) {
		const conversationListObserver = new MutationObserver(async () => sendConversationList());
		const conversationCountObserver = new MutationObserver(countUnread);
		const trayIconObserver = new MutationObserver(updateTrayIcon);

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

		// Watch for conversations being added/removed/reordered (badge count changes).
		trayIconObserver.observe(sidebar, {
			childList: true,
			subtree: true,
		});

		// Set initial badge count once the page is loaded.
		updateTrayIcon();

		// Start polling to ensure badge stays in sync
		// This handles cases where DOM mutations are missed or Facebook clears indicators on focus
		startBadgePolling();

		// Setup triggers for immediate updates on focus/restore
		setupFocusTriggers();
	}
});
