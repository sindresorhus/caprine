import {ipcRenderer as ipc, Event as ElectronEvent} from 'electron';
import {api, is} from 'electron-util';
import elementReady = require('element-ready');
import selectors from './browser/selectors';
import config from './config';
import {toggleVideoAutoplay} from './autoplay';
import {createConversationList} from './browser/conversation-list';

const selectedConversationSelector = '._5l-3._1ht1._1ht2';
const preferencesSelector = '._10._4ebx.uiLayer._4-hy';
const messengerSoundsSelector = `${preferencesSelector} ._374d ._6bkz`;

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
		`.uiLayer:not(.hidden_elem) ._54nq._2i-c._558b._2n_z li:nth-child(${itemNumber}) a`
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

ipc.on('show-preferences', async () => {
	if (isPreferencesOpen()) {
		return;
	}

	await openPreferences();
});

ipc.on('new-conversation', () => {
	document.querySelector<HTMLElement>('._30yy[data-href$="/new"]')!.click();
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
	const gifElement =
		// Old UI
		document.querySelector<HTMLElement>('._yht') ??
		// New UI
		[...document.querySelectorAll<HTMLElement>('._7oam')].find(element =>
			element.querySelector<HTMLElement>('svg path[d^="M27.002,13.5"]')
		);

	gifElement!.click();
});

ipc.on('insert-emoji', async () => {
	const emojiElement = (await elementReady<HTMLElement>('._5s2p, ._30yy._7odb', {
		stopOnDomReady: false
	}))!;

	emojiElement.click();
});

ipc.on('insert-sticker', () => {
	const stickerElement =
		// Old UI
		document.querySelector<HTMLElement>('._4rv6') ??
		// New UI
		[...document.querySelectorAll<HTMLElement>('._7oam')].find(element =>
			element.querySelector<HTMLElement>('svg path[d^="M22.5,18.5 L27.998,18.5"]')
		);

	stickerElement!.click();
});

ipc.on('attach-files', () => {
	document
		.querySelector<HTMLElement>('._5vn8 + input[type="file"], ._7oam input[type="file"]')!
		.click();
});

ipc.on('focus-text-input', () => {
	document.querySelector<HTMLElement>('._7kpg ._5rpu')!.focus();
});

ipc.on('next-conversation', nextConversation);

ipc.on('previous-conversation', previousConversation);

ipc.on('mute-conversation', async () => {
	await openMuteModal();
});

ipc.on('delete-conversation', async () => {
	await deleteSelectedConversation();
});

ipc.on('hide-conversation', async () => {
	const index = selectedConversationIndex();

	if (index !== -1) {
		await hideSelectedConversation();

		const key = index + 1;
		await jumpToConversation(key);
	}
});

function setSidebarVisibility(): void {
	document.documentElement.classList.toggle('sidebar-hidden', config.get('sidebarHidden'));

	ipc.send('set-sidebar-visibility');
}

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

ipc.on(
	'toggle-sounds',
	async (_event: ElectronEvent, checked: boolean): Promise<void> => {
		const shouldClosePreferences = await openHiddenPreferences();

		const soundsCheckbox = document.querySelector<HTMLInputElement>(messengerSoundsSelector)!;
		if (typeof checked === 'undefined' || checked !== soundsCheckbox.checked) {
			soundsCheckbox.click();
		}

		if (shouldClosePreferences) {
			closePreferences();
		}
	}
);

ipc.on('toggle-mute-notifications', async (_event: ElectronEvent, defaultStatus: boolean) => {
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

	ipc.send('mute-notifications-toggled', !notificationCheckbox.checked);

	if (shouldClosePreferences) {
		closePreferences();
	}
});

ipc.on('toggle-message-buttons', () => {
	document.body.classList.toggle('show-message-buttons', config.get('showMessageButtons'));
});

ipc.on('show-active-contacts-view', async () => {
	await selectOtherListViews(3);
});

ipc.on('show-message-requests-view', async () => {
	await selectOtherListViews(4);
});

ipc.on('show-hidden-threads-view', async () => {
	await selectOtherListViews(5);
});

ipc.on('toggle-unread-threads-view', async () => {
	await selectOtherListViews(6);
});

ipc.on('toggle-video-autoplay', () => {
	toggleVideoAutoplay();
});

function setDarkMode(): void {
	if (config.get('followSystemAppearance')) {
		api.nativeTheme.themeSource = 'system';
	} else {
		api.nativeTheme.themeSource = config.get('darkMode') ? 'dark' : 'light';
	}

	document.documentElement.classList.toggle('dark-mode', api.nativeTheme.shouldUseDarkColors);
	updateVibrancy();
}

async function setPrivateMode(): Promise<void> {
	document.documentElement.classList.toggle('private-mode', config.get('privateMode'));

	if (is.macos) {
		if (config.get('privateMode')) {
			ipc.send('hide-touchbar-labels');
		} else {
			const conversationsToRender: Conversation[] = await createConversationList();
			ipc.send('conversations', conversationsToRender);
		}
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

	ipc.send('set-vibrancy');
}

async function updateDoNotDisturb(): Promise<void> {
	const shouldClosePreferences = await openHiddenPreferences();
	const soundsCheckbox = document.querySelector<HTMLInputElement>(messengerSoundsSelector)!;

	if (shouldClosePreferences) {
		closePreferences();
	}

	ipc.send('update-dnd-mode', soundsCheckbox.checked);
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

ipc.on('set-private-mode', setPrivateMode);

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
		context.fillText(emoji, 128, 154);
	} else {
		context.textBaseline = 'bottom';
		context.font = '225px system-ui';
		context.fillText(emoji, 128, 256);
	}

	const dataUrl = canvas.toDataURL();
	ipc.send('native-emoji', {emoji, dataUrl});
});

ipc.on('zoom-reset', () => {
	setZoom(1);
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

async function hideSelectedConversation(): Promise<void> {
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

	// Hide sidebar if it was hidden before quitting
	setSidebarVisibility();

	// Activate Dark Mode if it was set before quitting
	setDarkMode();

	// Activate Private Mode if it was set before quitting
	await setPrivateMode();

	// Configure do not disturb
	if (is.macos) {
		await updateDoNotDisturb();
	}

	// Prevent flash of white on startup when in dark mode
	// TODO: find a CSS-only solution
	if (!is.macos && config.get('darkMode')) {
		// eslint-disable-next-line require-atomic-updates
		document.documentElement.style.backgroundColor = '#1e1e1e';
	}

	// Disable autoplay if set in settings
	toggleVideoAutoplay();
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

ipc.on('notification-callback', (_event: ElectronEvent, data: unknown) => {
	window.postMessage({type: 'notification-callback', data}, '*');
});

ipc.on('notification-reply-callback', (_event: ElectronEvent, data: any) => {
	const previousConversation = selectedConversationIndex();
	data.previousConversation = previousConversation;
	window.postMessage({type: 'notification-reply-callback', data}, '*');
});
