'use strict';
const config = require('./config');

module.exports = {
	getEmoji(url) {
		const array = url.split('/');
		let type = array[6];
		type = config.get('emojiStyle') + type.substr(1, type.length);
		return url.replace('v9', 'v8').replace(array[6], type);
	}
};
