'use strict';

module.exports = {
	getEmoji (emoji) {
		const pixelRatio = 2;
		const size = 16;
		const type = 'z';
		const fileExt = '.png';
		const schemaAuth = 'https://static.xx.fbcdn.net/images/emoji.php/v7';
		const path = pixelRatio + '/' + size + '/' + emoji + fileExt;
		const check = getEmojiChecksum(path);

		return schemaAuth + '/' + type + check + '/' + path;
	}
};

function getEmojiChecksum(emoji) {
	let base = 317426846;
	for (let pos = 0; pos < emoji.length; pos++) {
		base = (base << 5) - base + emoji.substr(pos, 1).charCodeAt(0);
		base &= 4294967295;
	}

	return parseInt(String (base & 255) + '', 10).toString(16);
}
