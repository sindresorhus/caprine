const emoji = require('emojilib');
const debounce = require('lodash.debounce');
// Regex expression chosen to identify the string as emoji label
const regexExpression = /(:[\w\-+]+)/g;
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

// Function to add parse event to the text editor
function addSearchEvent(textInput) {
	if (!textInput) {
		return;
	}

	load();

	textInput.addEventListener('keyup', debounce(() => {
		const lastword = textInput.textContent.split(' ').pop();
		parse(lastword, textInput);
	}, 400, false));
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
	const menu = document.createElement('div');
	menu.className = 'emoji-menu';

	const header = document.createElement('div');
	header.className = 'emoji-info';
	menu.appendChild(header);

	const iconList = document.createElement('div');
	iconList.className = 'emoji-icons';

	for (const opt of array) {
		const icon = document.createElement('div');
		if (iconList.innerHTML === '') {
			icon.className = 'active';
		}

		icon.innerHTML = `<span class="emoji">${opt[1].char}</span> :${opt[0]}:`;
		// Li.innerHTML = `<li class="emoji-icon"></li>`;
		// Check if is first
		icon.addEventListener('click', function () {
			const text = document.querySelector('[data-text="true"]');
			const emojiChar = this.querySelector('.emoji').innerHTML;

			text.innerHTML = text.innerHTML.replace(currentText, '<span>' + emojiChar + '</span>');

			menu.remove();
			return true;
		});

		iconList.appendChild(icon);
	}
	menu.appendChild(iconList);
	return menu;
}

exports.addSearchEvent = addSearchEvent;
