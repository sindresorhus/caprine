'use strict';
const config = require('./config');

module.exports = {
	getEmoji(url) {
		const array = url.split('/');
		let type = array[6];

		type = (url.endsWith('f0000.png') ? 'z' : config.get('emojiStyle')) + type.substr(1, type.length); // Fix like emoji on sidebar, it's available only i 'z'
		return url.replace('v9', 'v8').replace(array[6], type);
	}
};
