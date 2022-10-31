import process from 'node:process';
import {ipcRenderer as ipc} from 'electron-better-ipc';
import {is} from 'electron-util';
import elementReady = require('element-ready');
import {nativeTheme} from '@electron/remote';
import selectors from './browser/selectors';
import config from './config';
import {toggleVideoAutoplay} from './autoplay';
import {sendConversationList} from './browser/conversation-list';
import {IToggleSounds} from './types';

async function withMenu(
	menuButtonElement: HTMLElement,
	callback: () => Promise<void> | void,
): Promise<void> {
	const {classList} = document.documentElement;

	// Prevent the dropdown menu from displaying
	classList.add('hide-dropdowns');

	// Click the menu button
	menuButtonElement.click();

	// Wait for the menu to close before removing the 'hide-dropdowns' class
	const menuLayer = document.querySelector('.j83agx80.cbu4d94t.l9j0dhe7.jgljxmt5.be9z9djy > div:nth-child(2) > div');

	if (menuLayer) {
		const observer = new MutationObserver(() => {
			if (!menuLayer.hasChildNodes()) {
				classList.remove('hide-dropdowns');
				observer.disconnect();
			}
		});
		observer.observe(menuLayer, {childList: true});
	} else {
		// Fallback in case .uiContextualLayerPositioner is missing
		classList.remove('hide-dropdowns');
	}

	await callback();
}

async function isNewSidebar(): Promise<boolean> {
	await elementReady('[role=navigation] > div > div');

	const sidebars = document.querySelectorAll<HTMLElement>('[role=navigation] > div > div');

	return sidebars.length === 2;
}

async function withSettingsMenu(callback: () => Promise<void> | void): Promise<void> {
	const newSidebar = await isNewSidebar();

	// Wait for navigation pane buttons to show up
	await elementReady(newSidebar ? selectors.userMenuNewSidebar : selectors.userMenu, {stopOnDomReady: false});

	const settingsMenu = newSidebar
		? document.querySelectorAll<HTMLElement>(selectors.userMenuNewSidebar)[0]
		: document.querySelector<HTMLElement>(selectors.userMenu)!;

	await withMenu(settingsMenu, callback);
}

async function selectMenuItem(itemNumber: number): Promise<void> {
	let selector;

	// Wait for menu to show up
	await elementReady(selectors.conversationMenuSelectorNewDesign, {stopOnDomReady: false});

	const items = document.querySelectorAll<HTMLElement>(
		`${selectors.conversationMenuSelectorNewDesign} [role=menuitem]`,
	);

	// Negative items will select from the end
	if (itemNumber < 0) {
		selector = -itemNumber <= items.length ? items[items.length + itemNumber] : null;
	} else {
		selector = itemNumber <= items.length ? items[itemNumber - 1] : null;
	}

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

ipc.answerMain('new-conversation', async () => {
	document.querySelector<HTMLElement>('[href="/new/"]')!.click();
});

ipc.answerMain('new-room', async () => {
	document.querySelector<HTMLElement>('.x16n37ib .x1i10hfl.x6umtig.x1b1mbwd.xaqea5y.xav7gou.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x16tdsg8.x1hl2dhg.xggy1nq.x87ps6o.x1lku1pv.x1a2a7pz.x6s0dn4.x14yjl9h.xudhj91.x18nykt9.xww2gxu.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x78zum5.xl56j7k.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.xc9qbxq.x14qfxbe.x1qhmfi1')!.click();
});

ipc.answerMain('log-out', async () => {
	if (config.get('useWorkChat')) {
		document.querySelector<HTMLElement>('._5lxs._3qct._p')!.click();

		// Menu creation is slow
		setTimeout(() => {
			const nodes = document.querySelectorAll<HTMLElement>(
				'._54nq._9jo._558b._2n_z li:last-child a',
			);

			nodes[nodes.length - 1].click();
		}, 250);
	} else {
		await withSettingsMenu(() => {
			selectMenuItem(-1);
		});
	}
});

ipc.answerMain('find', () => {
	document.querySelector<HTMLElement>('[type="search"]')!.focus();
});

async function openSearchInConversation() {
	const mainView = document.querySelector('.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.rj1gh0hx.buofh1pr.g5gj957u.hpfvmrgz.i1fnvgqd.gs1a9yip.owycx6da.btwxx1t3.jb3vyjys.gitj76qy')!;
	const rightSidebarIsClosed = Boolean(mainView.querySelector<HTMLElement>('div:only-child'));

	if (rightSidebarIsClosed) {
		document.documentElement.classList.add('hide-r-sidebar');
		document.querySelector<HTMLElement>('.j9ispegn.pmk7jnqg.k4urcfbm.datstx6m.b5wmifdl.kr520xx4.mdpwds66.b2cqd1jy.n13yt9zj.eh67sqbx')?.click();
	}

	await elementReady(selectors.rightSidebarSegments, {stopOnDomReady: false});
	const segments = document.querySelectorAll<HTMLElement>(selectors.rightSidebarSegments).length;
	// If there are three segmetns in right sidebar (two users chat) then button index is 4
	// If there are not three segments (usually four, it's a group chat) then button index is 6
	const buttonIndex = segments === 3 ? 4 : 6;

	await elementReady(selectors.rightSidebarButtons, {stopOnDomReady: false});
	const buttonList = document.querySelectorAll<HTMLElement>(selectors.rightSidebarButtons);

	if (buttonList.length > buttonIndex) {
		buttonList[buttonIndex].click();
	}

	// If right sidebar was closed when shortcut was clicked, then close it back.
	if (rightSidebarIsClosed) {
		document.querySelector<HTMLElement>('.j9ispegn.pmk7jnqg.k4urcfbm.datstx6m.b5wmifdl.kr520xx4.mdpwds66.b2cqd1jy.n13yt9zj.eh67sqbx')?.click();

		// Observe sidebar so when it's hidden, remove the utility class. This prevents split
		// display of sidebar.
		const sidebarObserver = new MutationObserver(records => {
			const removedRecords = records.filter(({removedNodes}) => removedNodes.length > 0 && (removedNodes[0] as HTMLElement).tagName === 'DIV');

			// In case there is a div removed, hide utility class and stop observing
			if (removedRecords.length > 0) {
				document.documentElement.classList.remove('hide-r-sidebar');
				sidebarObserver.disconnect();
			}
		});

		sidebarObserver.observe(mainView, {childList: true, subtree: true});
	}
}

ipc.answerMain('search', () => {
	openSearchInConversation();
});

ipc.answerMain('insert-gif', () => {
	document.querySelector<HTMLElement>('.x1n2onr6.x1iyjqo2.xw2csxc > div:nth-child(3) > span > div')!.click();
});

ipc.answerMain('insert-emoji', async () => {
	document.querySelector<HTMLElement>('.x1n2onr6.x1iyjqo2.xw2csxc > div:nth-child(5) > span > div')!.click();
});

ipc.answerMain('insert-sticker', () => {
	document.querySelector<HTMLElement>('.x1n2onr6.x1iyjqo2.xw2csxc > div:nth-child(2) > span > div')!.click();
});

ipc.answerMain('attach-files', () => {
	document.querySelector<HTMLElement>('.x1n2onr6.x1iyjqo2.xw2csxc > div:nth-child(1) > span > div')!.click();
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
		document.documentElement.classList.add('hide-preferences-window');

		const style = document.createElement('style');
		// Hide both the backdrop and the preferences dialog
		style.textContent = `${selectors.preferencesSelector} ._3ixn, ${selectors.preferencesSelector} ._59s7 { opacity: 0 !important }`;
		document.body.append(style);

		await openPreferences();

		return true;
	}

	return false;
}

async function toggleSounds({checked}: IToggleSounds): Promise<void> {
	const shouldClosePreferences = await openHiddenPreferences();

	const soundsCheckbox = document.querySelector<HTMLInputElement>(`${selectors.preferencesSelector} ${selectors.messengerSoundsSelector}`)!;
	if (typeof checked === 'undefined' || checked !== soundsCheckbox.checked) {
		soundsCheckbox.click();
	}

	if (shouldClosePreferences) {
		await closePreferences();
	}
}

ipc.answerMain('toggle-sounds', toggleSounds);

ipc.answerMain('toggle-mute-notifications', async () => {
	const shouldClosePreferences = await openHiddenPreferences();

	const notificationCheckbox = document.querySelector<HTMLInputElement>(
		selectors.notificationCheckbox,
	)!;

	if (shouldClosePreferences) {
		await closePreferences();
	}

	return !notificationCheckbox.checked;
});

ipc.answerMain('toggle-message-buttons', () => {
	document.body.classList.toggle('show-message-buttons', !config.get('showMessageButtons'));
});

ipc.answerMain('show-active-contacts-view', async () => {
	await selectOtherListViews(2);
});

ipc.answerMain('show-message-requests-view', async () => {
	await selectOtherListViews(3);
});

ipc.answerMain('show-hidden-threads-view', async () => {
	await selectOtherListViews(4);
});

ipc.answerMain('toggle-unread-threads-view', async () => {
	await selectOtherListViews(6);
});

ipc.answerMain('toggle-video-autoplay', () => {
	toggleVideoAutoplay();
});

ipc.answerMain('reload', () => {
	location.reload();
});

function setTheme(): void {
	nativeTheme.themeSource = config.get('theme');
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

	// Attribute notation needed here to guarantee exact (not partial) match.
	const modalElements = await elementReady(selectors.preferencesSelector, {stopOnDomReady: false});
	if (modalElements) {
		observerNew.observe(modalElements, {childList: true});
	}
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

// TODO: Implement this function
async function updateDoNotDisturb(): Promise<void> {
	const shouldClosePreferences = await openHiddenPreferences();

	if (shouldClosePreferences) {
		await closePreferences();
	}
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

	const newSelected = selected.parentNode!.parentNode!.parentNode! as HTMLElement;

	const list = [...newSelected.parentNode!.children];
	const index = list.indexOf(newSelected) + offset;

	return ((index % list.length) + list.length) % list.length;
}

function setZoom(zoomFactor: number): void {
	const node = document.querySelector<HTMLElement>('#zoomFactor')!;
	node.textContent = `${selectors.conversationSelector} {zoom: ${zoomFactor} !important}`;
	config.set('zoomFactor', zoomFactor);
}

async function withConversationMenu(callback: () => void): Promise<void> {
	// eslint-disable-next-line @typescript-eslint/ban-types
	let menuButton: HTMLElement | null = null;
	const conversation = document.querySelector<HTMLElement>(`${selectors.selectedConversation}`)?.parentElement?.parentElement?.parentElement?.parentElement;

	menuButton = conversation?.querySelector('[aria-label=Menu][role=button]') ?? null;

	if (menuButton) {
		await withMenu(menuButton, callback);
	}
}

async function openMuteModal(): Promise<void> {
	await withConversationMenu(() => {
		selectMenuItem(2);
	});
}

/*
This function assumes:
- There is a selected conversation.
- That the conversation already has its conversation menu open.

In other words, you should only use this function within a callback that is provided to `withConversationMenu()`, because `withConversationMenu()` makes sure to have the conversation menu open before executing the callback and closes the conversation menu afterwards.
*/
function isSelectedConversationGroup(): boolean {
	return Boolean(document.querySelector<HTMLElement>(`${selectors.conversationMenuSelectorNewDesign} [role=menuitem]:nth-child(4)`));
}

async function hideSelectedConversation(): Promise<void> {
	await withConversationMenu(() => {
		const [isGroup, isNotGroup] = [5, 6];
		selectMenuItem(isSelectedConversationGroup() ? isGroup : isNotGroup);
	});
}

async function deleteSelectedConversation(): Promise<void> {
	await withConversationMenu(() => {
		const [isGroup, isNotGroup] = [6, 7];
		selectMenuItem(isSelectedConversationGroup() ? isGroup : isNotGroup);
	});
}

async function openPreferences(): Promise<void> {
	await withSettingsMenu(() => {
		selectMenuItem(1);
	});

	await elementReady(selectors.preferencesSelector, {stopOnDomReady: false});
}

function isPreferencesOpen(): boolean {
	return Boolean(document.querySelector<HTMLElement>('[aria-label=Preferences]'));
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

	preferencesOverlayObserver.observe(preferencesOverlay, {childList: true});

	const closeButton = await elementReady<HTMLElement>(selectors.closePreferencesButton, {stopOnDomReady: false});
	closeButton?.click();
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
	setTheme();
	// Observe for dark mode changes
	observeTheme();

	// Activate Private Mode if it was set before quitting
	setPrivateMode();

	// Configure do not disturb
	if (is.macos) {
		await updateDoNotDisturb();
	}

	// Prevent flash of white on startup when in dark mode
	// TODO: find a CSS-only solution
	if (!is.macos && nativeTheme.shouldUseDarkColors) {
		document.documentElement.style.backgroundColor = '#1e1e1e';
	}

	// Disable autoplay if set in settings
	toggleVideoAutoplay();

	// Hook auto-scroll observer
	observeAutoscroll();

	// Hook broken dark mode observer
	observeThemeBugs();
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
