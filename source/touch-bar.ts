import {TouchBar, ipcMain as ipc, nativeImage, Event as ElectronEvent} from 'electron';
import {is} from 'electron-util';
import config from './config';
import {sendAction, getWindow} from './util';
import {caprineIconPath} from './constants';

const {TouchBarButton} = TouchBar;
const MAX_VISIBLE_LENGTH = 25;
const privateModeTouchBarLabel: Electron.TouchBarButton = new TouchBarButton({
	label: 'Private mode enabled',
	backgroundColor: undefined,
	icon: nativeImage.createFromPath(caprineIconPath),
	iconPosition: 'left',
	click: undefined
});

function setTouchBar(items: Electron.TouchBarButton[]): void {
	const touchBar = new TouchBar({items});
	const win = getWindow();
	win.setTouchBar(touchBar);
}

function createTouchBarButton(label: string, selected: boolean, icon: string, index: number): Electron.TouchBarButton {
	return new TouchBarButton({
		label: label.length > MAX_VISIBLE_LENGTH ? label.slice(0, MAX_VISIBLE_LENGTH) + '…' : label,
		backgroundColor: selected ? '#0084ff' : undefined,
		icon: nativeImage.createFromDataURL(icon),
		iconPosition: 'left',
		click: () => {
			sendAction('jump-to-conversation', index + 1);
		}
	});
}

ipc.on('conversations', (_event: ElectronEvent, conversations: Conversation[]) => {
	const isPrivateModeEnabled: boolean = is.macos && config.get('privateMode');
	let touchBarItems: Electron.TouchBarButton[];
	if (isPrivateModeEnabled) {
		touchBarItems = [privateModeTouchBarLabel];
	} else {
		touchBarItems = conversations.map(({label, selected, icon}, index: number) => {
			return createTouchBarButton(label, selected, icon, index);
		});
	}

	setTouchBar(touchBarItems);
});

ipc.on('hide-touchbar-labels', (_event: ElectronEvent) => {
	setTouchBar([privateModeTouchBarLabel]);
});
