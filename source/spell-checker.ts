import {session, MenuItemConstructorOptions} from 'electron';
import config from './config';

const languageToCode = new Map<string, string>([
	// All languages available in Electron's spellchecker
	['af', 'Afrikaans'],
	['bg', 'Bulgarian'],
	['ca', 'Catalan'],
	['cs', 'Czech'],
	['cy', 'Welsh'],
	['da', 'Danish '],
	['de', 'German'],
	['el', 'Greek'],
	['en', 'English'],
	['en-AU', 'English (Australia)'],
	['en-CA', 'English (Canada)'],
	['en-GB', 'English (United Kingdom)'],
	['en-US', 'English (United States)'],
	['es', 'Spanish'],
	['es-ES', 'Spanish'],
	['es-419', 'Spanish (Central and South America)'],
	['es-AR', 'Spanish (Argentina)'],
	['es-MX', 'Spanish (Mexico)'],
	['es-US', 'Spanish (United States)'],
	['et', 'Estonian'],
	['fa', 'Persian'],
	['fo', 'Faroese'],
	['fr', 'French'],
	['he', 'Hebrew'],
	['hi', 'Hindi'],
	['hr', 'Croatian'],
	['hu', 'Hungarian'],
	['hy', 'Armenian'],
	['id', 'Indonesian'],
	['it', 'Italian'],
	['ko', 'Korean'],
	['lt', 'Lithuanian'],
	['lv', 'Latvian'],
	['nb', 'Norwegian'],
	['nl', 'Dutch'],
	['pl', 'Polish'],
	['pt', 'Portuguese'],
	['pt-BR', 'Portuguese (Brazil)'],
	['pt-PT', 'Portuguese'],
	['ro', 'Moldovan'],
	['ru', 'Russian'],
	['sh', 'Serbo-Croatian'],
	['sk', 'Slovak'],
	['sl', 'Slovenian'],
	['sq', 'Albanian'],
	['sr', 'Serbian'],
	['sv', 'Swedish'],
	['ta', 'Tamil'],
	['tg', 'Tajik'],
	['tr', 'Turkish'],
	['uk', 'Ukrainian'],
	['vi', 'Vietnamese']
]);

function getSpellCheckerLanguages(): MenuItemConstructorOptions[] {
	const availableLanguages = session.defaultSession.availableSpellCheckerLanguages;
	const languageItem = new Array(availableLanguages.length);
	let languagesChecked = config.get('spellCheckerLanguages');

	for (const language of languagesChecked) {
		if (!availableLanguages.includes(language)) {
			// Remove it since it's not in the spell checker dictionary.
			languagesChecked = languagesChecked.filter(currentLang => currentLang !== language);
			config.set('spellCheckerLanguages', languagesChecked);
		}
	}

	for (const language of availableLanguages) {
		languageItem.push(
			{
				label: languageToCode.get(language) ?? languageToCode.get(language.split('-')[0]) ?? language,
				type: 'checkbox',
				checked: languagesChecked.includes(language),
				click() {
					const index = languagesChecked.indexOf(language);
					if (index > -1) {
						// Remove language
						languagesChecked.splice(index, 1);
						config.set('spellCheckerLanguages', languagesChecked);
					} else {
						// Add language
						languagesChecked = languagesChecked.concat(language);
						config.set('spellCheckerLanguages', languagesChecked);
					}

					session.defaultSession.setSpellCheckerLanguages(languagesChecked);
				}
			}
		);
	}

	if (languageItem.length === 1) {
		return [
			{
				label: 'System Default',
				type: 'checkbox',
				checked: true,
				enabled: false
			}
		];
	}

	return languageItem;
}

export default getSpellCheckerLanguages;
