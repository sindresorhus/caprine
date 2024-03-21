import {ipcRenderer as ipc} from 'electron-better-ipc';
import selectors from './browser/selectors';

const conversationId = 'conversationWindow';
const disabledVideoId = 'disabled_autoplay';

export async function toggleVideoAutoplay(): Promise<void> {
	const autoplayVideos = await ipc.callMain<undefined, boolean>('get-config-autoplayVideos');
	if (autoplayVideos) {
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

// Hold reference to videos the user has started playing
// Enables us to check if the video is autoplaying, for example, when changing conversation
const playedVideos: HTMLVideoElement[] = [];

function disableVideoAutoplay(videos: NodeListOf<HTMLVideoElement>): void {
	for (const video of videos) {
		// Don't disable currently playing videos
		if (playedVideos.includes(video)) {
			continue;
		}

		const firstParent = video.parentElement!;

		// Video parent element which has a snapshot of the video as a background image
		const parentWithBackground = video.parentElement!.parentElement!.parentElement!;

		// Hold reference to the background parent so we can revert our changes
		const parentWithBackgroundParent = parentWithBackground.parentElement!;

		// Reference to the original play icon on top of the video
		const playIcon = video.nextElementSibling!.nextElementSibling! as HTMLElement;
		// If the video is playing, the icon is hidden
		playIcon.classList.remove('hidden_elem');

		// Set the `id` so we can easily trigger a click-event when reverting changes
		playIcon.setAttribute('id', disabledVideoId);

		const {
			style: {width, height},
		} = firstParent;

		const style = parentWithBackground.style || window.getComputedStyle(parentWithBackground);
		const backgroundImageSource = style.backgroundImage.slice(4, -1).replaceAll(/"/, '');

		// Create the image to replace the video as a placeholder
		const image = document.createElement('img');
		image.setAttribute('src', backgroundImageSource);
		image.classList.add('disabledAutoPlayImgTopRadius');

		// If it's a video without a source title bar at the bottom,
		// round the bottom part of the video
		if (parentWithBackgroundParent.childElementCount === 1) {
			image.classList.add('disabledAutoPlayImgBottomRadius');
		}

		image.setAttribute('height', height);
		image.setAttribute('width', width);

		// Create a separate instance of the play icon
		// Clone the existing icon to get the original events
		// Without creating a new icon, Messenger auto-hides the icon when scrolled to the video
		const copiedPlayIcon = playIcon.cloneNode(true) as HTMLElement;

		// Remove the image and the new play icon and append the original divs
		// We can enable autoplay again by triggering this event
		copiedPlayIcon.addEventListener('play', () => {
			image.remove();
			copiedPlayIcon.remove();
			parentWithBackgroundParent.prepend(parentWithBackground);
		});

		// Separate handler for `click` so we know if it was the user who played the video
		copiedPlayIcon.addEventListener('click', () => {
			playedVideos.push(video);
			const event = new Event('play');
			copiedPlayIcon.dispatchEvent(event);
			// Sometimes the video doesn't start playing even though we trigger the click event
			// As a workaround, check if the video didn't start playing and manually trigger
			// the click event
			setTimeout(() => {
				if (video.paused) {
					playIcon.click();
				}
			}, 50);
		});

		parentWithBackgroundParent.prepend(image);
		parentWithBackgroundParent.prepend(copiedPlayIcon);
		parentWithBackground.remove();
	}
}

// If we previously disabled autoplay on videos,
// trigger the `copiedPlayIcon` click event to revert changes
function enableVideoAutoplay(): void {
	const playIcons = document.querySelectorAll(`#${disabledVideoId}`);
	for (const icon of playIcons) {
		const event = new Event('play');
		icon.dispatchEvent(event);
	}
}

function getVideos(): NodeListOf<HTMLVideoElement> {
	return document.querySelectorAll('video');
}

function startConversationWindowObserver(): void {
	conversationDivObserver.observe(document.documentElement, {
		childList: true,
		subtree: true,
	});
}

function startVideoObserver(element: Element): void {
	videoObserver.observe(element, {
		childList: true,
		subtree: true,
	});
}

// A way to hold reference to conversation part of the document
// Used to refresh `videoObserver` after the conversation reference is lost
let conversationWindow: Element;
const conversationDivObserver = new MutationObserver(_ => {
	let conversation = document.querySelector(`#${conversationId}`);

	// Fetch it using `querySelector` if no luck with the `conversationId`
	conversation ||= document.querySelector(selectors.conversationSelector);

	// If we have a new reference
	if (conversation && conversationWindow !== conversation) {
		// Add `conversationId` so we know when we've lost the reference to
		// the `conversationWindow` and we can restart the video observer
		conversation.id = conversationId;
		conversationWindow = conversation;
		startVideoObserver(conversationWindow);
	}
});

// Reference to mutation observer
// Only active if the user has set option to disable video autoplay
const videoObserver = new MutationObserver(_ => {
	// Select by tag instead of iterating over mutations which is more performant
	const videos = getVideos();
	// If videos were added disable autoplay
	if (videos.length > 0) {
		disableVideoAutoplay(videos);
	}
});
