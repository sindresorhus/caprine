import process from 'node:process';
import {webFrame} from 'electron';
import {ipcRenderer as ipc} from 'electron-better-ipc';
import {is} from 'electron-util';
import elementReady from 'element-ready';
import {nativeTheme} from '@electron/remote';
import selectors from './browser/selectors';
import {toggleVideoAutoplay} from './autoplay';
import {sendConversationList} from './browser/conversation-list';
import {IToggleSounds, IToggleMuteNotifications} from './types';

type ThemeSource = typeof nativeTheme.themeSource;

// Inject scrollbar-hiding CSS immediately in preload to prevent white flash
webFrame.insertCSS('html::-webkit-scrollbar { display: none !important; }');

async function withMenu(
	menuButtonElement: HTMLElement,
	callback: () => Promise<void> | void,
): Promise<void> {
	// Click the menu button
	menuButtonElement.click();

	// Wait for menu items to actually render
	await elementReady(`${selectors.conversationMenuSelectorNewDesign} [role=menuitem]`, {
		stopOnDomReady: false,
	});

	// Additional wait to ensure all menu items are fully rendered and positioned
	await new Promise(resolve => {
		setTimeout(resolve, 100);
	});

	// Execute callback to click the desired menu item
	await callback();
}

ipc.answerMain('show-preferences', async () => {
	if (isPreferencesOpen()) {
		return;
	}

	await openPreferences();
});

ipc.answerMain('new-conversation', async () => {
	document.querySelector<HTMLElement>('a[href="/messages/new/"]')!.click();
});

ipc.answerMain('create-channel', async () => {
	// Click "New message" button to open the dialog
	document.querySelector<HTMLElement>('a[href="/messages/new/"]')!.click();

	// Wait for the "Create channel" element to appear
	const createChannelElement = await elementReady<HTMLElement>('#newBroadcastChannel div', {
		stopOnDomReady: false,
	});

	if (createChannelElement) {
		createChannelElement.click();
	}
});

ipc.answerMain('log-out', async () => {
	const useWorkChat = await ipc.callMain<undefined, boolean>('get-config-useWorkChat');
	if (useWorkChat) {
		document.querySelector<HTMLElement>('._5lxs._3qct._p')!.click();

		// Menu creation is slow
		setTimeout(() => {
			const nodes = document.querySelectorAll<HTMLElement>(
				'._54nq._9jo._558b._2n_z li:last-child a',
			);

			nodes[nodes.length - 1].click();
		}, 250);
	} else {
		const banner = document.querySelector<HTMLElement>('[role="banner"]');

		// Temporarily show the banner so the profile button is interactive
		if (banner) {
			banner.style.setProperty('display', 'block', 'important');
		}

		// Click the profile button (last [aria-expanded] button in banner)
		const profileButtons = [...document.querySelectorAll<HTMLElement>(selectors.userProfileButton)];
		profileButtons[profileButtons.length - 1]?.click();

		// Wait for the profile dropdown to render
		await new Promise(resolve => {
			setTimeout(resolve, 300);
		});

		// Find the logout button inside the profile dialog.
		// The dialog contains: [...items..., Log out, More (aria-haspopup=menu)]
		// Logout is always the button immediately before the "More" expand button.
		const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
		if (dialog) {
			const dialogButtons = [...dialog.querySelectorAll<HTMLElement>('[role="button"]')]
				.filter(b => b.offsetParent !== null);
			const moreIndex = dialogButtons.findIndex(b => b.getAttribute('aria-haspopup') === 'menu');
			if (moreIndex > 0) {
				dialogButtons[moreIndex - 1]?.click();
			} else {
				// Fallback: last button in dialog
				dialogButtons[dialogButtons.length - 1]?.click();
			}
		}

		// Restore banner to hidden state
		if (banner) {
			banner.style.removeProperty('display');
		}
	}
});

ipc.answerMain('find', () => {
	// Scope to the Messenger nav (which contains [role=grid]) to avoid focusing
	// the main Facebook site search bar (index 0 on the page)
	document.querySelector<HTMLElement>('[role="navigation"]:has([role=grid]) input[type="search"]')!.focus();
});

async function openSearchInConversation() {
	const chatInfoButton = document.querySelector<HTMLElement>('[role=button]:has(path[d^="M18,10 C16.6195"])');
	const isPanelExpanded = chatInfoButton?.getAttribute('aria-expanded') === 'true';

	// Expand the right panel if it's collapsed
	if (!isPanelExpanded) {
		document.querySelector<HTMLElement>(selectors.rightSidebarMenu)?.click();
		// Wait for panel to expand and search button to appear
		await new Promise(resolve => {
			setTimeout(resolve, 300);
		});
	}

	// Click the Search button in the right panel (SVG path, language-independent)
	document.querySelector<HTMLElement>('[role=button]:has(path[d^="M7.5 1"])')?.click();
}

ipc.answerMain('search', () => {
	openSearchInConversation();
});

ipc.answerMain('insert-gif', () => {
	document.querySelector<HTMLElement>('[role=button]:has(path[d^="M7.695"])')!.click();
});

ipc.answerMain('insert-emoji', async () => {
	document.querySelector<HTMLElement>('[role=button]:has(path[d^="M210.5,405"])')!.click();
});

ipc.answerMain('insert-sticker', () => {
	document.querySelector<HTMLElement>('[role=button]:has(path[d^="M8.305"])')!.click();
});

ipc.answerMain('attach-files', () => {
	document.querySelector<HTMLElement>('[role=button]:has(path[d^="M7 4.25"])')!.click();
});

ipc.answerMain('focus-text-input', () => {
	document.querySelector<HTMLElement>('[role=textbox][contenteditable=true]')!.focus();
});

ipc.answerMain('next-conversation', nextConversation);

ipc.answerMain('previous-conversation', previousConversation);

ipc.answerMain('mute-conversation', async () => {
	await openMuteModal();
});

ipc.answerMain('delete-conversation', async () => {
	const index = selectedConversationIndex();

	if (index !== -1) {
		await deleteSelectedConversation();

		const key = index + 1;
		await jumpToConversation(key);
	}
});

ipc.answerMain('archive-conversation', async () => {
	const index = selectedConversationIndex();

	if (index !== -1) {
		await archiveSelectedConversation();

		const key = index + 1;
		await jumpToConversation(key);
	}
});

async function openHiddenPreferences(): Promise<boolean> {
	if (!isPreferencesOpen()) {
		document.documentElement.classList.add('hide-preferences-window');

		await openPreferences();

		return true;
	}

	return false;
}

async function toggleSounds({checked}: IToggleSounds): Promise<void> {
	const shouldClosePreferences = await openHiddenPreferences();

	const soundsCheckbox = document.querySelector<HTMLInputElement>(selectors.notificationCheckbox)!;
	if (checked === undefined || checked !== soundsCheckbox.checked) {
		soundsCheckbox.click();
	}

	if (shouldClosePreferences) {
		await closePreferences();
	}
}

ipc.answerMain('toggle-sounds', toggleSounds);

// Get current mute state without opening preferences (for startup sync)
ipc.answerMain('get-mute-notifications-state', async () => {
	const shouldClosePreferences = await openHiddenPreferences();

	const notificationSwitch = document.querySelector<HTMLInputElement>(
		selectors.notificationCheckbox,
	);

	if (notificationSwitch) {
		const isCurrentlyChecked = notificationSwitch.getAttribute('aria-checked') === 'true';
		const isCurrentlyMuted = !isCurrentlyChecked;

		if (shouldClosePreferences) {
			await closePreferences();
		}

		return isCurrentlyMuted;
	}

	if (shouldClosePreferences) {
		await closePreferences();
	}

	return false;
});

ipc.answerMain('toggle-mute-notifications', async ({checked}: IToggleMuteNotifications) => {
	const shouldClosePreferences = await openHiddenPreferences();

	const notificationSwitch = document.querySelector<HTMLInputElement>(
		selectors.notificationCheckbox,
	);

	if (notificationSwitch) {
		// Check current state
		const isCurrentlyChecked = notificationSwitch.getAttribute('aria-checked') === 'true';
		const isCurrentlyMuted = !isCurrentlyChecked;

		// Only toggle if current state doesn't match desired state
		// checked=true means user wants to MUTE (turn switch OFF)
		// checked=false means user wants to UNMUTE (turn switch ON)
		if (isCurrentlyMuted !== checked) {
			notificationSwitch.click();
		}

		if (shouldClosePreferences) {
			await closePreferences();
		}

		// Return the muted state
		return checked;
	}

	if (shouldClosePreferences) {
		await closePreferences();
	}

	// Return false if switch not found
	return false;
});

ipc.answerMain('toggle-message-buttons', async () => {
	const showMessageButtons = await ipc.callMain<undefined, boolean>('get-config-showMessageButtons');
	document.body.classList.toggle('show-message-buttons', !showMessageButtons);
});

async function openSettingsMenuAndClickItem(
	identifier: string | {svgPathPrefix: string},
	options?: {useExactMatch?: boolean; waitForSelector?: string},
): Promise<void> {
	// Click the Settings button
	const settingsButton = document.querySelector<HTMLElement>(selectors.userMenuNewSidebar);
	if (!settingsButton) {
		return;
	}

	settingsButton.click();

	// Wait for the menu to appear
	await elementReady(selectors.conversationMenuSelectorNewDesign, {stopOnDomReady: false});

	// Find and click the menu item by text (English) or SVG icon path (language-independent)
	const menuItems = document.querySelectorAll<HTMLElement>(
		`${selectors.conversationMenuSelectorNewDesign} [role="menuitem"]`,
	);

	for (const item of menuItems) {
		let matches: boolean;
		if (typeof identifier === 'string') {
			const text = item.textContent?.trim();
			matches = options?.useExactMatch ? text === identifier : Boolean(text?.includes(identifier));
		} else {
			matches = Boolean(item.querySelector(`path[d^="${identifier.svgPathPrefix}"]`));
		}

		if (matches) {
			item.click();
			break;
		}
	}

	// Optionally wait for something to appear after clicking
	if (options?.waitForSelector) {
		await elementReady(options.waitForSelector, {stopOnDomReady: false});
	}
}

ipc.answerMain('show-chats-view', async () => {
	await ipc.callMain('navigate-to-chats');
});

ipc.answerMain('show-requests-view', async () => {
	await openSettingsMenuAndClickItem({svgPathPrefix: 'M95.5 219.208'});
});

ipc.answerMain('show-archive-view', async () => {
	await openSettingsMenuAndClickItem({svgPathPrefix: 'M109.5 207.75'});
});

ipc.answerMain('show-restricted-view', async () => {
	await openSettingsMenuAndClickItem({svgPathPrefix: 'M92.75 262'});
});

ipc.answerMain('toggle-video-autoplay', () => {
	toggleVideoAutoplay();
});

ipc.answerMain('reload', () => {
	location.reload();
});

async function setTheme(): Promise<void> {
	const theme = await ipc.callMain<undefined, ThemeSource>('get-config-theme');

	if (nativeTheme.themeSource !== theme) {
		nativeTheme.themeSource = theme;
	}

	setThemeElement(document.documentElement);
	updateVibrancy();
}

function setThemeElement(element: HTMLElement): void {
	const useDarkColors = Boolean(nativeTheme.shouldUseDarkColors);
	element.classList.toggle('dark-mode', useDarkColors);
	element.classList.toggle('light-mode', !useDarkColors);
	element.classList.toggle('__fb-dark-mode', useDarkColors);
	element.classList.toggle('__fb-light-mode', !useDarkColors);
	removeThemeClasses(useDarkColors);
}

function removeThemeClasses(useDarkColors: boolean): void {
	// TODO: Workaround for Facebooks buggy frontend
	// The ui sometimes hardcodes ligth mode classes in the ui. This removes them so the class
	// in the root element would be used.
	const className = useDarkColors ? '__fb-light-mode' : '__fb-dark-mode';
	for (const element of document.querySelectorAll(`.${className}`)) {
		element.classList.remove(className);
	}
}

async function observeTheme(): Promise<void> {
	/* Listen for native theme changes (e.g., OS theme change when themeSource is 'system') */
	nativeTheme.on('updated', setTheme);

	/* Main document's class list */
	const observer = new MutationObserver((records: MutationRecord[]) => {
		// Find records that had class attribute changed
		const classRecords = records.filter(record => record.type === 'attributes' && record.attributeName === 'class');
		// Check if dark mode classes exists
		const isDark = classRecords.some(record => {
			const {classList} = (record.target as HTMLElement);
			return classList.contains('dark-mode') && classList.contains('__fb-dark-mode');
		});
		// If config and class list don't match, update class list
		if (nativeTheme.shouldUseDarkColors !== isDark) {
			setTheme();
		}
	});

	observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});

	/* Added nodes (dialogs, etc.) */
	const observerNew = new MutationObserver((records: MutationRecord[]) => {
		const nodeRecords = records.filter(record => record.addedNodes.length > 0);
		for (const nodeRecord of nodeRecords) {
			for (const newNode of nodeRecord.addedNodes) {
				const {classList} = (newNode as HTMLElement);
				const isLight = classList.contains('light-mode') || classList.contains('__fb-light-mode');
				if (nativeTheme.shouldUseDarkColors === isLight) {
					setThemeElement(newNode as HTMLElement);
				}
			}
		}
	});

	/* Observe only elements where new nodes may need dark mode */
	const menuElements = await elementReady('.j83agx80.cbu4d94t.l9j0dhe7.jgljxmt5.be9z9djy > div:nth-of-type(2) > div', {stopOnDomReady: false});
	if (menuElements) {
		observerNew.observe(menuElements, {childList: true});
	}

	const modalElements = await elementReady(selectors.preferencesSelector, {stopOnDomReady: false});
	if (modalElements) {
		observerNew.observe(modalElements, {childList: true});
	}
}

async function setPrivateMode(): Promise<void> {
	const privateMode = await ipc.callMain<undefined, boolean>('get-config-privateMode');
	document.documentElement.classList.toggle('private-mode', privateMode);

	if (is.macos) {
		sendConversationList();
	}
}

async function updateVibrancy(): Promise<void> {
	const {classList} = document.documentElement;

	classList.remove('sidebar-vibrancy', 'full-vibrancy');

	const vibrancy = await ipc.callMain<undefined, 'sidebar' | 'none' | 'full'>('get-config-vibrancy');

	switch (vibrancy) {
		case 'sidebar': {
			classList.add('sidebar-vibrancy');
			break;
		}

		case 'full': {
			classList.add('full-vibrancy');
			break;
		}

		default:
	}

	ipc.callMain('set-vibrancy');
}

async function updateSidebar(): Promise<void> {
	const {classList} = document.documentElement;

	classList.remove('sidebar-hidden', 'sidebar-force-narrow', 'sidebar-force-wide');

	const sidebar = await ipc.callMain<undefined, 'default' | 'hidden' | 'narrow' | 'wide'>('get-config-sidebar');

	switch (sidebar) {
		case 'hidden': {
			classList.add('sidebar-hidden');
			break;
		}

		case 'narrow': {
			classList.add('sidebar-force-narrow');
			break;
		}

		case 'wide': {
			classList.add('sidebar-force-wide');
			break;
		}

		default:
	}
}

async function updateDoNotDisturb(): Promise<void> {
	/* TODO: Implement this function
	const shouldClosePreferences = await openHiddenPreferences();

	if (shouldClosePreferences) {
		await closePreferences();
	}
	*/
}

function renderOverlayIcon(messageCount: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.height = 128;
	canvas.width = 128;
	canvas.style.letterSpacing = '-5px';

	const context = canvas.getContext('2d')!;
	context.fillStyle = '#f42020';
	context.beginPath();
	context.ellipse(64, 64, 64, 64, 0, 0, 2 * Math.PI);
	context.fill();
	context.textAlign = 'center';
	context.fillStyle = 'white';
	context.font = '90px sans-serif';
	context.fillText(String(Math.min(99, messageCount)), 64, 96);

	return canvas;
}

ipc.answerMain('update-sidebar', () => {
	updateSidebar();
});

ipc.answerMain('set-theme', setTheme);

ipc.answerMain('set-private-mode', setPrivateMode);

ipc.answerMain('update-vibrancy', () => {
	updateVibrancy();
});

ipc.answerMain('render-overlay-icon', (messageCount: number): {data: string; text: string} => ({
	data: renderOverlayIcon(messageCount).toDataURL(),
	text: String(messageCount),
}));

ipc.answerMain('render-native-emoji', (emoji: string): string => {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d')!;
	const systemFont = is.linux ? 'emoji, system-ui' : 'system-ui';
	canvas.width = 256;
	canvas.height = 256;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	if (is.macos) {
		context.font = `256px ${systemFont}`;
		context.fillText(emoji, 128, 154);
	} else {
		context.textBaseline = 'bottom';
		context.font = `225px ${systemFont}`;
		context.fillText(emoji, 128, 256);
	}

	const dataUrl = canvas.toDataURL();
	return dataUrl;
});

ipc.answerMain('zoom-reset', async () => {
	await setZoom(1);
});

ipc.answerMain('zoom-in', async () => {
	let zoomFactor = await ipc.callMain<undefined, number>('get-config-zoomFactor');
	zoomFactor += 0.1;

	if (zoomFactor < 1.6) {
		await setZoom(zoomFactor);
	}
});

ipc.answerMain('zoom-out', async () => {
	let zoomFactor = await ipc.callMain<undefined, number>('get-config-zoomFactor');
	zoomFactor -= 0.1;

	if (zoomFactor >= 0.8) {
		await setZoom(zoomFactor);
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
	const list = await elementReady(selectors.conversationList, {stopOnDomReady: false});

	if (!list) {
		console.error('Could not find conversations list', selectors.conversationList);
		return;
	}

	const conversation = list.children[index];

	if (!conversation) {
		console.error('Could not find conversation', index);
		return;
	}

	conversation.querySelector<HTMLLegendElement>('[role=link]')!.click();
}

function selectedConversationIndex(offset = 0): number {
	const selected = document.querySelector<HTMLElement>(selectors.selectedConversation);

	if (!selected) {
		return -1;
	}

	const newSelected = selected.closest(`${selectors.conversationList} > div`)!;

	const list = [...newSelected.parentNode!.children];
	const index = list.indexOf(newSelected) + offset;

	return ((index % list.length) + list.length) % list.length;
}

async function setZoom(zoomFactor: number): Promise<void> {
	const node = document.querySelector<HTMLElement>('#zoomFactor')!;
	node.textContent = `${selectors.conversationSelector} {zoom: ${zoomFactor} !important}`;
	await ipc.callMain<number, void>('set-config-zoomFactor', zoomFactor);
}

/** Finds a menu item in [role=menu] by its icon SVG path prefix (language-independent). */
function findMenuItemByIconPath(svgPathPrefix: string): HTMLElement | undefined {
	const items = document.querySelectorAll<HTMLElement>(
		`${selectors.conversationMenuSelectorNewDesign} [role=menuitem]`,
	);
	for (const item of items) {
		if (item.querySelector(`path[d^="${svgPathPrefix}"]`)) {
			return item;
		}
	}

	return undefined;
}

/** Returns all [role=menuitem] elements in the currently open conversation menu. */
function getConversationMenuItems(): HTMLElement[] {
	return [...document.querySelectorAll<HTMLElement>(
		`${selectors.conversationMenuSelectorNewDesign} [role=menuitem]`,
	)];
}

/** Finds the Mute menu item: SVG path first, positional fallback (always index 1). */
function findMuteMenuItem(): HTMLElement | undefined {
	return findMenuItemByIconPath('M109.362 211') ?? getConversationMenuItems()[1] ?? undefined;
}

/** Finds the Delete menu item: SVG path first, fallback via Report item anchor. */
function findDeleteMenuItem(): HTMLElement | undefined {
	const byPath = findMenuItemByIconPath('M8.75');
	if (byPath) {
		return byPath;
	}

	// Fallback: Delete is always right before Report (warning-triangle icon)
	const reportItem = findMenuItemByIconPath('M112.423 209.728');
	return (reportItem?.previousElementSibling as HTMLElement | undefined) ?? undefined;
}

async function withConversationMenu(callback: () => void): Promise<void> {
	// eslint-disable-next-line @typescript-eslint/ban-types
	let menuButton: HTMLElement | null = null;
	const conversation = document.querySelector<HTMLElement>(selectors.selectedConversation)!.closest('[role=row]');

	// Find the menu button: the [role=button] whose parent has 'html-div' class (language-independent)
	// The conversation row may have multiple [role=button] elements (e.g., "View profile" + "More options")
	const buttons = conversation?.querySelectorAll<HTMLElement>('[role=button]');
	menuButton = [...(buttons ?? [])].find(button => button.parentElement?.classList.contains('html-div')) ?? null;

	if (menuButton) {
		await withMenu(menuButton, callback);
	}
}

async function openMuteModal(): Promise<void> {
	await withConversationMenu(() => {
		findMuteMenuItem()?.click();
	});
}

/*
These functions assume:
- There is a selected conversation.
- That the conversation already has its conversation menu open.

In other words, you should only use this function within a callback that is provided to `withConversationMenu()`, because `withConversationMenu()` makes sure to have the conversation menu open before executing the callback and closes the conversation menu afterwards.
*/

async function archiveSelectedConversation(): Promise<void> {
	await withConversationMenu(() => {
		// Archive has no unique SVG icon; find it as the sibling immediately before Delete
		const archiveItem = findDeleteMenuItem()?.previousElementSibling as HTMLElement | undefined;
		archiveItem?.click();
	});
}

async function deleteSelectedConversation(): Promise<void> {
	await withConversationMenu(() => {
		findDeleteMenuItem()?.click();
	});
}

async function openPreferences(): Promise<void> {
	await openSettingsMenuAndClickItem(
		{svgPathPrefix: 'M10 5.75'},
		{waitForSelector: selectors.preferencesSelector},
	);
}

function isPreferencesOpen(): boolean {
	return Boolean(document.querySelector<HTMLElement>(selectors.preferencesSelector));
}

async function closePreferences(): Promise<void> {
	// Wait for the preferences window to be closed, then remove the class from the document
	const preferencesOverlayObserver = new MutationObserver(records => {
		const removedRecords = records.filter(({removedNodes}) => removedNodes.length > 0 && (removedNodes[0] as HTMLElement).tagName === 'DIV');

		// In case there is a div removed, hide utility class and stop observing
		if (removedRecords.length > 0) {
			document.documentElement.classList.remove('hide-preferences-window');
			preferencesOverlayObserver.disconnect();
		}
	});

	const preferencesOverlay = document.querySelector(selectors.preferencesSelector)!;

	// Get the parent of preferences, that's not getting deleted
	const preferencesParent = preferencesOverlay.closest('div:not([class])')!;

	preferencesOverlayObserver.observe(preferencesParent, {childList: true});

	const closeButton = preferencesOverlay.querySelector(selectors.closePreferencesButton)!;
	(closeButton as HTMLElement)?.click();
}

function insertionListener(event: AnimationEvent): void {
	if (event.animationName === 'nodeInserted' && event.target) {
		event.target.dispatchEvent(new Event('mouseover', {bubbles: true}));
	}
}

async function observeAutoscroll(): Promise<void> {
	const mainElement = await elementReady('._4sp8', {stopOnDomReady: false});
	if (!mainElement) {
		return;
	}

	const scrollToBottom = (): void => {
		// eslint-disable-next-line @typescript-eslint/ban-types
		const scrollableElement: HTMLElement | null = document.querySelector('[role=presentation] .scrollable');
		if (scrollableElement) {
			scrollableElement.scroll({
				top: Number.MAX_SAFE_INTEGER,
				behavior: 'smooth',
			});
		}
	};

	const hookMessageObserver = async (): Promise<void> => {
		const chatElement = await elementReady(
			'[role=presentation] .scrollable [role = region] > div[id ^= "js_"]', {stopOnDomReady: false},
		);

		if (chatElement) {
			// Scroll to the bottom when opening different conversation
			scrollToBottom();

			const messageObserver = new MutationObserver((record: MutationRecord[]) => {
				const newMessages: MutationRecord[] = record.filter(record =>
					// The mutation is an addition
					record.addedNodes.length > 0
						// ... of a div       (skip the "seen" status change)
						&& (record.addedNodes[0] as HTMLElement).tagName === 'DIV'
						// ... on the last child       (skip previous messages added when scrolling up)
						&& chatElement.lastChild!.contains(record.target),
				);

				if (newMessages.length > 0) {
					// Scroll to the bottom when there are new messages
					scrollToBottom();
				}
			});

			messageObserver.observe(chatElement, {childList: true, subtree: true});
		}
	};

	hookMessageObserver();

	// Hook it again if conversation changes
	const conversationObserver = new MutationObserver(hookMessageObserver);
	conversationObserver.observe(mainElement, {childList: true});
}

async function observeThemeBugs(): Promise<void> {
	const rootObserver = new MutationObserver((record: MutationRecord[]) => {
		const newNodes: MutationRecord[] = record
			.filter(record => record.addedNodes.length > 0 || record.removedNodes.length > 0);

		if (newNodes) {
			removeThemeClasses(Boolean(nativeTheme.shouldUseDarkColors));
		}
	});

	rootObserver.observe(document.documentElement, {childList: true, subtree: true});
}

// Listen for emoji element dom insertion
document.addEventListener('animationstart', insertionListener, false);

// Inject a CSS class on the messenger layout container to enable proper styling
function injectMessengerLayoutClass(): void {
	const threadListNavigation = document.querySelector('[role="navigation"]:has([role="grid"])');
	threadListNavigation?.parentElement?.classList.add('caprine-thread-list-container');
}

// Observe for navigation changes and re-inject the class when needed
function observeMessengerLayout(): void {
	const observer = new MutationObserver(() => {
		// Check if the class is missing but the navigation exists
		const threadListNavigation = document.querySelector('[role="navigation"]:has([role="grid"])');
		if (threadListNavigation?.parentElement && !threadListNavigation.parentElement.classList.contains('caprine-thread-list-container')) {
			threadListNavigation.parentElement.classList.add('caprine-thread-list-container');
		}
	});

	observer.observe(document.body, {childList: true, subtree: true});
}

// Inject a global style node to maintain custom appearance after conversation change or startup
document.addEventListener('DOMContentLoaded', async () => {
	const style = document.createElement('style');
	style.id = 'zoomFactor';
	document.body.append(style);

	// Inject messenger layout class for proper padding and spacing
	injectMessengerLayoutClass();
	observeMessengerLayout();

	// Set the zoom factor if it was set before quitting
	const zoomFactor = await ipc.callMain<undefined, number>('get-config-zoomFactor');
	setZoom(zoomFactor);

	// Enable OS specific styles
	document.documentElement.classList.add(`os-${process.platform}`);

	// Restore sidebar view state to what is was set before quitting
	updateSidebar();

	// Activate Dark Mode if it was set before quitting
	setTheme();
	// Observe for dark mode changes
	observeTheme();

	// Activate Private Mode if it was set before quitting
	setPrivateMode();

	// Configure do not disturb
	if (is.macos) {
		await updateDoNotDisturb();
	}

	// Disable autoplay if set in settings
	toggleVideoAutoplay();

	// Hook auto-scroll observer
	observeAutoscroll();

	// Hook broken dark mode observer
	observeThemeBugs();

	// Inject a transparent drag bar at the top of the window on macOS.
	// This is needed because Facebook's JS event handlers on child elements
	// prevent -webkit-app-region: drag from working when the window is focused.
	// The drag bar sits above all web content and handles window dragging.
	// On mousemove, we toggle pointer-events to allow clicking interactive
	// elements (buttons, links) underneath while keeping empty space draggable.
	if (is.macos) {
		const dragBarHeight = 24;
		const dragBar = document.createElement('div');
		dragBar.id = 'caprine-drag-bar';
		dragBar.style.position = 'fixed';
		dragBar.style.top = '0';
		dragBar.style.left = '0';
		dragBar.style.right = '0';
		dragBar.style.height = `${dragBarHeight}px`;
		dragBar.style.zIndex = '99999';
		dragBar.style.setProperty('-webkit-app-region', 'drag');
		document.body.append(dragBar);

		const interactiveSelector = 'button, a[href], input, select, textarea, [role="button"], [role="link"], [role="search"], [contenteditable="true"]';

		// Debounce mousemove to reduce CPU usage - only process every 100ms
		let debounceTimer: ReturnType<typeof setTimeout> | undefined;
		let lastMouseX = 0;
		let lastMouseY = 0;
		document.addEventListener('mousemove', (event: MouseEvent) => {
			lastMouseX = event.clientX;
			lastMouseY = event.clientY;

			if (debounceTimer) {
				return;
			}

			debounceTimer = setTimeout(() => {
				debounceTimer = undefined;

				if (lastMouseY >= dragBarHeight) {
					dragBar.style.pointerEvents = '';
					return;
				}

				// Temporarily hide drag bar to find what's underneath
				dragBar.style.pointerEvents = 'none';
				const target = document.elementFromPoint(lastMouseX, lastMouseY);

				if (target?.closest(interactiveSelector)) {
					// Over an interactive element - keep drag bar transparent for clicks
					return;
				}

				// Over empty space - re-enable drag bar for window dragging
				dragBar.style.pointerEvents = '';
			}, 100);
		}, {passive: true});
	}
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
	passive: true,
});

function filenameFromMimeType(mimeType: string): string {
	const extension: Record<string, string> = {
		'application/pdf': 'file.pdf',
		'image/jpeg': 'image.jpg',
		'image/png': 'image.png',
		'image/gif': 'image.gif',
		'video/mp4': 'video.mp4',
		'audio/mpeg': 'audio.mp3',
		'application/zip': 'archive.zip',
	};
	const base = mimeType.split(';')[0]?.trim() ?? '';
	return extension[base] ?? 'download';
}

// Handle links in chat area to open in OS default browser
// Only intercepts links inside the main chat area [role="main"], allowing login
// and other pages to function normally. Images open in-app modal.
document.addEventListener('click', (event: MouseEvent) => {
	const target = event.target as HTMLElement;

	// Check if the clicked element is inside the main chat area
	const mainElement = document.querySelector('[role="main"]');
	if (!mainElement || !mainElement.contains(target)) {
		return;
	}

	// Find if clicked element is within a link
	const link = target.closest<HTMLAnchorElement>('a[href]');
	if (!link) {
		return;
	}

	// Skip if user clicked directly on an image (allow modal view)
	if (target.tagName === 'IMG') {
		return;
	}

	// Get the href
	const href = link.getAttribute('href');
	if (!href) {
		return;
	}

	// Skip anchor links
	if (href.startsWith('#')) {
		return;
	}

	// Skip JavaScript links
	if (href.toLowerCase().startsWith('javascript')) {
		return;
	}

	// Handle blob: URLs — download via IPC instead of opening externally
	if (href.startsWith('blob:')) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();

		void (async () => {
			try {
				const response = await fetch(href);
				const arrayBuffer = await response.arrayBuffer();
				const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
				const filename
					= link.getAttribute('download')
					?? link.textContent?.trim()
					?? filenameFromMimeType(contentType);
				await ipc.callMain('save-blob-file', {data: arrayBuffer, filename});
			} catch {}
		})();

		return;
	}

	// Prevent default navigation
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();

	// Construct full URL for relative links
	const fullUrl = href.startsWith('http') ? href : new URL(href, window.location.href).href;

	// Open in external browser
	ipc.callMain('open-external', fullUrl);
}, {
	capture: true,
});

window.addEventListener('load', async () => {
	if (location.pathname.startsWith('/login')) {
		const keepMeSignedInCheckbox = document.querySelector<HTMLInputElement>('[id^="u_0_0"]')!;
		const keepMeSignedInConfig = await ipc.callMain<undefined, boolean>('get-config-keepMeSignedIn');
		keepMeSignedInCheckbox.checked = keepMeSignedInConfig;
		keepMeSignedInCheckbox.addEventListener('change', async () => {
			const keepMeSignedIn = await ipc.callMain<undefined, boolean>('get-config-keepMeSignedIn');
			await ipc.callMain('set-config-keepMeSignedIn', keepMeSignedIn);
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

	const number = Number.parseInt(event.code.slice(-1), 10);

	if (number >= 1 && number <= 9) {
		await jumpToConversation(number);
	}
});

// Pass events sent via `window.postMessage` on to the main process
window.addEventListener('message', async ({data: {type, data}}) => {
	if (type === 'notification') {
		showNotification(data as NotificationEvent);
	}

	if (type === 'notification-reply') {
		await sendReply(data.reply as string);

		if (data.previousConversation) {
			await selectConversation(data.previousConversation as number);
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
			silent,
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
		const event = new InputEvent('textInput', {
			bubbles: true,
			cancelable: true,
			data: '_',
			view: window,
		});
		inputField.dispatchEvent(event);
	}

	document.execCommand('selectAll', false, undefined);
	document.execCommand('insertText', false, text);
}

ipc.answerMain('notification-callback', (data: unknown) => {
	window.postMessage({type: 'notification-callback', data}, '*');
});

ipc.answerMain('notification-reply-callback', async (data: any) => {
	const previousConversation = selectedConversationIndex();
	data.previousConversation = previousConversation;
	window.postMessage({type: 'notification-reply-callback', data}, '*');
});
