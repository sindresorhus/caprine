'use strict';
const electron = require('electron');
const {api, is} = require('electron-util');
const elementReady = require('element-ready');
const config = require('./config');

const {ipcRenderer: ipc} = electron;

const listSelector = 'div[role="navigation"] > div > ul';
const conversationSelector = '._4u-c._1wfr > ._5f0v.uiScrollableArea';
const selectedConversationSelector = '._5l-3._1ht1._1ht2';
const preferencesSelector = '._10._4ebx.uiLayer._4-hy';


// Refence to mutation observer
// Only active if user has set preference to disable video autoplay
const videoObserver = new MutationObserver(function (mutations) {
	mutations.forEach(function (mutation) {
		if (mutation.addedNodes.length > 0) {
			// If video was added disable autoplay
			if (mutation.addedNodes[0].classList) {
				if (mutation.addedNodes[0].classList[0] === '_1c_u') {
					disableVideoAutoplay();
				}
			}
		}
	});
});

async function withMenu(menuButtonElement, callback) {
	const {classList} = document.documentElement;

	// Prevent the dropdown menu from displaying
	classList.add('hide-dropdowns');

	// Click the menu button
	menuButtonElement.click();

	// Wait for the menu to close before removing the 'hide-dropdowns' class
	const menuLayer = document.querySelector('.uiContextualLayerPositioner:not(.hidden_elem)');
	const observer = new MutationObserver(() => {
		if (menuLayer.classList.contains('hidden_elem')) {
			classList.remove('hide-dropdowns');
			observer.disconnect();
		}
	});
	observer.observe(menuLayer, {attributes: true, attributeFilter: ['class']});

	await callback();
}

async function withSettingsMenu(callback) {
	await withMenu(await elementReady('._30yy._2fug._p'), callback);
}

function selectMenuItem(itemNumber) {
	const selector = document.querySelector(
		`.uiLayer:not(.hidden_elem) ._54nq._2i-c._558b._2n_z li:nth-child(${itemNumber}) a`
	);
	selector.click();
}

async function selectOtherListViews(itemNumber) {
	// In case one of other views is shown
	clickBackButton();

	await withSettingsMenu(() => {
		selectMenuItem(itemNumber);
	});
}

function clickBackButton() {
	const backButton = document.querySelector('._30yy._2oc9');
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
	document.querySelector("._30yy[data-href$='/new']").click();
});

ipc.on('log-out', async () => {
	if (config.get('useWorkChat')) {
		// Create the menu for the below
		document.querySelector('._5lxs._3qct._p').click();
		// Menu creation is slow
		setTimeout(() => {
			const nodes = document.querySelectorAll('._54nq._9jo._558b._2n_z li:last-child a');
			nodes[nodes.length - 1].click();
		}, 250);
	} else {
		await withSettingsMenu(() => {
			const nodes = document.querySelectorAll('._54nq._2i-c._558b._2n_z li:last-child a');
			nodes[nodes.length - 1].click();
		});
	}
});

ipc.on('find', () => {
	document.querySelector('._58al').focus();
});

ipc.on('search', () => {
	document.querySelector('._3szo:nth-of-type(1)').click();
});

ipc.on('insert-gif', () => {
	document.querySelector('._yht').click();
});

ipc.on('insert-emoji', () => {
	document.querySelector('._5s2p').click();
});

ipc.on('insert-text', () => {
	document.querySelector('._5rpu').focus();
});

ipc.on('next-conversation', nextConversation);

ipc.on('previous-conversation', previousConversation);

ipc.on('mute-conversation', () => {
	openMuteModal();
});

ipc.on('delete-conversation', () => {
	deleteSelectedConversation();
});

ipc.on('archive-conversation', async () => {
	const index = selectedConversationIndex();

	if (index !== -1) {
		archiveSelectedConversation();

		const key = index + 1;
		await jumpToConversation(key);
	}
});

function setSidebarVisibility() {
	document.documentElement.classList.toggle('sidebar-hidden', config.get('sidebarHidden'));
	ipc.send('set-sidebar-visibility');
}

ipc.on('toggle-mute-notifications', async (event, defaultStatus) => {
	const preferencesAreOpen = isPreferencesOpen();
	if (!preferencesAreOpen) {
		const style = document.createElement('style');
		// Hide both the backdrop and the preferences dialog
		style.textContent = `${preferencesSelector} ._3ixn, ${preferencesSelector} ._59s7 { opacity: 0 !important }`;
		document.body.append(style);

		await openPreferences();

		// Will clean up itself after the preferences are closed
		document.querySelector(preferencesSelector).append(style);
	}

	const notificationCheckbox = document.querySelector('._374b:nth-of-type(4) ._4ng2 input');

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

ipc.on('toggle-disable-video-autoplay', setAutoplayVideos);


function setDarkMode() {
	if (is.macos && config.get('followSystemAppearance')) {
		document.documentElement.classList.toggle('dark-mode', api.systemPreferences.isDarkMode());
	} else {
		document.documentElement.classList.toggle('dark-mode', config.get('darkMode'));
	}

	updateVibrancy();
}

function updateVibrancy() {
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

function renderOverlayIcon(messageCount) {
	const canvas = document.createElement('canvas');
	canvas.height = 128;
	canvas.width = 128;
	canvas.style.letterSpacing = '-5px';
	const ctx = canvas.getContext('2d');
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

ipc.on('render-overlay-icon', (event, messageCount) => {
	ipc.send(
		'update-overlay-icon',
		renderOverlayIcon(messageCount).toDataURL(),
		String(messageCount)
	);
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

ipc.on('jump-to-conversation', async (event, key) => {
	await jumpToConversation(key);
});

async function nextConversation() {
	const index = selectedConversationIndex(1);

	if (index !== -1) {
		await selectConversation(index);
	}
}

async function previousConversation() {
	const index = selectedConversationIndex(-1);

	if (index !== -1) {
		await selectConversation(index);
	}
}

async function jumpToConversation(key) {
	const index = key - 1;
	await selectConversation(index);
}

// Focus on the conversation with the given index
async function selectConversation(index) {
	const conversationElement = (await elementReady(listSelector)).children[index];

	if (conversationElement) {
		conversationElement.firstChild.firstChild.click();
	}
}

function selectedConversationIndex(offset = 0) {
	const selected = document.querySelector(selectedConversationSelector);

	if (!selected) {
		return -1;
	}

	const list = [...selected.parentNode.children];
	const index = list.indexOf(selected) + offset;

	return ((index % list.length) + list.length) % list.length;
}

function setZoom(zoomFactor) {
	const node = document.querySelector('#zoomFactor');
	node.textContent = `${conversationSelector} {zoom: ${zoomFactor} !important}`;
	config.set('zoomFactor', zoomFactor);
}

async function withConversationMenu(callback) {
	const menuButton = document.querySelector(`${selectedConversationSelector} ._5blh._4-0h`);

	if (menuButton) {
		await withMenu(menuButton, callback);
	}
}

function openMuteModal() {
	withConversationMenu(() => {
		selectMenuItem(1);
	});
}

function archiveSelectedConversation() {
	const groupConversationProfilePicture = document.querySelector(
		`${selectedConversationSelector} ._55lu`
	);
	const isGroupConversation = Boolean(groupConversationProfilePicture);

	withConversationMenu(() => {
		selectMenuItem(isGroupConversation ? 4 : 3);
	});
}

function deleteSelectedConversation() {
	const groupConversationProfilePicture = document.querySelector(
		`${selectedConversationSelector} ._55lu`
	);
	const isGroupConversation = Boolean(groupConversationProfilePicture);

	withConversationMenu(() => {
		selectMenuItem(isGroupConversation ? 5 : 4);
	});
}

async function openPreferences() {
	await withSettingsMenu(() => {
		selectMenuItem(1);
	});
}

function isPreferencesOpen() {
	return Boolean(document.querySelector('._3quh._30yy._2t_._5ixy'));
}

function closePreferences() {
	const doneButton = document.querySelector('._3quh._30yy._2t_._5ixy');
	doneButton.click();
}

async function sendConversationList() {
	const conversations = await Promise.all(
		[...(await elementReady(listSelector)).children].splice(0, 10).map(async el => {
			const profilePic = el.querySelector('._55lt img');
			const groupPic = el.querySelector('._4ld- div');

			// This is only for group chats
			if (groupPic) {
				// Slice image source from background-image style property of div
				groupPic.src = groupPic.style.backgroundImage.slice(
					5,
					groupPic.style.backgroundImage.length - 2
				);
			}

			const isConversationMuted = el.classList.contains('_569x');

			return {
				label: el.querySelector('._1ht6').textContent,
				selected: el.classList.contains('_1ht2'),
				unread: el.classList.contains('_1ht3') && !isConversationMuted,
				icon: await getDataUrlFromImg(
					profilePic ? profilePic : groupPic,
					el.classList.contains('_1ht3')
				)
			};
		})
	);

	ipc.send('conversations', conversations);
}

// Return canvas with rounded image
function urlToCanvas(url, size) {
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

			const ctx = canvas.getContext('2d');

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
function getDataUrlFromImg(img, unread) {
	// eslint-disable-next-line no-async-promise-executor
	return new Promise(async resolve => {
		if (!unread) {
			if (img.dataUrl) {
				return resolve(img.dataUrl);
			}
		} else if (img.dataUnreadUrl) {
			return resolve(img.dataUnreadUrl);
		}

		const canvas = await urlToCanvas(img.src, 30);
		const ctx = canvas.getContext('2d');
		img.dataUrl = canvas.toDataURL();

		if (!unread) {
			return resolve(img.dataUrl);
		}

		const markerSize = 8;
		ctx.fillStyle = '#f42020';
		ctx.beginPath();
		ctx.ellipse(canvas.width - markerSize, markerSize, markerSize, markerSize, 0, 0, 2 * Math.PI);
		ctx.fill();
		img.dataUnreadUrl = canvas.toDataURL();
		resolve(img.dataUnreadUrl);
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
	const sidebar = document.querySelector('[role=navigation]');

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
		const keepMeSignedInCheckbox = document.querySelector('#u_0_0');
		keepMeSignedInCheckbox.checked = config.get('keepMeSignedIn');
		keepMeSignedInCheckbox.addEventListener('click', () => {
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
window.addEventListener('message', ({data: {type, data}}) => {
	if (type === 'notification') {
		showNotification(data);
	}
});

function showNotification({id, title, body, icon, silent}) {
	body = body.props ? body.props.content[0] : body;
	title = typeof title === 'object' && title.props ? title.props.content[0] : title;

	const img = new Image();
	img.crossOrigin = 'anonymous';
	img.src = icon;

	img.addEventListener('load', () => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

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

ipc.on('notification-callback', (event, data) => {
	window.postMessage({type: 'notification-callback', data}, '*');
});


async function startVideoObserver() {
	videoObserver.observe(document.documentElement, {
		childList: true,
		subtree: true,
	});
}

// Hold reference to videos user has started playing
// Enables us to check if video is autoplaying for example when changing conversation
const playedVideos = [];

async function disableVideoAutoplay() {
	const messageDiv = await elementReady(conversationSelector);
	var videos = messageDiv.querySelectorAll('video');
	for (var i = 0; i < videos.length; i++) {
		const video = videos[i];

		// Dont disable currently playing videos
		if (playedVideos.includes(video)) continue;

		const firstParent = video.parentElement;

		// Video parent element which has a snapshot of video as background-image 
		const parentWithBackground = video.parentElement.parentElement.parentElement;

		// Hold reference to background parent so we can revert our changes
		const parentWithBackgroundParent = parentWithBackground.parentElement;

		// Reference to original play icon on top of the video
		const playIcon = video.nextElementSibling.nextElementSibling;
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
			parentWithBackground.currentStyle || window.getComputedStyle(parentWithBackground, false);
		const backgroundImageSrc = style.backgroundImage.slice(4, -1).replace(/"/g, '');

		// Create image to replace video as a placeholder
		const img = document.createElement('img');
		img.setAttribute('src', backgroundImageSrc);
		img.setAttribute('height', height);
		img.setAttribute('width', width);

		// Create seperate instance of the play icon
		// Clone the existing icon to get original events
		// Without creating a new icon Messenger autohides the icon when scrolled to video
		const copyedPlayIcon = playIcon.cloneNode(true);

		// Remove image and new play icon and append the original divs
		// We can enable autoplay again by triggering this event
		copyedPlayIcon.addEventListener('onplay', () => {
			parentWithBackgroundParent.removeChild(img);
			parentWithBackgroundParent.removeChild(copyedPlayIcon);
			parentWithBackgroundParent.prepend(parentWithBackground);
		});

		// Separate handler for click so we know if it was user who played the video
		copyedPlayIcon.onclick = () => {
			playedVideos.push(video);
			var event = new Event('onplay');
			copyedPlayIcon.dispatchEvent(event);
			// Sometimes video doesnt start playing even tho we trigger the click event
			// As a workaround check if video didnt start playing and manually trigger the click event
			setTimeout(() => {
				if (video.paused) {
					playIcon.click();
				}
			}, 50);
		};

		parentWithBackgroundParent.prepend(img);
		parentWithBackgroundParent.prepend(copyedPlayIcon);
		parentWithBackground.remove();
	}
}

// If we previously disabled autoplay on videos trigger copyedPlayIcon click event to revert changes
function enableVideoAutoplay() {
	const playIcons = document.querySelectorAll('#disabled_autoplay');
	playIcons.forEach(icon => {
		var event = new Event('onplay');
		icon.dispatchEvent(event);
});
}


function setAutoplayVideos() {
	if (config.get('disableVideoAutoplay')) {
		// Start the observer
		startVideoObserver();

		// Disable for existing videos
		disableVideoAutoplay();
	} else {
		// Stop the observer
		videoObserver.disconnect();

		// Revert previous changes
		enableVideoAutoplay();
	}
}
