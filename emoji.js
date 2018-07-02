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
function addSearchEvent(bindElement) {
	const textInput = document.querySelector('._5rpu');
	if (!textInput) {
		return;
	}

	load();

	textInput.addEventListener('keyup', debounce(e => {
		if (e.keyCode === 27 || e.keyCode === 13 ||
			e.keyCode === 39 || e.keyCode === 37) {
			return;
		}

		const lastword = textInput.textContent.split(' ').pop();
		parse(lastword, bindElement);
	}, 400, false));

	document.addEventListener('keyup', e => {
		const picker = document.querySelector('.emoji-menu');
		if (picker !== undefined) {
			e.stopImmediatePropagation();
			e.stopPropagation();
			e.preventDefault();

			switch (e.keyCode) {
				// Escape key maps to keycode `27`
				case (27): {
					picker.remove();
					break;
				}
				// Enter key maps to keycode '13'
				case (13): {
					const lastword = textInput.textContent.split(' ').pop();
					const emoji = picker.querySelector('.active > .emoji').innerText;

					const text = document.querySelector('[data-text="true"]');

					text.innerHTML = text.innerHTML.replace(lastword, '<span>' + emoji + '</span>');

					picker.remove();
					break;
				}
				// Rigth arrow key maps to keycode '39'
				case (39): {
					const emojiSpanNext = picker.querySelector('.active');
					const nextEmoji = emojiSpanNext.nextSibling;

					if (nextEmoji !== undefined) {
						emojiSpanNext.className = '';
						nextEmoji.className = 'active';
					}
					break;
				}
				// Left arrow key maps to keycode '37'
				case (37): {
					const emojiSpanPrev = picker.querySelector('.active');
					const prevEmoji = emojiSpanPrev.previousSibling;

					if (prevEmoji !== undefined) {
						emojiSpanPrev.className = '';
						prevEmoji.className = 'active';
					}
					break;
				}
				default: {
					break;
				}
			}
		}
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

		buildMenu(icons, text, element);
	});
}

// Function to construct the emoji dropdown resultant from the search
function buildMenu(array, currentText, element) {
	let menu = null;
	menu = document.querySelector('.emoji-menu');

	if (menu === undefined) {
		menu = document.createElement('div');
		menu.className = 'emoji-menu';

		const header = document.createElement('div');
		header.className = 'emoji-info';
		menu.appendChild(header);

		element.appendChild(menu);
	} else {
		menu.querySelector('.emoji-icons').remove();
	}

	const iconList = document.createElement('div');
	iconList.className = 'emoji-icons';

	for (const opt of array) {
		const icon = document.createElement('div');
		if (iconList.innerHTML === '') {
			icon.className = 'active';
		}

		icon.innerHTML = `<span class="emoji">${opt[1].char}</span> :${opt[0]}:`;

		icon.addEventListener('click', function () {
			const text = document.querySelector('[data-text="true"]');
			const emojiChar = this.querySelector('.emoji').innerHTML;

			text.innerHTML = text.innerHTML.replace(currentText, emojiChar + ' ');

			menu.remove();
			return true;
		});

		iconList.appendChild(icon);
	}
	menu.appendChild(iconList);
}

exports.addSearchEvent = addSearchEvent;
