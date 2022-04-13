import {ipcRenderer as ipc} from 'electron-better-ipc';
import {api, is} from 'electron-util';
import elementReady = require('element-ready');
import selectors from './browser/selectors';
import config from './config';
import {toggleVideoAutoplay} from './autoplay';
import {sendConversationList} from './browser/conversation-list';
import {INewDesign, IToggleMuteNotifications, IToggleSounds} from './types';

const selectedConversationSelector = '._5l-3._1ht1._1ht2';
const selectedConversationNewDesign = '[role=navigation] [role=grid] [role=row] [role=gridcell] [role=link][aria-current]';
const preferencesSelector = '._10._4ebx.uiLayer._4-hy';
const preferencesSelectorNewDesign = 'div[class="rq0escxv l9j0dhe7 du4w35lb"] > div:nth-of-type(3) > div';
const messengerSoundsSelector = `${preferencesSelector} ._374d ._6bkz`;
const conversationMenuSelector = '.uiLayer:not(.hidden_elem) [role=menu]';
const conversationMenuSelectorNewDesign = '[role=menu].l9j0dhe7.swg4t2nn';

async function withMenu(
	isNewDesign: boolean,
	menuButtonElement: HTMLElement,
	callback: () => Promise<void> | void
): Promise<void> {
	const {classList} = document.documentElement;

	// Prevent the dropdown menu from displaying
	classList.add('hide-dropdowns');

	// Click the menu button
	menuButtonElement.click();

	// Wait for the menu to close before removing the 'hide-dropdowns' class
	const menuLayer = isNewDesign ? document.querySelector('.j83agx80.cbu4d94t.l9j0dhe7.jgljxmt5.be9z9djy > div:nth-child(2) > div') : document.querySelector('.uiContextualLayerPositioner:not(.hidden_elem)');

	if (menuLayer) {
		const observer = new MutationObserver(() => {
			if (isNewDesign ? !menuLayer.hasChildNodes() : menuLayer.classList.contains('hidden_elem')) {
				classList.remove('hide-dropdowns');
				observer.disconnect();
			}
		});
		observer.observe(menuLayer, isNewDesign ? {childList: true} : {attributes: true, attributeFilter: ['class']});
	} else {
		// Fallback in case .uiContextualLayerPositioner is missing
		classList.remove('hide-dropdowns');
	}

	await callback();
}

async function withSettingsMenu(isNewDesign: boolean, callback: () => Promise<void> | void): Promise<void> {
	// If ui is new, get the new settings menu
	const settingsMenu = isNewDesign ?
		(await elementReady<HTMLElement>('.bp9cbjyn.j83agx80.rj1gh0hx.buofh1pr.g5gj957u > .oajrlxb2.gs1a9yip', {stopOnDomReady: false}))! :
		(await elementReady<HTMLElement>('._30yy._6ymd._2agf,._30yy._2fug._p', {stopOnDomReady: false}))!;

	await withMenu(isNewDesign, settingsMenu, callback);
}

async function selectMenuItem(isNewDesign: boolean, itemNumber: number): Promise<void> {
	let selector;
	if (isNewDesign) {
		// Wait for menu to show up
		await elementReady(conversationMenuSelectorNewDesign, {stopOnDomReady: false});

		const items = document.querySelectorAll<HTMLElement>(
			`${conversationMenuSelectorNewDesign} [role=menuitem]`
		);

		selector = itemNumber <= items.length ? items[itemNumber - 1] : null;
	} else {
		selector = document.querySelector<HTMLElement>(
			`${conversationMenuSelector} > li:nth-child(${itemNumber}) a`
		);
	}

	if (selector) {
		selector.click();
	}
}

async function selectOtherListViews(isNewDesign: boolean, itemNumber: number): Promise<void> {
	// In case one of other views is shown
	clickBackButton();

	await withSettingsMenu(isNewDesign, () => {
		selectMenuItem(isNewDesign, itemNumber);
	});
}

function clickBackButton(): void {
	const backButton = document.querySelector<HTMLElement>('._30yy._2oc9');

	if (backButton) {
		backButton.click();
	}
}

ipc.answerMain('show-preferences', async () => {
	const newDesign = await isNewDesign();
	if (isPreferencesOpen(newDesign)) {
		return;
	}

	await openPreferences(newDesign);
});

ipc.answerMain('new-conversation', async () => {
	if (await isNewDesign()) {
		document.querySelector<HTMLElement>('[href="/new/"]')!.click();
	} else {
		document.querySelector<HTMLElement>('._30yy[data-href$="/new"]')!.click();
	}
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
		const newDesign = await isNewDesign();
		await withSettingsMenu(newDesign, () => {
			if (newDesign) {
				selectMenuItem(newDesign, 11);
			} else {
				const nodes = document.querySelectorAll<HTMLElement>(
					'._54nq._2i-c._558b._2n_z li:last-child a'
				);

				nodes[nodes.length - 1].click();
			}
		});
	}
});

ipc.answerMain('find', () => {
	const searchBox =
		// Old UI
		document.querySelector<HTMLElement>('._58al') ??
		// Newest UI
		document.querySelector<HTMLElement>('[aria-label="Search Messenger"]');

	searchBox!.focus();
});

async function openSearchInConversation() {
	const mainView = document.querySelector('.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.g5gj957u.rj1gh0hx.buofh1pr.hpfvmrgz.i1fnvgqd.gs1a9yip.owycx6da.btwxx1t3.jb3vyjys.nwf6jgls')!;
	const rightSidebarIsClosed = Boolean(mainView.querySelector<HTMLElement>('div:only-child'));

	if (rightSidebarIsClosed) {
		document.documentElement.classList.add('hide-r-sidebar');
		document.querySelector<HTMLElement>('[aria-label="Conversation Information"]')?.click();
	}

	await elementReady<HTMLElement>(selectors.rightSidebarButtons, {stopOnDomReady: false});
	const buttonList = document.querySelectorAll<HTMLElement>(selectors.rightSidebarButtons);
	console.log(buttonList);

	if (buttonList.length > 4) {
		buttonList[4].click();
	}

	// If right sidebar was closed when shortcut was clicked, then close it back.
	if (rightSidebarIsClosed) {
		document.querySelector<HTMLElement>('[aria-label="Conversation Information"]')?.click();

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

ipc.answerMain('search', (isNewDesign: boolean) => {
	if (isNewDesign) {
		openSearchInConversation();
	} else {
		document.querySelector<HTMLElement>('._3szo:nth-of-type(1)')!.click();
	}
});

ipc.answerMain('insert-gif', () => {
	const gifElement =
		// Old UI
		document.querySelector<HTMLElement>('._yht') ??
		// New UI
		[...document.querySelectorAll<HTMLElement>('._7oam')].find(element =>
			element.querySelector<HTMLElement>('svg path[d^="M27.002,13.5"]')
		) ??
		// Newest UI
		document.querySelector<HTMLElement>('.tkr6xdv7 .pmk7jnqg.kkf49tns.cgat1ltu.sw24d88r.i09qtzwb.g3zh7qmp.flx89l3n.mb8dcdod.chkx7lpg [aria-hidden=false]');

	gifElement!.click();
});

ipc.answerMain('insert-emoji', async () => {
	const newDesign = await isNewDesign();
	const emojiElement = newDesign ?
		document.querySelector<HTMLElement>('.cxmmr5t8 .tojvnm2t.a6sixzi8.abs2jz4q.a8s20v7p.t1p8iaqh.k5wvi7nf.q3lfd5jv.pk4s997a.bipmatt0.cebpdrjk.qowsmv63.owwhemhu.dp1hu0rb.dhp61c6y.iyyx5f41 [role=button]') :
		(await elementReady<HTMLElement>('._5s2p, ._30yy._7odb', {
			stopOnDomReady: false
		}));

	emojiElement!.click();
});

ipc.answerMain('insert-sticker', () => {
	const stickerElement =
		// Old UI
		document.querySelector<HTMLElement>('._4rv6') ??
		// New UI
		[...document.querySelectorAll<HTMLElement>('._7oam')].find(element =>
			element.querySelector<HTMLElement>('svg path[d^="M22.5,18.5 L27.998,18.5"]')
		) ??
		// Newest UI
		document.querySelector<HTMLElement>('.tkr6xdv7 .pmk7jnqg.kkf49tns.cgat1ltu.sw24d88r.i09qtzwb.g3zh7qmp.flx89l3n.mb8dcdod.tntlmw5q [aria-hidden=false]');

	stickerElement!.click();
});

ipc.answerMain('attach-files', () => {
	const filesElement =
		// Old UI
		document.querySelector<HTMLElement>('._5vn8 + input[type="file"], ._7oam input[type="file"]') ??
		// Newest UI
		document.querySelector<HTMLElement>('.tkr6xdv7 .pmk7jnqg.kkf49tns.cgat1ltu.sw24d88r.i09qtzwb.g3zh7qmp.flx89l3n.mb8dcdod.lbhrjshz [aria-hidden=false]');

	filesElement!.click();
});

ipc.answerMain('focus-text-input', () => {
	const textInput =
		// Old UI
		document.querySelector<HTMLElement>('._7kpg ._5rpu') ??
		// Newest UI
		document.querySelector<HTMLElement>('[role=textbox][contenteditable=true]');

	textInput!.focus();
});

ipc.answerMain('next-conversation', nextConversation);

ipc.answerMain('previous-conversation', previousConversation);

ipc.answerMain('mute-conversation', async ({isNewDesign}: INewDesign) => {
	await openMuteModal(isNewDesign);
});

ipc.answerMain('delete-conversation', async ({isNewDesign}: INewDesign) => {
	await deleteSelectedConversation(isNewDesign);
});

ipc.answerMain('hide-conversation', async ({isNewDesign}: INewDesign) => {
	const index = selectedConversationIndex(isNewDesign);

	if (index !== -1) {
		await hideSelectedConversation(isNewDesign);

		const key = index + 1;
		await jumpToConversation(isNewDesign, key);
	}
});

async function openHiddenPreferences(isNewDesign: boolean): Promise<boolean> {
	if (!isPreferencesOpen(isNewDesign)) {
		document.documentElement.classList.add('hide-preferences-window');

		const style = document.createElement('style');
		// Hide both the backdrop and the preferences dialog
		style.textContent = `${preferencesSelector} ._3ixn, ${preferencesSelector} ._59s7 { opacity: 0 !important }`;
		document.body.append(style);

		await openPreferences(isNewDesign);

		if (!isNewDesign) {
			// Will clean up itself after the preferences are closed
			document.querySelector<HTMLElement>(preferencesSelector)!.append(style);
		}

		return true;
	}

	return false;
}

async function toggleSounds({isNewDesign, checked}: IToggleSounds): Promise<void> {
	const shouldClosePreferences = await openHiddenPreferences(isNewDesign);

	const soundsCheckbox = document.querySelector<HTMLInputElement>(messengerSoundsSelector)!;
	if (typeof checked === 'undefined' || checked !== soundsCheckbox.checked) {
		soundsCheckbox.click();
	}

	if (shouldClosePreferences) {
		await closePreferences(isNewDesign);
	}
}

ipc.answerMain('toggle-sounds', toggleSounds);

ipc.answerMain('toggle-mute-notifications', async ({isNewDesign, defaultStatus}: IToggleMuteNotifications) => {
	const shouldClosePreferences = await openHiddenPreferences(isNewDesign);

	const notificationCheckbox = document.querySelector<HTMLInputElement>(
		selectors.notificationCheckbox
	)!;

	if (!isNewDesign) {
		if (defaultStatus === undefined) {
			notificationCheckbox.click();
		} else if (
			(defaultStatus && notificationCheckbox.checked) ||
			(!defaultStatus && !notificationCheckbox.checked)
		) {
			notificationCheckbox.click();
		}
	}

	if (shouldClosePreferences) {
		await closePreferences(isNewDesign);
	}

	return !isNewDesign && !notificationCheckbox.checked;
});

ipc.answerMain('toggle-message-buttons', () => {
	document.body.classList.toggle('show-message-buttons', config.get('showMessageButtons'));
});

ipc.answerMain('show-active-contacts-view', async () => {
	const newDesign = await isNewDesign();
	await selectOtherListViews(newDesign, newDesign ? 2 : 3);
});

ipc.answerMain('show-message-requests-view', async () => {
	const newDesign = await isNewDesign();
	await selectOtherListViews(newDesign, newDesign ? 3 : 4);
});

ipc.answerMain('show-hidden-threads-view', async () => {
	const newDesign = await isNewDesign();
	await selectOtherListViews(newDesign, newDesign ? 4 : 5);
});

ipc.answerMain('toggle-unread-threads-view', async () => {
	await selectOtherListViews(false, 6);
});

ipc.answerMain('toggle-video-autoplay', () => {
	toggleVideoAutoplay();
});

ipc.answerMain('reload', () => {
	location.reload();
});

function setTheme(): void {
	api.nativeTheme.themeSource = config.get('theme');
	setThemeElement(document.documentElement);
	updateVibrancy();
}

function setThemeElement(element: HTMLElement): void {
	const useDarkColors = Boolean(api.nativeTheme.shouldUseDarkColors);
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
		if (api.nativeTheme.shouldUseDarkColors !== isDark) {
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
				if (api.nativeTheme.shouldUseDarkColors === isLight) {
					setThemeElement(newNode as HTMLElement);
				}
			}
		}
	});

	/* Observe only elements where new nodes may need dark mode */
	const menuElements = await elementReady<HTMLElement>('.j83agx80.cbu4d94t.l9j0dhe7.jgljxmt5.be9z9djy > div:nth-of-type(2) > div', {stopOnDomReady: false});
	if (menuElements) {
		observerNew.observe(menuElements, {childList: true});
	}

	// Attribute notation needed here to guarantee exact (not partial) match.
	const modalElements = await elementReady<HTMLElement>(preferencesSelectorNewDesign, {stopOnDomReady: false});
	if (modalElements) {
		observerNew.observe(modalElements, {childList: true});
	}
}

function setPrivateMode(isNewDesign: boolean): void {
	document.documentElement.classList.toggle('private-mode', config.get('privateMode'));

	if (is.macos) {
		sendConversationList(isNewDesign);
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

async function updateDoNotDisturb(isNewDesign: boolean): Promise<void> {
	const shouldClosePreferences = await openHiddenPreferences(isNewDesign);

	if (!isNewDesign) {
		const soundsCheckbox = document.querySelector<HTMLInputElement>(messengerSoundsSelector)!;
		toggleSounds(await ipc.callMain('update-dnd-mode', soundsCheckbox.checked));
	}

	if (shouldClosePreferences) {
		await closePreferences(isNewDesign);
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

ipc.answerMain('render-overlay-icon', (messageCount: number): {data: string; text: string} => {
	return {
		data: renderOverlayIcon(messageCount).toDataURL(),
		text: String(messageCount)
	};
});

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

ipc.answerMain('zoom-reset', ({isNewDesign}: INewDesign) => {
	setZoom(isNewDesign, 1);
});

ipc.answerMain('zoom-in', ({isNewDesign}: INewDesign) => {
	const zoomFactor = config.get('zoomFactor') + 0.1;

	if (zoomFactor < 1.6) {
		setZoom(isNewDesign, zoomFactor);
	}
});

ipc.answerMain('zoom-out', ({isNewDesign}: INewDesign) => {
	const zoomFactor = config.get('zoomFactor') - 0.1;

	if (zoomFactor >= 0.8) {
		setZoom(isNewDesign, zoomFactor);
	}
});

ipc.answerMain('jump-to-conversation', async (key: number) => {
	await jumpToConversation(await isNewDesign(), key);
});

async function nextConversation(): Promise<void> {
	const newDesign = await isNewDesign();
	const index = selectedConversationIndex(newDesign, 1);

	if (index !== -1) {
		await selectConversation(newDesign, index);
	}
}

async function previousConversation(): Promise<void> {
	const newDesign = await isNewDesign();
	const index = selectedConversationIndex(newDesign, -1);

	if (index !== -1) {
		await selectConversation(newDesign, index);
	}
}

async function jumpToConversation(isNewDesign: boolean, key: number): Promise<void> {
	const index = key - 1;
	await selectConversation(isNewDesign, index);
}

// Focus on the conversation with the given index
async function selectConversation(isNewDesign: boolean, index: number): Promise<void> {
	const list = isNewDesign ?
		await elementReady<HTMLElement>(selectors.conversationListNewDesign, {stopOnDomReady: false}) :
		await elementReady<HTMLElement>(selectors.conversationList, {stopOnDomReady: false});

	if (!list) {
		console.error('Could not find conversations list', selectors.conversationList);
		return;
	}

	const conversation = list.children[index];

	if (!conversation) {
		console.error('Could not find conversation', index);
		return;
	}

	((isNewDesign ? conversation.querySelector('[role=link]') : conversation.firstChild!.firstChild) as HTMLElement).click();
}

function selectedConversationIndex(isNewDesign: boolean, offset = 0): number {
	const selected =
		// Old UI
		document.querySelector<HTMLElement>(selectedConversationSelector) ??
		// Newest UI
		document.querySelector<HTMLElement>(selectedConversationNewDesign);

	if (!selected) {
		return -1;
	}

	const newSelected = isNewDesign ?
		selected.parentNode!.parentNode!.parentNode! as HTMLElement :
		selected;

	const list = [...newSelected.parentNode!.children];
	const index = list.indexOf(newSelected) + offset;

	return ((index % list.length) + list.length) % list.length;
}

function setZoom(isNewDesign: boolean, zoomFactor: number): void {
	const node = document.querySelector<HTMLElement>('#zoomFactor')!;
	node.textContent = `${isNewDesign ? selectors.conversationSelectorNewDesign : selectors.conversationSelector} {zoom: ${zoomFactor} !important}`;
	config.set('zoomFactor', zoomFactor);
}

async function withConversationMenu(isNewDesign: boolean, callback: () => void): Promise<void> {
	let menuButton: HTMLElement | null = null;
	if (isNewDesign) {
		const conversation = document.querySelector<HTMLElement>(`${selectedConversationNewDesign}`)?.parentElement?.parentElement?.parentElement?.parentElement;
		menuButton = conversation?.querySelector('[aria-label=Menu][role=button]') ?? null;
	} else {
		menuButton = document.querySelector<HTMLElement>(
			`${selectedConversationSelector} [aria-haspopup=true] [role=button]`
		);
	}

	if (menuButton) {
		await withMenu(isNewDesign, menuButton, callback);
	}
}

async function openMuteModal(isNewDesign: boolean): Promise<void> {
	await withConversationMenu(isNewDesign, () => {
		selectMenuItem(isNewDesign, isNewDesign ? 2 : 1);
	});
}

/*
This function assumes:
- There is a selected conversation.
- That the conversation already has its conversation menu open.

In other words, you should only use this function within a callback that is provided to `withConversationMenu()`, because `withConversationMenu()` makes sure to have the conversation menu open before executing the callback and closes the conversation menu afterwards.
*/
function isSelectedConversationGroup(isNewDesign: boolean): boolean {
	const separator = isNewDesign ?
		document.querySelector<HTMLElement>(
			`${conversationMenuSelectorNewDesign} [role=menuitem]:nth-child(4)`
		) :
		document.querySelector<HTMLElement>(
			`${conversationMenuSelector} > li:nth-child(6)[role=separator]`
		);
	return Boolean(separator);
}

async function hideSelectedConversation(isNewDesign: boolean): Promise<void> {
	await withConversationMenu(isNewDesign, () => {
		const [isGroup, isNotGroup] = isNewDesign ? [5, 6] : [4, 3];
		selectMenuItem(isNewDesign, isSelectedConversationGroup(isNewDesign) ? isGroup : isNotGroup);
	});
}

async function deleteSelectedConversation(isNewDesign: boolean): Promise<void> {
	await withConversationMenu(isNewDesign, () => {
		const [isGroup, isNotGroup] = isNewDesign ? [6, 7] : [5, 4];
		selectMenuItem(isNewDesign, isSelectedConversationGroup(isNewDesign) ? isGroup : isNotGroup);
	});
}

async function openPreferences(isNewDesign: boolean): Promise<void> {
	await withSettingsMenu(isNewDesign, () => {
		selectMenuItem(isNewDesign, 1);
	});

	await elementReady<HTMLElement>(isNewDesign ? preferencesSelectorNewDesign : preferencesSelector, {stopOnDomReady: false});
}

function isPreferencesOpen(isNewDesign: boolean): boolean {
	return isNewDesign ?
		Boolean(document.querySelector<HTMLElement>('[aria-label=Preferences]')) :
		Boolean(document.querySelector<HTMLElement>('._3quh._30yy._2t_._5ixy'));
}

async function closePreferences(isNewDesign: boolean): Promise<void> {
	if (isNewDesign) {
		const closeButton = await elementReady<HTMLElement>(selectors.closePreferencesButton, {stopOnDomReady: false});
		closeButton?.click();

		// Wait for the preferences window to be closed, then remove the class from the document
		const preferencesOverlayObserver = new MutationObserver(records => {
			const removedRecords = records.filter(({removedNodes}) => removedNodes.length > 0 && (removedNodes[0] as HTMLElement).tagName === 'DIV');

			// In case there is a div removed, hide utility class and stop observing
			if (removedRecords.length > 0) {
				document.documentElement.classList.remove('hide-preferences-window');
				preferencesOverlayObserver.disconnect();
			}
		});

		const preferencesOverlay = document.querySelector('div[class="rq0escxv l9j0dhe7 du4w35lb"] > div:nth-of-type(3) > div')!;

		preferencesOverlayObserver.observe(preferencesOverlay, {childList: true});
	} else {
		const doneButton = document.querySelector<HTMLElement>('._3quh._30yy._2t_._5ixy')!;
		doneButton.click();
	}
}

function insertionListener(event: AnimationEvent): void {
	if (event.animationName === 'nodeInserted' && event.target) {
		event.target.dispatchEvent(new Event('mouseover', {bubbles: true}));
	}
}

async function observeAutoscroll(): Promise<void> {
	const mainElement = await elementReady<HTMLElement>('._4sp8', {stopOnDomReady: false});
	if (!mainElement) {
		return;
	}

	const scrollToBottom = (): void => {
		const scrollableElement: HTMLElement | null = document.querySelector('[role=presentation] .scrollable');
		if (scrollableElement) {
			scrollableElement.scroll({
				top: Number.MAX_SAFE_INTEGER,
				behavior: 'smooth'
			});
		}
	};

	const hookMessageObserver = async (): Promise<void> => {
		const chatElement = await elementReady<HTMLElement>(
			'[role=presentation] .scrollable [role = region] > div[id ^= "js_"]', {stopOnDomReady: false}
		);

		if (chatElement) {
			// Scroll to the bottom when opening different conversation
			scrollToBottom();

			const messageObserver = new MutationObserver((record: MutationRecord[]) => {
				const newMessages: MutationRecord[] = record.filter(record => {
					// The mutation is an addition
					return record.addedNodes.length > 0 &&
						// ... of a div       (skip the "seen" status change)
						(record.addedNodes[0] as HTMLElement).tagName === 'DIV' &&
						// ... on the last child       (skip previous messages added when scrolling up)
						chatElement.lastChild!.contains(record.target);
				});

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
			removeThemeClasses(Boolean(api.nativeTheme.shouldUseDarkColors));
		}
	});

	rootObserver.observe(document.documentElement, {childList: true, subtree: true});
}

// Listen for emoji element dom insertion
document.addEventListener('animationstart', insertionListener, false);

// Inject a global style node to maintain custom appearance after conversation change or startup
document.addEventListener('DOMContentLoaded', async () => {
	const newDesign = await isNewDesign();

	const style = document.createElement('style');
	style.id = 'zoomFactor';
	document.body.append(style);

	// Set the zoom factor if it was set before quitting
	const zoomFactor = config.get('zoomFactor');
	setZoom(newDesign, zoomFactor);

	// Enable OS specific styles
	document.documentElement.classList.add(`os-${process.platform}`);

	// Restore sidebar view state to what is was set before quitting
	updateSidebar();

	// Activate Dark Mode if it was set before quitting
	setTheme();
	// Observe for dark mode changes
	observeTheme();

	// Activate Private Mode if it was set before quitting
	setPrivateMode(newDesign);

	// Configure do not disturb
	if (is.macos) {
		await updateDoNotDisturb(newDesign);
	}

	// Prevent flash of white on startup when in dark mode
	// TODO: find a CSS-only solution
	if (!is.macos && api.nativeTheme.shouldUseDarkColors) {
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

	const number = Number.parseInt(event.code.slice(-1), 10);

	if (number >= 1 && number <= 9) {
		await jumpToConversation(await isNewDesign(), number);
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
			await selectConversation(await isNewDesign(), data.previousConversation as number);
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
		const event = new InputEvent('textInput', {
			bubbles: true,
			cancelable: true,
			data: '_',
			view: window
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
	const previousConversation = selectedConversationIndex(await isNewDesign());
	data.previousConversation = previousConversation;
	window.postMessage({type: 'notification-reply-callback', data}, '*');
});

export async function isNewDesign(): Promise<boolean> {
	return Boolean(await elementReady('._9dls', {stopOnDomReady: true}));
}

ipc.answerMain<undefined, boolean>('check-new-ui', async () => {
	return isNewDesign();
});
