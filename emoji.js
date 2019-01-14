'use strict';

module.exports = {
	getEmoji: function (emoji) {
		let pixelRatio = 2;
		let size = 16;
		let type = 'z';
		let fileExt = ".png";
		let schemaAuth = "https://static.xx.fbcdn.net/images/emoji.php/v7";
		let path = pixelRatio + '/' + size + '/' + emoji + fileExt;
		let check = getEmojiChecksum(path);

		return schemaAuth + '/' + type + check + '/' + path;
	}
};

function getEmojiChecksum(emoji) {
	let base = 317426846;
	for (let pos = 0; pos < emoji.length; pos++) {
		base = (base << 5) - base + emoji.substr(pos, 1).charCodeAt(0);
		base &= 4294967295;
	}

	return parseInt((base & 255) + '', 10).toString(16);
}
