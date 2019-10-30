import {TouchBar, ipcMain as ipc, nativeImage, Event as ElectronEvent} from 'electron';
import {sendAction, getWindow} from './util';
import {caprineIconPath} from './constants';

const {TouchBarButton} = TouchBar;

function setTouchBar(items: any[]): void {
	const touchBar = new TouchBar({items});
	const win = getWindow();
	win.setTouchBar(touchBar);
}

ipc.on('conversations', (_event: ElectronEvent, conversations: Conversation[]) => {
	const items = conversations.map(({label, selected, icon}, index: number) => {
		return new TouchBarButton({
			label: label.length > 25 ? label.slice(0, 25) + '…' : label,
			backgroundColor: selected ? '#0084ff' : undefined,
			icon: nativeImage.createFromDataURL(icon),
			iconPosition: 'left',
			click: () => {
				sendAction('jump-to-conversation', index + 1);
			}
		});
	});
	setTouchBar(items);
});

ipc.on('hide-touchbar-labels', (_event: ElectronEvent) => {
	const privateModeLabel = new TouchBarButton({
		label: 'Private mode enabled',
		backgroundColor: undefined,
		icon: nativeImage.createFromPath(caprineIconPath),
		iconPosition: 'left',
		click: undefined
	});
	setTouchBar([privateModeLabel]);
});
