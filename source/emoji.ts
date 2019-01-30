import * as path from 'path';
import {nativeImage, NativeImage, MenuItemConstructorOptions, Response} from 'electron';
import config from './config';
import {showRestartDialog} from './util';

// The list of emojis that aren't supported by older emoji (facebook-2-2, messenger-1-0)
// Based on https://emojipedia.org/facebook/3.0/new/
const excludedEmoji = new Set([
	'f0000', // Facebook's thumbs-up icon as shown on the contacts list
	'1f3c3_200d_2640',
	'1f3c4_200d_2640',
	'1f3ca_200d_2640',
	'1f3f4_200d_2620',
	'1f468_1f3fb_200d_1f9b0',
	'1f468_1f3fb_200d_1f9b1',
	'1f468_1f3fb_200d_1f9b2',
	'1f468_1f3fb_200d_1f9b3',
	'1f468_1f3fc_200d_1f9b0',
	'1f468_1f3fc_200d_1f9b1',
	'1f468_1f3fc_200d_1f9b2',
	'1f468_1f3fc_200d_1f9b3',
	'1f468_1f3fd_200d_1f9b0',
	'1f468_1f3fd_200d_1f9b1',
	'1f468_1f3fd_200d_1f9b2',
	'1f468_1f3fd_200d_1f9b3',
	'1f468_1f3fe_200d_1f9b0',
	'1f468_1f3fe_200d_1f9b1',
	'1f468_1f3fe_200d_1f9b2',
	'1f468_1f3fe_200d_1f9b3',
	'1f468_1f3ff_200d_1f9b0',
	'1f468_1f3ff_200d_1f9b1',
	'1f468_1f3ff_200d_1f9b2',
	'1f468_1f3ff_200d_1f9b3',
	'1f468_200d_1f9b0',
	'1f468_200d_1f9b1',
	'1f468_200d_1f9b2',
	'1f468_200d_1f9b3',
	'1f468_200d_2764_200d_1f468',
	'1f468_200d_2764_200d_1f48b_200d_1f468',
	'1f469_1f3fb_200d_1f9b0',
	'1f469_1f3fb_200d_1f9b1',
	'1f469_1f3fb_200d_1f9b2',
	'1f469_1f3fb_200d_1f9b3',
	'1f469_1f3fc_200d_1f9b0',
	'1f469_1f3fc_200d_1f9b1',
	'1f469_1f3fc_200d_1f9b2',
	'1f469_1f3fc_200d_1f9b3',
	'1f469_1f3fd_200d_1f9b0',
	'1f469_1f3fd_200d_1f9b1',
	'1f469_1f3fd_200d_1f9b2',
	'1f469_1f3fd_200d_1f9b3',
	'1f469_1f3fe_200d_1f9b0',
	'1f469_1f3fe_200d_1f9b1',
	'1f469_1f3fe_200d_1f9b2',
	'1f469_1f3fe_200d_1f9b3',
	'1f469_1f3ff_200d_1f9b0',
	'1f469_1f3ff_200d_1f9b1',
	'1f469_1f3ff_200d_1f9b2',
	'1f469_1f3ff_200d_1f9b3',
	'1f469_200d_1f9b0',
	'1f469_200d_1f9b1',
	'1f469_200d_1f9b2',
	'1f469_200d_1f9b3',
	'1f469_200d_2764_200d_1f469',
	'1f469_200d_2764_200d_1f48b_200d_1f469',
	'1f46e_200d_2640',
	'1f46f_200d_2640',
	'1f471_200d_2640',
	'1f473_200d_2640',
	'1f477_200d_2640',
	'1f481_200d_2640',
	'1f482_200d_2640',
	'1f486_200d_2640',
	'1f487_200d_2640',
	'1f645_200d_2640',
	'1f646_200d_2640',
	'1f647_200d_2640',
	'1f64b_200d_2640',
	'1f64d_200d_2640',
	'1f64e_200d_2640',
	'1f6a3_200d_2640',
	'1f6b4_200d_2640',
	'1f6b5_200d_2640',
	'1f6b6_200d_2640',
	'1f6f9',
	'1f94d',
	'1f94e',
	'1f94f',
	'1f96c',
	'1f96d',
	'1f96e',
	'1f96f',
	'1f970',
	'1f973',
	'1f974',
	'1f975',
	'1f976',
	'1f97a',
	'1f97c',
	'1f97d',
	'1f97e',
	'1f97f',
	'1f998',
	'1f999',
	'1f99a',
	'1f99b',
	'1f99c',
	'1f99d',
	'1f99e',
	'1f99f',
	'1f9a0',
	'1f9a1',
	'1f9a2',
	'1f9b0',
	'1f9b1',
	'1f9b2',
	'1f9b3',
	'1f9b4',
	'1f9b5_1f3fb',
	'1f9b5_1f3fc',
	'1f9b5_1f3fd',
	'1f9b5_1f3fe',
	'1f9b5_1f3ff',
	'1f9b5',
	'1f9b6_1f3fb',
	'1f9b6_1f3fc',
	'1f9b6_1f3fd',
	'1f9b6_1f3fe',
	'1f9b6_1f3ff',
	'1f9b6',
	'1f9b7',
	'1f9b8_1f3fb',
	'1f9b8_1f3fb_200d_2640',
	'1f9b8_1f3fb_200d_2642',
	'1f9b8_1f3fc',
	'1f9b8_1f3fc_200d_2640',
	'1f9b8_1f3fc_200d_2642',
	'1f9b8_1f3fd',
	'1f9b8_1f3fd_200d_2640',
	'1f9b8_1f3fd_200d_2642',
	'1f9b8_1f3fe',
	'1f9b8_1f3fe_200d_2640',
	'1f9b8_1f3fe_200d_2642',
	'1f9b8_1f3ff',
	'1f9b8_1f3ff_200d_2640',
	'1f9b8_1f3ff_200d_2642',
	'1f9b8_200d_2640',
	'1f9b8_200d_2642',
	'1f9b8',
	'1f9b9_1f3fb',
	'1f9b9_1f3fb_200d_2640',
	'1f9b9_1f3fb_200d_2642',
	'1f9b9_1f3fc',
	'1f9b9_1f3fc_200d_2640',
	'1f9b9_1f3fc_200d_2642',
	'1f9b9_1f3fd',
	'1f9b9_1f3fd_200d_2640',
	'1f9b9_1f3fd_200d_2642',
	'1f9b9_1f3fe',
	'1f9b9_1f3fe_200d_2640',
	'1f9b9_1f3fe_200d_2642',
	'1f9b9_1f3ff',
	'1f9b9_1f3ff_200d_2640',
	'1f9b9_1f3ff_200d_2642',
	'1f9b9_200d_2640',
	'1f9b9_200d_2642',
	'1f9b9',
	'1f9c1',
	'1f9c2',
	'1f9e7',
	'1f9e8',
	'1f9e9',
	'1f9ea',
	'1f9eb',
	'1f9ec',
	'1f9ed',
	'1f9ee',
	'1f9ef',
	'1f9f0',
	'1f9f1',
	'1f9f2',
	'1f9f3',
	'1f9f4',
	'1f9f5',
	'1f9f6',
	'1f9f7',
	'1f9f8',
	'1f9f9',
	'1f9fa',
	'1f9fb',
	'1f9fc',
	'1f9fd',
	'1f9fe',
	'1f9ff',
	'265f',
	'267e'
]);

export enum EmojiStyle {
	Facebook30 = 'facebook-3-0',
	Messenger10 = 'messenger-1-0',
	Facebook22 = 'facebook-2-2'
}

enum EmojiStyleCode {
	Facebook30 = 't',
	Messenger10 = 'z',
	Facebook22 = 'f'
}

function codeForEmojiStyle(style: EmojiStyle): EmojiStyleCode {
	switch (style) {
		case 'facebook-2-2':
			return EmojiStyleCode.Facebook22;
		case 'messenger-1-0':
			return EmojiStyleCode.Messenger10;
		case 'facebook-3-0':
		default:
			return EmojiStyleCode.Facebook30;
	}
}

const menuIcons = new Map<EmojiStyle, NativeImage>();

function getEmojiIcon(style: EmojiStyle): NativeImage {
	const cachedIcon = menuIcons.get(style);

	if (cachedIcon) {
		return cachedIcon;
	}

	const image = nativeImage.createFromPath(
		path.join(__dirname, '..', 'static', `emoji-${style}.png`)
	);

	menuIcons.set(style, image);

	return image;
}

// For example, when 'emojiStyle' setting is set to 'messenger-1-0' it replaces
// this URL:  https://static.xx.fbcdn.net/images/emoji.php/v9/t27/2/32/1f600.png
// with this: https://static.xx.fbcdn.net/images/emoji.php/v9/z27/2/32/1f600.png
// 																								 (see here) ^
export function process(url: string): Response {
	const emojiStyle = config.get('emojiStyle');
	const emojiSetCode = codeForEmojiStyle(emojiStyle);

	// The character code is the filename without the extension.
	const characterCodeEnd = url.lastIndexOf('.png');
	const characterCode = url.substring(url.lastIndexOf('/') + 1, characterCodeEnd);

	if (
		// Don't replace emoji from Facebook's latest emoji set
		emojiSetCode === 't' ||
		// Don't replace the same URL in a loop
		url.includes('#replaced') ||
		// Ignore non-png files
		characterCodeEnd === -1 ||
		// Messenger 1.0 and Facebook 2.2 emoji sets support only emoji up to version 5.0.
		// Fall back to default style for emoji >= 10.0
		excludedEmoji.has(characterCode)
	) {
		return {};
	}

	const emojiSetPrefix = 'emoji.php/v9/';
	const emojiSetIndex = url.indexOf(emojiSetPrefix) + emojiSetPrefix.length;
	const newURL =
		url.slice(0, emojiSetIndex) + emojiSetCode + url.slice(emojiSetIndex + 1) + '#replaced';

	return {redirectURL: newURL};
}

export function generateSubmenu(updateMenu: () => void): MenuItemConstructorOptions[] {
	const emojiMenuOption = (label: string, style: EmojiStyle): MenuItemConstructorOptions => ({
		label,
		type: 'checkbox',
		icon: getEmojiIcon(style),
		checked: config.get('emojiStyle') === style,
		click() {
			config.set('emojiStyle', style);

			updateMenu();
			showRestartDialog('Caprine needs to be restarted to apply emoji changes.');
		}
	});

	return [
		emojiMenuOption('Facebook 3.0', EmojiStyle.Facebook30),
		emojiMenuOption('Messenger 1.0', EmojiStyle.Messenger10),
		emojiMenuOption('Facebook 2.2', EmojiStyle.Facebook22)
	];
}
