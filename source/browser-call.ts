import {ipcRenderer as ipc} from 'electron';
import elementReady from 'element-ready';

const videoSelector = '._chh>video';

(async () => {
	const startCallButton = await elementReady<HTMLElement>('._3quh._30yy._2t_');
	startCallButton.click();
})();

(async function() {
	let videoElement: HTMLElement;
	let previousWidth: number;
	let previousHeight: number;

	// Video size changes with no way to tell, except by polling or attaching timeupdate event (may impact performance)
	function onTimeUpdate(e: Event): void {
		const target = e.target as HTMLVideoElement;
		checkDimensionsChanged(target);
	}

	function checkDimensionsChanged(target: HTMLVideoElement): void {
		console.log(target);

		const width = target.videoWidth;
		const height = target.videoHeight;

		if (width !== previousWidth || height !== previousHeight) {
			previousWidth = width;
			previousHeight = height;
			ipc.send('set-video-call-aspect-ratio', width, height);
		}
	}

	function onVideoDimensionsLoaded(e: Event): void {
		const target = e.target as HTMLVideoElement;
		checkDimensionsChanged(target);
	}

	// Old video element was destroyed, wait for new one.
	function onVideoSuspended(): void {
		if (videoElement) {
			videoElement.removeEventListener('loadedmetadata', onVideoDimensionsLoaded);
			videoElement.removeEventListener('playing', onVideoDimensionsLoaded);
			videoElement.removeEventListener('suspend', getVideoElement);
			videoElement.removeEventListener('pause', getVideoElement);
			videoElement.removeEventListener('timeupdate', onTimeUpdate);
		}

		getVideoElement();
	}

	async function getVideoElement(): Promise<void> {
		console.log('getting video element');
		videoElement = await elementReady<HTMLElement>(videoSelector);

		videoElement.addEventListener('loadedmetadata', onVideoDimensionsLoaded);
		videoElement.addEventListener('playing', onVideoDimensionsLoaded);
		videoElement.addEventListener('suspend', onVideoSuspended);
		videoElement.addEventListener('pause', onVideoSuspended);
		videoElement.addEventListener('timeupdate', onTimeUpdate);
	}

	await getVideoElement();
})();
