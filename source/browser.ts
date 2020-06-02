import {ipcRenderer as ipc} from 'electron-better-ipc';
import {api, is} from 'electron-util';
import elementReady = require('element-ready');
import selectors from './browser/selectors';
import config from './config';
import {toggleVideoAutoplay} from './autoplay';
import {sendConversationList} from './browser/conversation-list';

const selectedConversationSelector = '._5l-3._1ht1._1ht2';
const preferencesSelector = '._10._4ebx.uiLayer._4-hy';
const messengerSoundsSelector = `${preferencesSelector} ._374d ._6bkz`;
const conversationMenuSelector = '.uiLayer:not(.hidden_elem) [role=menu]';

async function withMenu(
	menuButtonElement: HTMLElement,
	callback: () => Promise<void> | void
): Promise<void> {
	const {classList} = document.documentElement;

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
	const settingsMenu = (await elementReady<HTMLElement>('._30yy._6ymd._2agf,._30yy._2fug._p', {
		stopOnDomReady: false
	}))!;

	await withMenu(settingsMenu, callback);
}

function selectMenuItem(itemNumber: number): void {
	const selector = document.querySelector<HTMLElement>(
		`${conversationMenuSelector} > li:nth-child(${itemNumber}) a`
	);

	if (selector) {
		selector.click();
	}
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

ipc.answerMain('show-preferences', async () => {
	if (isPreferencesOpen()) {
		return;
	}

	await openPreferences();
});

ipc.answerMain('new-conversation', () => {
	document.querySelector<HTMLElement>('._30yy[data-href$="/new"]')!.click();
});

ipc.answerMain('log-out', async () => {
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

ipc.answerMain('find', () => {
	document.querySelector<HTMLElement>('._58al')!.focus();
});

ipc.answerMain('search', () => {
	document.querySelector<HTMLElement>('._3szo:nth-of-type(1)')!.click();
});

ipc.answerMain('insert-gif', () => {
	const gifElement =
		// Old UI
		document.querySelector<HTMLElement>('._yht') ??
		// New UI
		[...document.querySelectorAll<HTMLElement>('._7oam')].find(element =>
			element.querySelector<HTMLElement>('svg path[d^="M27.002,13.5"]')
		);

	gifElement!.click();
});

ipc.answerMain('insert-emoji', async () => {
	const emojiElement = (await elementReady<HTMLElement>('._5s2p, ._30yy._7odb', {
		stopOnDomReady: false
	}))!;

	emojiElement.click();
});

ipc.answerMain('insert-sticker', () => {
	const stickerElement =
		// Old UI
		document.querySelector<HTMLElement>('._4rv6') ??
		// New UI
		[...document.querySelectorAll<HTMLElement>('._7oam')].find(element =>
			element.querySelector<HTMLElement>('svg path[d^="M22.5,18.5 L27.998,18.5"]')
		);

	stickerElement!.click();
});

ipc.answerMain('attach-files', () => {
	document
		.querySelector<HTMLElement>('._5vn8 + input[type="file"], ._7oam input[type="file"]')!
		.click();
});

ipc.answerMain('focus-text-input', () => {
	document.querySelector<HTMLElement>('._7kpg ._5rpu')!.focus();
});

ipc.answerMain('next-conversation', nextConversation);

ipc.answerMain('previous-conversation', previousConversation);

ipc.answerMain('mute-conversation', async () => {
	await openMuteModal();
});

ipc.answerMain('delete-conversation', async () => {
	await deleteSelectedConversation();
});

ipc.answerMain('hide-conversation', async () => {
	const index = selectedConversationIndex();

	if (index !== -1) {
		await hideSelectedConversation();

		const key = index + 1;
		await jumpToConversation(key);
	}
});

async function openHiddenPreferences(): Promise<boolean> {
	if (!isPreferencesOpen()) {
		const style = document.createElement('style');
		// Hide both the backdrop and the preferences dialog
		style.textContent = `${preferencesSelector} ._3ixn, ${preferencesSelector} ._59s7 { opacity: 0 !important }`;
		document.body.append(style);

		await openPreferences();

		// Will clean up itself after the preferences are closed
		document.querySelector<HTMLElement>(preferencesSelector)!.append(style);

		return true;
	}

	return false;
}

async function toggleSounds(checked: boolean): Promise<void> {
	const shouldClosePreferences = await openHiddenPreferences();

	const soundsCheckbox = document.querySelector<HTMLInputElement>(messengerSoundsSelector)!;
	if (typeof checked === 'undefined' || checked !== soundsCheckbox.checked) {
		soundsCheckbox.click();
	}

	if (shouldClosePreferences) {
		closePreferences();
	}
}

ipc.answerMain('toggle-sounds', toggleSounds);

ipc.answerMain('toggle-mute-notifications', async (defaultStatus: boolean) => {
	const shouldClosePreferences = await openHiddenPreferences();

	const notificationCheckbox = document.querySelector<HTMLInputElement>(
		selectors.notificationCheckbox
	)!;

	if (defaultStatus === undefined) {
		notificationCheckbox.click();
	} else if (
		(defaultStatus && notificationCheckbox.checked) ||
		(!defaultStatus && !notificationCheckbox.checked)
	) {
		notificationCheckbox.click();
	}

	if (shouldClosePreferences) {
		closePreferences();
	}

	return !notificationCheckbox.checked;
});

ipc.answerMain('toggle-message-buttons', () => {
	document.body.classList.toggle('show-message-buttons', config.get('showMessageButtons'));
});

ipc.answerMain('show-active-contacts-view', async () => {
	await selectOtherListViews(3);
});

ipc.answerMain('show-message-requests-view', async () => {
	await selectOtherListViews(4);
});

ipc.answerMain('show-hidden-threads-view', async () => {
	await selectOtherListViews(5);
});

ipc.answerMain('toggle-unread-threads-view', async () => {
	await selectOtherListViews(6);
});

ipc.answerMain('toggle-video-autoplay', () => {
	toggleVideoAutoplay();
});

ipc.answerMain('reload', () => {
	location.reload();
})

function setDarkMode(): void {
	if (is.macos && config.get('followSystemAppearance')) {
		api.nativeTheme.themeSource = 'system';
	} else {
		api.nativeTheme.themeSource = config.get('darkMode') ? 'dark' : 'light';
	}

	document.documentElement.classList.toggle('dark-mode', api.nativeTheme.shouldUseDarkColors);
	updateVibrancy();
}

function setPrivateMode(): void {
	document.documentElement.classList.toggle('private-mode', config.get('privateMode'));

	if (is.macos) {
		sendConversationList();
	}
}

function updateVibrancy(): void {
	const {classList} = document.documentElement;

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

	ipc.callMain('set-vibrancy');
}

function updateSidebar(): void {
	const {classList} = document.documentElement;

	classList.remove('sidebar-hidden', 'sidebar-force-narrow', 'sidebar-force-wide');

	switch (config.get('sidebar')) {
		case 'hidden':
			classList.add('sidebar-hidden');
			break;
		case 'narrow':
			classList.add('sidebar-force-narrow');
			break;
		case 'wide':
			classList.add('sidebar-force-wide');
			break;
		default:
	}
}

async function updateDoNotDisturb(): Promise<void> {
	const shouldClosePreferences = await openHiddenPreferences();
	const soundsCheckbox = document.querySelector<HTMLInputElement>(messengerSoundsSelector)!;

	if (shouldClosePreferences) {
		closePreferences();
	}

	toggleSounds(await ipc.callMain('update-dnd-mode', soundsCheckbox.checked));
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

ipc.answerMain('update-sidebar', () => {
	updateSidebar();
});

ipc.answerMain('set-dark-mode', setDarkMode);

ipc.answerMain('set-private-mode', setPrivateMode);

ipc.answerMain('update-vibrancy', () => {
	updateVibrancy();
});

ipc.answerMain('render-overlay-icon', (messageCount: number): {data: string; text: string} => {
	return {
		data: renderOverlayIcon(messageCount).toDataURL(),
		text: String(messageCount)
	};
});

ipc.answerMain('render-native-emoji', (emoji: string): string => {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d')!;
	canvas.width = 256;
	canvas.height = 256;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	if (is.macos) {
		context.font = '256px system-ui';
		context.fillText(emoji, 128, 154);
	} else {
		context.textBaseline = 'bottom';
		context.font = '225px system-ui';
		context.fillText(emoji, 128, 256);
	}

	const dataUrl = canvas.toDataURL();
	return dataUrl;
});

ipc.answerMain('zoom-reset', () => {
	setZoom(1);
});

ipc.answerMain('zoom-in', () => {
	const zoomFactor = config.get('zoomFactor') + 0.1;

	if (zoomFactor < 1.6) {
		setZoom(zoomFactor);
	}
});

ipc.answerMain('zoom-out', () => {
	const zoomFactor = config.get('zoomFactor') - 0.1;

	if (zoomFactor >= 0.8) {
		setZoom(zoomFactor);
	}
});

ipc.answerMain('jump-to-conversation', async (key: number) => {
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
	const list = await elementReady<HTMLElement>(selectors.conversationList, {stopOnDomReady: false});

	if (!list) {
		console.error('Could not find conversations list', selectors.conversationList);
		return;
	}

	const conversation = list.children[index];

	if (!conversation) {
		console.error('Could not find conversation', index);
		return;
	}

	(conversation.firstChild!.firstChild as HTMLElement).click();
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
	node.textContent = `${selectors.conversationSelector} {zoom: ${zoomFactor} !important}`;
	config.set('zoomFactor', zoomFactor);
}

async function withConversationMenu(callback: () => void): Promise<void> {
	const menuButton = document.querySelector<HTMLElement>(
		`${selectedConversationSelector} [aria-haspopup=true] [role=button]`
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

/*
This function assumes:
- There is a selected conversation.
- That the conversation already has its conversation menu open.

In other words, you should only use this function within a callback that is provided to `withConversationMenu()`, because `withConversationMenu()` makes sure to have the conversation menu open before executing the callback and closes the conversation menu afterwards.
*/
function isSelectedConversationGroup(): boolean {
	const separator = document.querySelector<HTMLElement>(
		`${conversationMenuSelector} > li:nth-child(6)[role=separator]`
	);
	return Boolean(separator);
}

async function hideSelectedConversation(): Promise<void> {
	await withConversationMenu(() => {
		selectMenuItem(isSelectedConversationGroup() ? 4 : 3);
	});
}

async function deleteSelectedConversation(): Promise<void> {
	await withConversationMenu(() => {
		selectMenuItem(isSelectedConversationGroup() ? 5 : 4);
	});
}

async function openPreferences(): Promise<void> {
	await withSettingsMenu(() => {
		selectMenuItem(1);
	});

	await elementReady<HTMLElement>(preferencesSelector, {stopOnDomReady: false});
}

function isPreferencesOpen(): boolean {
	return Boolean(document.querySelector<HTMLElement>('._3quh._30yy._2t_._5ixy'));
}

function closePreferences(): void {
	const doneButton = document.querySelector<HTMLElement>('._3quh._30yy._2t_._5ixy')!;
	doneButton.click();
}

function insertionListener(event: AnimationEvent): void {
	if (event.animationName === 'nodeInserted' && event.target) {
		event.target.dispatchEvent(new Event('mouseover', {bubbles: true}));
	}
}

// Listen for emoji element dom insertion
document.addEventListener('animationstart', insertionListener, false);

// Inject a global style node to maintain custom appearance after conversation change or startup
document.addEventListener('DOMContentLoaded', async () => {
	const style = document.createElement('style');
	style.id = 'zoomFactor';
	document.body.append(style);

	// Set the zoom factor if it was set before quitting
	const zoomFactor = config.get('zoomFactor');
	setZoom(zoomFactor);

	// Enable OS specific styles
	document.documentElement.classList.add(`os-${process.platform}`);

	// Restore sidebar view state to what is was set before quitting
	updateSidebar();

	// Activate Dark Mode if it was set before quitting
	setDarkMode();

	// Activate Private Mode if it was set before quitting
	setPrivateMode();

	// Configure do not disturb
	if (is.macos) {
		await updateDoNotDisturb();
	}

	// Prevent flash of white on startup when in dark mode
	// TODO: find a CSS-only solution
	if (!is.macos && config.get('darkMode')) {
		document.documentElement.style.backgroundColor = '#1e1e1e';
	}

	// Disable autoplay if set in settings
	toggleVideoAutoplay();
});

// Handle title bar double-click.
window.addEventListener('dblclick', (event: Event) => {
	const target = event.target as HTMLElement;
	const titleBar = target.closest('._36ic._5l-3,._5742,._6-xk,._673w');

	if (!titleBar) {
		return;
	}

	ipc.callMain('titlebar-doubleclick');
}, {
	passive: true
});

window.addEventListener('load', () => {
	if (location.pathname.startsWith('/login')) {
		const keepMeSignedInCheckbox = document.querySelector<HTMLInputElement>('#u_0_0')!;
		keepMeSignedInCheckbox.checked = config.get('keepMeSignedIn');
		keepMeSignedInCheckbox.addEventListener('change', () => {
			config.set('keepMeSignedIn', !config.get('keepMeSignedIn'));
		});
	}
});

// Toggles styles for inactive window
window.addEventListener('blur', () => {
	document.documentElement.classList.add('is-window-inactive');
});
window.addEventListener('focus', () => {
	document.documentElement.classList.remove('is-window-inactive');
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
			await selectConversation(data.previousConversation);
		}
	}
});

function showNotification({id, title, body, icon, silent}: NotificationEvent): void {
	const image = new Image();
	image.crossOrigin = 'anonymous';
	image.src = icon;

	image.addEventListener('load', () => {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d')!;

		canvas.width = image.width;
		canvas.height = image.height;

		context.drawImage(image, 0, 0, image.width, image.height);

		ipc.callMain('notification', {
			id,
			title,
			body,
			icon: canvas.toDataURL(),
			silent
		});
	});
}

async function sendReply(message: string): Promise<void> {
	const inputField = document.querySelector<HTMLElement>('[contenteditable="true"]');
	if (!inputField) {
		return;
	}

	const previousMessage = inputField.textContent;

	// Send message
	inputField.focus();
	insertMessageText(message, inputField);

	const sendButton = await elementReady<HTMLElement>('._30yy._38lh', {stopOnDomReady: false});
	if (!sendButton) {
		console.error('Could not find send button');
		return;
	}

	sendButton.click();

	// Restore (possible) previous message
	if (previousMessage) {
		insertMessageText(previousMessage, inputField);
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

ipc.answerMain('notification-callback', (data: unknown) => {
	window.postMessage({type: 'notification-callback', data}, '*');
});

ipc.answerMain('notification-reply-callback', (data: any) => {
	const previousConversation = selectedConversationIndex();
	data.previousConversation = previousConversation;
	window.postMessage({type: 'notification-reply-callback', data}, '*');
});
