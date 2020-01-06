import {TouchBar, TouchBarButton as TouchBarButtonType, TouchBarColorPicker as TouchBarColorPickerType, TouchBarGroup as TouchBarGroupType, TouchBarLabel as TouchBarLabelType, TouchBarPopover as TouchBarPopoverType, TouchBarScrubber as TouchBarScrubberType, TouchBarSegmentedControl as TouchBarSegmentedControlType, TouchBarSlider as TouchBarSliderType, TouchBarSpacer as TouchBarSpacerType, ipcMain as ipc, nativeImage, Event as ElectronEvent, SegmentedControlSegment} from 'electron';
import {sendAction, getWindow} from './util';
import {caprineIconPath, previousIconPath, nextIconPath} from './constants';

const {TouchBarButton, TouchBarPopover, TouchBarSegmentedControl} = TouchBar;
type TouchBarItem = (TouchBarButtonType) | (TouchBarColorPickerType) | (TouchBarGroupType) | (TouchBarLabelType) | (TouchBarPopoverType) | (TouchBarScrubberType) | (TouchBarSegmentedControlType) | (TouchBarSliderType) | (TouchBarSpacerType);

const emojilib = require('emojilib').lib;
const emojikeys = require('emojilib').ordered;

// PRIVATE MODE INIT
let privateMode = false;
const privateModeLabel = new TouchBarButton({
	label: 'Private mode enabled',
	icon: nativeImage.createFromPath(caprineIconPath),
	iconPosition: 'left'
});

// CONVERSATIONS INIT
const MAX_VISIBLE_LENGTH = 12;
let conversationPage = 0;
const conversationsPerPage = 3;
let maxConversationPages = 1;
let conversations: Conversation[];
const conversationsPopoverItems: TouchBarItem[] = [];
const previousConvButton = new TouchBarButton({
	icon: nativeImage.createFromPath(previousIconPath),
	click: () => {
		if (conversationPage > 0) {
			conversationPage--;
		}

		refreshConversationsPage();
	}
});
const nextConvButton = new TouchBarButton({
	icon: nativeImage.createFromPath(nextIconPath),
	click: () => {
		if (conversationPage < maxConversationPages - 1) {
			conversationPage++;
		}

		refreshConversationsPage();
	}
});

const conversationSegmentedControl = new TouchBarSegmentedControl({
	segments: [],
	mode: 'buttons',
	segmentStyle: 'separated',
	change: selectedItem => {
		sendAction('jump-to-conversation', selectedItem + (conversationPage * conversationsPerPage) + 1);
	}
});

conversationsPopoverItems.unshift(previousConvButton);
conversationsPopoverItems.push(conversationSegmentedControl);
conversationsPopoverItems.push(nextConvButton);
const conversationsPopover = new TouchBarPopover({
	label: 'Conversations',
	items: new TouchBar({
		items: conversationsPopoverItems
	})
});

// EMOJIS INIT
let emojiPage = 0;
const emojisPerPage = 8;
const maxEmojiPages = emojikeys.length / emojisPerPage;
const emojiPopoverItems: TouchBarItem[] = [];
const emojiSegmentedControl = new TouchBarSegmentedControl({
	segments: [],
	mode: 'buttons',
	segmentStyle: 'separated',
	change: selectedItem => {
		sendAction('add-emoji-from-touchbar', emojiSegmentedControl.segments[selectedItem].label);
	}
});
const previousEmojiButton = new TouchBarButton({
	icon: nativeImage.createFromPath(previousIconPath),
	click: () => {
		if (emojiPage > 0) {
			emojiPage--;
		}
		
		refreshEmojiPage();
	}
});
const nextEmojiButton = new TouchBarButton({
	icon: nativeImage.createFromPath(nextIconPath),
	click: () => {
		if (emojiPage < maxEmojiPages - 1) {
			emojiPage++;
		}

		refreshEmojiPage();
	}
});
emojiPopoverItems.unshift(previousEmojiButton);
emojiPopoverItems.push(emojiSegmentedControl);
emojiPopoverItems.push(nextEmojiButton);
const emojiPopover = new TouchBarPopover({
	label: 'Emoji',
	items: new TouchBar({
		items: emojiPopoverItems
	})
});

function setTouchBar(): void {
	refreshConversationsPage();
	refreshEmojiPage();

	const touchBarItems: TouchBarItem[] = [];
	if (privateMode) {
		touchBarItems.unshift(privateModeLabel);
	} else {
		touchBarItems.unshift(conversationsPopover);
	}

	touchBarItems.push(emojiPopover);
	const touchBar = new TouchBar({items: touchBarItems});
	const win = getWindow();
	win.setTouchBar(touchBar);
}

function refreshEmojiPage(): void {
	const segments: SegmentedControlSegment[] = [];
	emojikeys.slice(emojiPage * emojisPerPage, (emojiPage * emojisPerPage) + emojisPerPage).forEach((element: string) => {
		segments.push({
			label: emojilib[element].char
		});
	});
	emojiSegmentedControl.segments = segments;
}

function refreshConversationsPage(): void {
	conversationSegmentedControl.segments = conversations.slice(conversationPage * conversationsPerPage, (conversationPage * conversationsPerPage) + conversationsPerPage).map(({label, selected, icon}) => {
		if (selected) {
			label = '✅ ' + label;
		}

		return {
			label: label.length > MAX_VISIBLE_LENGTH ? label.slice(0, MAX_VISIBLE_LENGTH - 1) + '…' : label,
			icon: nativeImage.createFromDataURL(icon)
		};
	});
}

ipc.on('conversations', (_event: ElectronEvent, convers: Conversation[], pMode: boolean) => {
	conversations = convers;
	maxConversationPages = conversations.length / conversationsPerPage;
	privateMode = pMode;
	setTouchBar();
});
