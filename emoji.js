'use strict';
const config = require('./config');

module.exports = {
	getEmoji(url) {
		// 'Like' emoji in the sidebar is available only in 'z' emoji set
		if (url.endsWith('f0000.png')) {
			return url + '#replaced';
		}

		const type = config.get('emojiStyle');
		return url.replace(/(emoji\.php\/v9\/)(.)(.+\/)/, `$1${type}$3`) + '#replaced';
	}
};
