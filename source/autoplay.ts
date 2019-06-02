import config from './config';
import selectors from './browser/selectors';

const conversationId = 'conversationWindow';
const disabledVideoId = 'disabled_autoplay';

export function toggleVideoAutoplay(): void {
    if (config.get('autoplayVideos')) {
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

// Hold reference to videos user has started playing
// Enables us to check if video is autoplaying for example when changing conversation
const playedVideos: HTMLVideoElement[] = [];

function disableVideoAutoplay(videos: NodeListOf<HTMLVideoElement>): void {
    for (const video of videos) {
        // Dont disable currently playing videos
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
        playIcon.setAttribute('id', disabledVideoId);

        const {
            style: { width, height }
        } = firstParent;

        const style = parentWithBackground.style || window.getComputedStyle(parentWithBackground);
        const backgroundImageSrc = style.backgroundImage!.slice(4, -1).replace(/"/g, '');

        // Create image to replace video as a placeholder
        const img = document.createElement('img');
        img.setAttribute('src', backgroundImageSrc);
        img.classList.add('disabledAutoPlayImg');
        img.setAttribute('height', height!);
        img.setAttribute('width', width!);

        // Create seperate instance of the play icon
        // Clone the existing icon to get original events
        // Without creating a new icon Messenger autohides the icon when scrolled to video
        const copyedPlayIcon = playIcon.cloneNode(true) as HTMLElement;

        // Remove image and new play icon and append the original divs
        // We can enable autoplay again by triggering this event
        copyedPlayIcon.addEventListener('play', () => {
            img.remove();
            copyedPlayIcon.remove();
            parentWithBackgroundParent.prepend(parentWithBackground);
        });

        // Separate handler for click so we know if it was user who played the video
        copyedPlayIcon.addEventListener('click', () => {
            playedVideos.push(video);
            const event = new Event('play');
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
    const playIcons = document.querySelectorAll('#' + disabledVideoId);
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
        subtree: true
    });
}

function startVideoObserver(element: Element): void {
    videoObserver.observe(element, {
        childList: true,
        subtree: true
    });
}

// A way to hold reference to conversation part of document
// Used to refresh videoObserver after the conversation reference is lost
let conversationWindow: Element;
const conversationDivObserver = new MutationObserver(_ => {
    let conversation = document.querySelector('#' + conversationId);

    // Fetch it using querySelector if no luck with id
    if (!conversation) conversation = document.querySelector(selectors.conversationSelector);

    // If we have a new reference
    if (conversation && conversationWindow !== conversation) {
        // Add id so we know when we've lost reference to conversationWindow and we can restart the video observer
        conversation.id = conversationId;
        conversationWindow = conversation;
        startVideoObserver(conversationWindow);
    }
});

// Refence to mutation observer
// Only active if user has set preference to disable video autoplay
const videoObserver = new MutationObserver(_ => {
    // Select by tag instead of iterating over mutations which is highly more performant
    const videos = getVideos();
    // If videos was added disable autoplay
    if (videos.length > 0) disableVideoAutoplay(videos);
});
