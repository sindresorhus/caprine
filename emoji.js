'use strict';
const config = require('./config');

const excludedEmoji = new Set([
	'f0000',
	'1f3c3_200d_2640',
	'1f3c3_200d_2640',
	'1f3c4_200d_2640',
	'1f3ca_200d_2640',
	'1f468_200d_2764_200d_1f468',
	'1f468_200d_2764_200d_1f468',
	'1f468_200d_2764_200d_1f48b_200d_1f468',
	'1f468_200d_2764_200d_1f48b_200d_1f468',
	'1f469_200d_2764_200d_1f469',
	'1f469_200d_2764_200d_1f469',
	'1f469_200d_2764_200d_1f48b_200d_1f469',
	'1f469_200d_2764_200d_1f48b_200d_1f469',
	'1f46e_200d_2640',
	'1f46e_200d_2640',
	'1f46f_200d_2640',
	'1f46f_200d_2640',
	'1f471_200d_2640',
	'1f471_200d_2640',
	'1f473_200d_2640',
	'1f473_200d_2640',
	'1f477_200d_2640',
	'1f477_200d_2640',
	'1f481_200d_2640',
	'1f481_200d_2640',
	'1f482_200d_2640',
	'1f482_200d_2640',
	'1f486_200d_2640',
	'1f486_200d_2640',
	'1f487_200d_2640',
	'1f487_200d_2640',
	'1f645_200d_2640',
	'1f645_200d_2640',
	'1f646_200d_2640',
	'1f646_200d_2640',
	'1f647_200d_2640',
	'1f647_200d_2640',
	'1f64b_200d_2640',
	'1f64b_200d_2640',
	'1f64d_200d_2640',
	'1f64d_200d_2640',
	'1f64e_200d_2640',
	'1f64e_200d_2640',
	'1f6a3_200d_2640',
	'1f6b4_200d_2640',
	'1f6b5_200d_2640',
	'1f6b6_200d_2640',
	'1f6b6_200d_2640'
]);

module.exports = function (url, callback) {
	const emojiStyle = config.get('emojiStyle');
	const codeEnd = url.lastIndexOf('.png');
	const emojiCode = url.substring(url.lastIndexOf('/') + 1, codeEnd);

	if (emojiStyle === 't' || url.includes('#replaced') || codeEnd === -1) {
		return callback({});
	}

	// Messenger 1.0 and Facebook 2.2 emoji sets support only emoji up to version 5.0.
	// Fall back to default style for emoji >= 10.0
	if (excludedEmoji.has(emojiCode)) {
		return callback({});
	}

	const newURL = url.replace(/(emoji\.php\/v9\/)(.)(.+\/)/, `$1${emojiStyle}$3`) + '#replaced';

	callback({redirectURL: newURL});
};
