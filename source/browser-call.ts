// @ts-ignore
import {ipcRenderer as ipc, Event as ElectronEvent} from 'electron';
import elementReady from 'element-ready';

const videoSelector = '._chh>video';

(async () => {
    const startCallButton = await elementReady<HTMLElement>('._3quh._30yy._2t_');
    startCallButton.click();
})();

(async function withVideoCall() {
    function onVideoDimensionsLoaded(e: Event) {
        const target = <HTMLVideoElement>e.target;
        // const aspectRatioData = {height: target.videoHeight, width: target.videoWidth};
        console.log(target);
        ipc.send('set-video-call-aspect-ratio', target.videoWidth, target.videoHeight)
    }

    const videoElement = await elementReady<HTMLElement>(videoSelector);
    videoElement.addEventListener('loadedmetadata', onVideoDimensionsLoaded);
    videoElement.addEventListener('playing', onVideoDimensionsLoaded)
})();