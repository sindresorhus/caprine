// @ts-ignore
import {ipcRenderer as ipc, Event as ElectronEvent} from 'electron';
import elementReady from 'element-ready';

const videoSelector = '._chh>video';

(async () => {
    const startCallButton = await elementReady<HTMLElement>('._3quh._30yy._2t_');
    startCallButton.click();
})();

(async function withVideoCall() {
    let videoElement: HTMLElement;

    // TODO: video size changes with phone orientation. No way to tell, except by polling or attaching timeupdate event

    function onVideoDimensionsLoaded(e: Event) {
        const target = <HTMLVideoElement>e.target;
        // const aspectRatioData = {height: target.videoHeight, width: target.videoWidth};
        console.log(target);
        ipc.send('set-video-call-aspect-ratio', target.videoWidth, target.videoHeight)
    }

    // Old video element was destroyed, wait for new one.
    function onVideoSuspended() {
        if (videoElement) {
            videoElement.removeEventListener('loadedmetadata', onVideoDimensionsLoaded);
            videoElement.removeEventListener('playing', onVideoDimensionsLoaded);
            videoElement.removeEventListener('suspend', getVideoElement);
            videoElement.removeEventListener('pause', getVideoElement);
        }

        getVideoElement()
    }

    async function getVideoElement() {
        console.log('getting video element');
        videoElement = await elementReady<HTMLElement>(videoSelector);

        videoElement.addEventListener('loadedmetadata', onVideoDimensionsLoaded);
        videoElement.addEventListener('playing', onVideoDimensionsLoaded);
        videoElement.addEventListener('suspend', onVideoSuspended);
        videoElement.addEventListener('pause', onVideoSuspended);
    }

    await getVideoElement();
})();