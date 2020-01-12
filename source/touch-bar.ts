import {TouchBar, nativeImage} from 'electron';
import {ipcMain as ipc} from 'electron-better-ipc';
import {sendAction, getWindow} from './util';
import {caprineIconPath} from './constants';

const {TouchBarButton} = TouchBar;
const MAX_VISIBLE_LENGTH = 25;

function setTouchBar(items: Electron.TouchBarButton[]): void {
	const touchBar = new TouchBar({items});
	const win = getWindow();
	win.setTouchBar(touchBar);
}

ipc.answerRenderer('conversations', (conversations: Conversation[]) => {
	const items = conversations.map(({label, selected, icon}, index: number) => {
		return new TouchBarButton({
			label: label.length > MAX_VISIBLE_LENGTH ? label.slice(0, MAX_VISIBLE_LENGTH) + '…' : label,
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

ipc.answerRenderer('hide-touchbar-labels', () => {
	const privateModeLabel = new TouchBarButton({
		label: 'Private mode enabled',
		backgroundColor: undefined,
		icon: nativeImage.createFromPath(caprineIconPath),
		iconPosition: 'left',
		click: undefined
	});
	setTouchBar([privateModeLabel]);
});
