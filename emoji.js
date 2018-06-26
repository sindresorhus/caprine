// Emoji datasource
const emoji = require('emojilib');
// Regex expression chosen to identify the string as emoji label
const regexExpression = /(:[\w\-+]+)/g;
// Emoji array
let emojis = null;

// Function to load all the emojis from the data source
function load() {
	if (emojis) {
		return emojis;
	}

	const result = emoji.lib;
	emojis = Object.keys(result).map(key => {
		return [key, result[key]];
	});
}

// Function to retrieve all the emojis that match with the search string
function getChars(emojiId) {
	const emojiMap = emojis;

	if (emojiMap === null) {
		return null;
	}

	return emojis.filter(k => {
		return k[0].indexOf(emojiId) === 0;
	});
}

// Function to check if search string is part of an emoji label
function exist(emojiId) {
	const emojiMap = emojis;

	if (emojiMap === null) {
		return false;
	}

	return emojiMap.some(k => {
		return k[0].indexOf(emojiId) !== -1;
	});
}

// Function responsible for parsing the text
// from the message into the emoji label and search the emoji datasource
function parse(text, element) {
	if (text === undefined || text === '') {
		return;
	}

	text.replace(regexExpression, match => {
		const name = match.replace(/:/g, '');

		if (!exist(name)) {
			return match;
		}

		const icons = getChars(name);

		const list = buildDropdown(icons, text);
		element.appendChild(list);
	});
}

// Function to construct the emoji dropdown resultant from the search
function buildDropdown(array, currentText) {
	const list = document.createElement('ul');
	list.className = 'textcomplete-dropdown';
	list.id = 'emoji-options';

	for (let i = 0; i < array.length; i++) {
		const opt = array[i];

		const li = document.createElement('li');
		li.innerHTML = `<li class="textcomplete-item">${opt[0]} <span class="emoji">${opt[1].char}</span></li>`;

		li.addEventListener('click', function () {
			const text = document.querySelectorAll('[data-text="true"]')[0];
			const emojiChar = this.getElementsByClassName('emoji')[0].innerHTML;
			text.innerHTML = text.innerHTML.replace(currentText, emojiChar);

			document.getElementById('emoji-options').remove();
			return true;
		});

		list.appendChild(li);
	}

	return list;
}

exports.load = load;
exports.parse = parse;
