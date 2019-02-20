import { ipcRenderer as ipc, Event as ElectronEvent } from 'electron';
import elementReady from 'element-ready';
import { api, is } from 'electron-util';
import config from './config';

const listSelector = 'div[role="navigation"] > div > ul';
const conversationSelector = '._4u-c._1wfr > ._5f0v.uiScrollableArea';
const selectedConversationSelector = '._5l-3._1ht1._1ht2';
const preferencesSelector = '._10._4ebx.uiLayer._4-hy';

const conversationId = 'conversationWindow';

// A way to hold reference to conversation part of document 
// Used to refresh videoObserver after the conversation reference is lost
let conversationWindow: HTMLElement;
const conversationDivObserver = new MutationObserver(_ => {

	// First try to fetch by id as it's easily the fastest selector (querySelector is around 60% slower)
	let conversation = document.getElementById(conversationId);

	// Fetch it using querySelector if no luck with id
	if (!conversation)
		conversation = document.querySelector(conversationSelector);

	// If we have a new reference
	if (conversation && conversationWindow !== conversation) {
		// Add id so we can just getElementById
		conversation.id = conversationId;
		conversationWindow = conversation;
		startVideoObserver(conversationWindow);
	}
});

// Refence to mutation observer
// Only active if user has set preference to disable video autoplay
const videoObserver = new MutationObserver(_ => {
	const videos = getVideos();
	// If videos was added disable autoplay
	if (videos.length > 0)
		disableVideoAutoplay(videos);
});

async function withMenu(
	menuButtonElement: HTMLElement,
	callback: () => Promise<void> | void
): Promise<void> {
	const { classList } = document.documentElement;

	// Prevent the dropdown menu from displaying
	classList.add('hide-dropdowns');

	// Click the menu button
	menuButtonElement.click();

	// Wait for the menu to close before removing the 'hide-dropdowns' class
	const menuLayer = document.querySelector('.uiContextualLayerPositioner:not(.hidden_elem)');

	if (menuLayer) {
		const observer = new MutationObserver(() => {
			if (menuLayer.classList.contains('hidden_elem')) {
				classList.remove('hide-dropdowns');
				observer.disconnect();
			}
		});
		observer.observe(menuLayer, {attributes: true, attributeFilter: ['class']});
	} else {
		// Fallback in case .uiContextualLayerPositioner is missing
		classList.remove('hide-dropdowns');
	}

	await callback();
}

async function withSettingsMenu(callback: () => Promise<void> | void): Promise<void> {
	await withMenu(await elementReady('._30yy._2fug._p'), callback);
}

function selectMenuItem(itemNumber: number): void {
	const selector = document.querySelector<HTMLElement>(
		`.uiLayer:not(.hidden_elem) ._54nq._2i-c._558b._2n_z li:nth-child(${itemNumber}) a`
	)!;
	selector.click();
}

async function selectOtherListViews(itemNumber: number): Promise<void> {
	// In case one of other views is shown
	clickBackButton();

	await withSettingsMenu(() => {
		selectMenuItem(itemNumber);
	});
}

function clickBackButton(): void {
	const backButton = document.querySelector<HTMLElement>('._30yy._2oc9');

	if (backButton) {
		backButton.click();
	}
}

ipc.on('show-preferences', async () => {
	if (isPreferencesOpen()) {
		return;
	}

	await openPreferences();
});

ipc.on('new-conversation', () => {
	document.querySelector<HTMLElement>("._30yy[data-href$='/new']")!.click();
});

ipc.on('log-out', async () => {
	if (config.get('useWorkChat')) {
		document.querySelector<HTMLElement>('._5lxs._3qct._p')!.click();

		// Menu creation is slow
		setTimeout(() => {
			const nodes = document.querySelectorAll<HTMLElement>(
				'._54nq._9jo._558b._2n_z li:last-child a'
			);

			nodes[nodes.length - 1].click();
		}, 250);
	} else {
		await withSettingsMenu(() => {
			const nodes = document.querySelectorAll<HTMLElement>(
				'._54nq._2i-c._558b._2n_z li:last-child a'
			);

			nodes[nodes.length - 1].click();
		});
	}
});

ipc.on('find', () => {
	document.querySelector<HTMLElement>('._58al')!.focus();
});

ipc.on('search', () => {
	document.querySelector<HTMLElement>('._3szo:nth-of-type(1)')!.click();
});

ipc.on('insert-gif', () => {
	document.querySelector<HTMLElement>('._yht')!.click();
});

ipc.on('insert-emoji', () => {
	document.querySelector<HTMLElement>('._5s2p')!.click();
});

ipc.on('insert-text', () => {
	document.querySelector<HTMLElement>('._5rpu')!.focus();
});

ipc.on('next-conversation', nextConversation);

ipc.on('previous-conversation', previousConversation);

ipc.on('mute-conversation', async () => {
	await openMuteModal();
});

ipc.on('delete-conversation', async () => {
	await deleteSelectedConversation();
});

ipc.on('archive-conversation', async () => {
	const index = selectedConversationIndex();

	if (index !== -1) {
		await archiveSelectedConversation();

		const key = index + 1;
		await jumpToConversation(key);
	}
});

function setSidebarVisibility(): void {
	document.documentElement.classList.toggle('sidebar-hidden', config.get('sidebarHidden'));
	ipc.send('set-sidebar-visibility');
}

ipc.on('toggle-mute-notifications', async (_event: ElectronEvent, defaultStatus: boolean) => {
	const preferencesAreOpen = isPreferencesOpen();

	if (!preferencesAreOpen) {
		const style = document.createElement('style');
		// Hide both the backdrop and the preferences dialog
		style.textContent = `${preferencesSelector} ._3ixn, ${preferencesSelector} ._59s7 { opacity: 0 !important }`;
		document.body.append(style);

		await openPreferences();

		// Will clean up itself after the preferences are closed
		document.querySelector<HTMLElement>(preferencesSelector)!.append(style);
	}

	const notificationCheckbox = document.querySelector<HTMLInputElement>(
		'._374b:nth-of-type(4) ._4ng2 input'
	)!;

	if (defaultStatus === undefined) {
		notificationCheckbox.click();
	} else if (
		(defaultStatus && notificationCheckbox.checked) ||
		(!defaultStatus && !notificationCheckbox.checked)
	) {
		notificationCheckbox.click();
	}

	ipc.send('mute-notifications-toggled', !notificationCheckbox.checked);

	if (!preferencesAreOpen) {
		closePreferences();
	}
});

ipc.on('toggle-message-buttons', async () => {
	const messageButtons = await elementReady('._39bj');
	messageButtons.style.display = config.get('showMessageButtons') ? 'flex' : 'none';
});

ipc.on('show-active-contacts-view', () => {
	selectOtherListViews(3);
});

ipc.on('show-message-requests-view', () => {
	selectOtherListViews(4);
});

ipc.on('show-archived-threads-view', () => {
	selectOtherListViews(5);
});

ipc.on('toggle-unread-threads-view', () => {
	selectOtherListViews(6);
});

ipc.on('toggle-video-autoplay', () => {
	setAutoplayVideos();
});

function setDarkMode(): void {
	if (is.macos && config.get('followSystemAppearance')) {
		document.documentElement.classList.toggle('dark-mode', api.systemPreferences.isDarkMode());
	} else {
		document.documentElement.classList.toggle('dark-mode', config.get('darkMode'));
	}

	updateVibrancy();
}

function updateVibrancy(): void {
	const { classList } = document.documentElement;

	classList.remove('sidebar-vibrancy', 'full-vibrancy');

	switch (config.get('vibrancy')) {
		case 'sidebar':
			classList.add('sidebar-vibrancy');
			break;
		case 'full':
			classList.add('full-vibrancy');
			break;
		default:
	}

	ipc.send('set-vibrancy');
}

function renderOverlayIcon(messageCount: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.height = 128;
	canvas.width = 128;
	canvas.style.letterSpacing = '-5px';

	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#f42020';
	ctx.beginPath();
	ctx.ellipse(64, 64, 64, 64, 0, 0, 2 * Math.PI);
	ctx.fill();
	ctx.textAlign = 'center';
	ctx.fillStyle = 'white';
	ctx.font = '90px sans-serif';
	ctx.fillText(String(Math.min(99, messageCount)), 64, 96);

	return canvas;
}

ipc.on('toggle-sidebar', () => {
	config.set('sidebarHidden', !config.get('sidebarHidden'));
	setSidebarVisibility();
});

ipc.on('set-dark-mode', setDarkMode);

ipc.on('update-vibrancy', () => {
	updateVibrancy();
});

ipc.on('render-overlay-icon', (_event: ElectronEvent, messageCount: number) => {
	ipc.send(
		'update-overlay-icon',
		renderOverlayIcon(messageCount).toDataURL(),
		String(messageCount)
	);
});

ipc.on('render-native-emoji', (_event: ElectronEvent, emoji: string) => {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d')!;
	canvas.width = 256;
	canvas.height = 256;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	if (is.macos) {
		context.font = '256px system-ui';
		context.fillText(emoji, 128, 140);
	} else {
		context.font = '225px system-ui';
		context.fillText(emoji, 128, 115);
	}

	const dataUrl = canvas.toDataURL();
	ipc.send('native-emoji', {emoji, dataUrl});
});

ipc.on('zoom-reset', () => {
	setZoom(1.0);
});

ipc.on('zoom-in', () => {
	const zoomFactor = config.get('zoomFactor') + 0.1;

	if (zoomFactor < 1.6) {
		setZoom(zoomFactor);
	}
});

ipc.on('zoom-out', () => {
	const zoomFactor = config.get('zoomFactor') - 0.1;

	if (zoomFactor >= 0.8) {
		setZoom(zoomFactor);
	}
});

ipc.on('jump-to-conversation', async (_event: ElectronEvent, key: number) => {
	await jumpToConversation(key);
});

async function nextConversation(): Promise<void> {
	const index = selectedConversationIndex(1);

	if (index !== -1) {
		await selectConversation(index);
	}
}

async function previousConversation(): Promise<void> {
	const index = selectedConversationIndex(-1);

	if (index !== -1) {
		await selectConversation(index);
	}
}

async function jumpToConversation(key: number): Promise<void> {
	const index = key - 1;
	await selectConversation(index);
}

// Focus on the conversation with the given index
async function selectConversation(index: number): Promise<void> {
	const conversationElement = (await elementReady(listSelector)).children[index];

	if (conversationElement) {
		(conversationElement.firstChild!.firstChild as HTMLElement).click();
	}
}

function selectedConversationIndex(offset = 0): number {
	const selected = document.querySelector<HTMLElement>(selectedConversationSelector);

	if (!selected) {
		return -1;
	}

	const list = [...selected.parentNode!.children];
	const index = list.indexOf(selected) + offset;

	return ((index % list.length) + list.length) % list.length;
}

function setZoom(zoomFactor: number): void {
	const node = document.querySelector<HTMLElement>('#zoomFactor')!;
	node.textContent = `${conversationSelector} {zoom: ${zoomFactor} !important}`;
	config.set('zoomFactor', zoomFactor);
}

async function withConversationMenu(callback: () => void): Promise<void> {
	const menuButton = document.querySelector<HTMLElement>(
		`${selectedConversationSelector} ._5blh._4-0h`
	);

	if (menuButton) {
		await withMenu(menuButton, callback);
	}
}

async function openMuteModal(): Promise<void> {
	await withConversationMenu(() => {
		selectMenuItem(1);
	});
}

async function archiveSelectedConversation(): Promise<void> {
	const groupConversationProfilePicture = document.querySelector<HTMLElement>(
		`${selectedConversationSelector} ._55lu`
	);
	const isGroupConversation = Boolean(groupConversationProfilePicture);

	await withConversationMenu(() => {
		selectMenuItem(isGroupConversation ? 4 : 3);
	});
}

async function deleteSelectedConversation(): Promise<void> {
	const groupConversationProfilePicture = document.querySelector<HTMLElement>(
		`${selectedConversationSelector} ._55lu`
	);
	const isGroupConversation = Boolean(groupConversationProfilePicture);

	await withConversationMenu(() => {
		selectMenuItem(isGroupConversation ? 5 : 4);
	});
}

async function openPreferences(): Promise<void> {
	await withSettingsMenu(() => {
		selectMenuItem(1);
	});
}

function isPreferencesOpen(): boolean {
	return Boolean(document.querySelector<HTMLElement>('._3quh._30yy._2t_._5ixy'));
}

function closePreferences(): void {
	const doneButton = document.querySelector<HTMLElement>('._3quh._30yy._2t_._5ixy')!;
	doneButton.click();
}

async function sendConversationList(): Promise<void> {
	const conversations: Conversation[] = await Promise.all(
		([...(await elementReady(listSelector)).children] as HTMLElement[])
			.splice(0, 10)
			.map(async (el: HTMLElement) => {
				const profilePic = el.querySelector<HTMLImageElement>('._55lt img');
				const groupPic = el.querySelector<HTMLImageElement>('._4ld- div');

				// This is only for group chats
				if (groupPic) {
					// Slice image source from background-image style property of div
					const bgImage = groupPic.style.backgroundImage!;
					groupPic.src = bgImage.slice(5, bgImage.length - 2);
				}

				const isConversationMuted = el.classList.contains('_569x');

				return {
					label: el.querySelector<HTMLElement>('._1ht6')!.textContent!,
					selected: el.classList.contains('_1ht2'),
					unread: el.classList.contains('_1ht3') && !isConversationMuted,
					icon: await getDataUrlFromImg(
						profilePic ? profilePic : groupPic!,
						el.classList.contains('_1ht3')
					)
				};
			})
	);

	ipc.send('conversations', conversations);
}

// Return canvas with rounded image
async function urlToCanvas(url: string, size: number): Promise<HTMLCanvasElement> {
	return new Promise(resolve => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.addEventListener('load', () => {
			const canvas = document.createElement('canvas');
			const padding = {
				top: 3,
				right: 0,
				bottom: 3,
				left: 0
			};

			canvas.width = size + padding.left + padding.right;
			canvas.height = size + padding.top + padding.bottom;

			const ctx = canvas.getContext('2d')!;
			ctx.save();
			ctx.beginPath();
			ctx.arc(size / 2 + padding.left, size / 2 + padding.top, size / 2, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.clip();
			ctx.drawImage(img, padding.left, padding.top, size, size);
			ctx.restore();

			resolve(canvas);
		});

		img.src = url;
	});
}

// Return data url for user avatar
async function getDataUrlFromImg(img: HTMLImageElement, unread: boolean): Promise<string> {
	// eslint-disable-next-line no-async-promise-executor
	return new Promise(async resolve => {
		if (unread) {
			const dataUnreadUrl = img.getAttribute('dataUnreadUrl');

			if (dataUnreadUrl) {
				return resolve(dataUnreadUrl);
			}
		} else {
			const dataUrl = img.getAttribute('dataUrl');

			if (dataUrl) {
				return resolve(dataUrl);
			}
		}

		const canvas = await urlToCanvas(img.src, 30);
		const ctx = canvas.getContext('2d')!;
		const dataUrl = canvas.toDataURL();
		img.setAttribute('dataUrl', dataUrl);

		if (!unread) {
			return resolve(dataUrl);
		}

		const markerSize = 8;
		ctx.fillStyle = '#f42020';
		ctx.beginPath();
		ctx.ellipse(canvas.width - markerSize, markerSize, markerSize, markerSize, 0, 0, 2 * Math.PI);
		ctx.fill();
		const dataUnreadUrl = canvas.toDataURL();
		img.setAttribute('dataUnreadUrl', dataUnreadUrl);

		resolve(dataUnreadUrl);
	});
}

// Inject a global style node to maintain custom appearance after conversation change or startup
document.addEventListener('DOMContentLoaded', () => {
	const style = document.createElement('style');
	style.id = 'zoomFactor';
	document.body.append(style);

	// Set the zoom factor if it was set before quitting
	const zoomFactor = config.get('zoomFactor') || 1;
	setZoom(zoomFactor);

	// Enable OS specific styles
	document.documentElement.classList.add(`os-${process.platform}`);

	// Hide sidebar if it was hidden before quitting
	setSidebarVisibility();

	// Activate Dark Mode if it was set before quitting
	setDarkMode();

	// Prevent flash of white on startup when in dark mode
	// TODO: find a CSS-only solution
	if (!is.macos && config.get('darkMode')) {
		document.documentElement.style.backgroundColor = '#1e1e1e';
	}

	// Disable autoplay if set in settings
	setAutoplayVideos();
});

window.addEventListener('load', () => {
	const sidebar = document.querySelector<HTMLElement>('[role=navigation]');

	if (sidebar) {
		sendConversationList();

		const conversationListObserver = new MutationObserver(sendConversationList);
		conversationListObserver.observe(sidebar, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['class']
		});
	}

	if (location.pathname.startsWith('/login')) {
		const keepMeSignedInCheckbox = document.querySelector<HTMLInputElement>('#u_0_0')!;
		keepMeSignedInCheckbox.checked = config.get('keepMeSignedIn');
		keepMeSignedInCheckbox.addEventListener('change', () => {
			config.set('keepMeSignedIn', !config.get('keepMeSignedIn'));
		});
	}
});

// It's not possible to add multiple accelerators
// so this needs to be done the old-school way
document.addEventListener('keydown', async event => {
	// The `!event.altKey` part is a workaround for https://github.com/electron/electron/issues/13895
	const combineKey = is.macos ? event.metaKey : event.ctrlKey && !event.altKey;

	if (!combineKey) {
		return;
	}

	if (event.key === ']') {
		await nextConversation();
	}

	if (event.key === '[') {
		await previousConversation();
	}

	const num = parseInt(event.code.slice(-1), 10);

	if (num >= 1 && num <= 9) {
		await jumpToConversation(num);
	}
});

// Pass events sent via `window.postMessage` on to the main process
window.addEventListener('message', async ({data: {type, data}}) => {
	if (type === 'notification') {
		showNotification(data);
	}

	if (type === 'notification-reply') {
		await sendReply(data.reply);
		if (data.previousConversation) {
			selectConversation(data.previousConversation);
		}
	}
});

function showNotification({ id, title, body, icon, silent }: NotificationEvent): void {
	const img = new Image();
	img.crossOrigin = 'anonymous';
	img.src = icon;

	img.addEventListener('load', () => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;

		canvas.width = img.width;
		canvas.height = img.height;

		ctx.drawImage(img, 0, 0, img.width, img.height);

		ipc.send('notification', {
			id,
			title,
			body,
			icon: canvas.toDataURL(),
			silent
		});
	});
}

async function sendReply(message: string): Promise<void> {
	const inputField = document.querySelector('[contenteditable="true"]') as HTMLElement;
	const previousMessage = inputField.textContent;
	if (inputField) {
		// Send message
		inputField.focus();
		insertMessageText(message, inputField);
		(await elementReady('._30yy._38lh')).click();

		// Restore (possible) previous message
		if (previousMessage) {
			insertMessageText(previousMessage, inputField);
		}
	}
}

function insertMessageText(text: string, inputField: HTMLElement): void {
	// Workaround: insert placeholder value to get execCommand working
	if (!inputField.textContent) {
		const event = document.createEvent('TextEvent');
		event.initTextEvent('textInput', true, true, window, '_', 0, '');
		inputField.dispatchEvent(event);
	}

	document.execCommand('selectAll', false, undefined);
	document.execCommand('insertText', false, text);
}

ipc.on('notification-callback', (_event: ElectronEvent, data: unknown) => {
	window.postMessage({ type: 'notification-callback', data }, '*');
});

function startConversationWindowObserver(): void {
	conversationDivObserver.observe(document.documentElement, {
		childList: true,
		subtree: true,
	});
}

function startVideoObserver(element: HTMLElement): void {
	videoObserver.observe(element, {
		childList: true,
		subtree: true,
	});
}

// Hold reference to videos user has started playing
// Enables us to check if video is autoplaying for example when changing conversation
const playedVideos: HTMLVideoElement[] = [];

function disableVideoAutoplay(videos: HTMLCollectionOf<HTMLVideoElement>): void {
	for (const video of videos) {
		// Dont disable currently playing videos and skip already initialized videos
		if (playedVideos.includes(video)) continue;
		const firstParent = video.parentElement!;

		// Video parent element which has a snapshot of video as background-image 
		const parentWithBackground = video.parentElement!.parentElement!.parentElement!;

		// Hold reference to background parent so we can revert our changes
		const parentWithBackgroundParent = parentWithBackground.parentElement!;

		// Reference to original play icon on top of the video
		const playIcon = video.nextElementSibling!.nextElementSibling! as HTMLElement;
		// If video is playing the icon is hidden
		playIcon.classList.remove('hidden_elem');

		// Set id so we can easily trigger click-event when reverting changes
		playIcon.setAttribute('id', 'disabled_autoplay');

		const {
			style: {
				width: width,
				height: height,
			}
		} = firstParent;

		const style =
			parentWithBackground.style || window.getComputedStyle(parentWithBackground);
		const backgroundImageSrc = style.backgroundImage!.slice(4, -1).replace(/"/g, '');

		// Create image to replace video as a placeholder
		const img = document.createElement('img');
		img.setAttribute('src', backgroundImageSrc);
		img.setAttribute('height', height!);
		img.setAttribute('width', width!);

		// Create seperate instance of the play icon
		// Clone the existing icon to get original events
		// Without creating a new icon Messenger autohides the icon when scrolled to video
		const copyedPlayIcon = playIcon.cloneNode(true) as HTMLElement;

		// Remove image and new play icon and append the original divs
		// We can enable autoplay again by triggering this event
		copyedPlayIcon.addEventListener('play', () => {
			img.remove()
			copyedPlayIcon.remove();
			parentWithBackgroundParent.prepend(parentWithBackground);
		});

		// Separate handler for click so we know if it was user who played the video
		copyedPlayIcon.addEventListener('click', () => {
			playedVideos.push(video);
			var event = new Event('play');
			copyedPlayIcon.dispatchEvent(event);
			// Sometimes video doesnt start playing even tho we trigger the click event
			// As a workaround check if video didnt start playing and manually trigger the click event
			setTimeout(() => {
				if (video.paused) {
					playIcon.click();
				}
			}, 50);
		});

		parentWithBackgroundParent.prepend(img);
		parentWithBackgroundParent.prepend(copyedPlayIcon);
		parentWithBackground.remove();
	}
}

// If we previously disabled autoplay on videos trigger copyedPlayIcon click event to revert changes
function enableVideoAutoplay(): void {
	const playIcons = document.querySelectorAll('#disabled_autoplay');
	for (const icon of playIcons) {
		var event = new Event('play');
		icon.dispatchEvent(event);
	}
}


function setAutoplayVideos(): void {
	if (config.get('videoAutoplay')) {
		// Stop the observers
		conversationDivObserver.disconnect();
		videoObserver.disconnect();

		// Revert previous changes
		enableVideoAutoplay();
	} else {
		// Start the observer
		startConversationWindowObserver();

		// Trigger once manually before observers kick in
		disableVideoAutoplay(getVideos());
	}
}

function getVideos(): HTMLCollectionOf<HTMLVideoElement> {
	return document.getElementsByTagName('video');
}
ipc.on('notification-reply-callback', (_event: ElectronEvent, data: any) => {
	const previousConversation = selectedConversationIndex();
	data.previousConversation = previousConversation;
	window.postMessage({type: 'notification-reply-callback', data}, '*');
});
