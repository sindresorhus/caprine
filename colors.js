'use strict';
const {dialog} = require('electron');
const config = require('./config');
const {getWindow} = require('./util');

module.exports = {
	changeColor: (color) => {
		if (!checkRgb(color)) {
			return dialog.showMessageBox({
				detail: 'Invalid HEX code!',
				buttons: [
					'Close',
				],
				defaultId: 0,
			});
		}

		let name = getName(getWindow().getURL());
		config.set('colors.' + name, color);
		console.log('Selected color #' + color + ' for ' + name);
	},

	removeColor: () => {
		let name = getName(getWindow().getURL());
		config.delete('colors.' + name);
		console.log('Removed color for ' + name);
	},

	loadColors: (webContents, url) => {
		let name = getName(url);
		let color = config.get('colors.' + name);

		if (color === undefined) { // Colors is not set, need to manual insert messenger selected color.
			webContents.executeJavaScript('document.querySelectorAll(\'._30yy > div > svg\').item(0).getAttribute(\'style\')', (r) => { // Get original color from HTML tag, that is override only in CSS
				const rgb = r.split('(')[1].split(')')[0].split(', '); // Parse rgb(x, x, x) to array with values
				insertColors(webContents, rgbToHex(rgb[0], rgb[1], rgb[2]));
			});
			return;
		}

		insertColors(webContents, color); // Insert selected colors from config
	}
};

function insertColors(webContents, color) {
	webContents.insertCSS('._3058._ui9._hh7._s1-._52mr._43by._3oh- { background-color: #' + color + ' !important; }');
	webContents.insertCSS('._1i1j > svg > g > g > path { fill: #' + color + ' !important }');
	webContents.insertCSS('._5j_u._4rv9._30yy._39bl > svg > path { stroke: #' + color + ' !important; }');
	webContents.insertCSS('._30yy > div > svg, ._30yy > div > svg > path { stroke: #' + color + ' !important; }');
	webContents.insertCSS('._30yy > div > svg > g > polygon, ._30yy > div > svg > g > circle { fill: #' + color + ' !important; }');
	webContents.insertCSS('._30yy > div > svg > g > g > path { fill: #' + color + ' !important}');
	webContents.insertCSS('._2her._9ah { color: #' + color + ' !important }');
	webContents.insertCSS('._6b45 > svg > * { stroke: #' + color + ' !important }');
	webContents.insertCSS('._5odt > svg > * { fill: #' + color + ' !important }');
	webContents.insertCSS('._17vc > svg > * { stroke: #' + color + ' !important; fill: transparent !important}');
	webContents.insertCSS('._3szp > div > svg > path { stroke: #' + color + ' !important }');
	webContents.insertCSS('._3wh2 > svg > g > path { stroke: #' + color + ' !important }');
	webContents.insertCSS('._2a45._fy2 { color: #' + color + ' !important }');
	webContents.insertCSS('._3oh-._fy2._2wjv { color: #' + color + ' !important }');
	webContents.insertCSS('._30yy._38lh._39bl { color: #' + color + ' !important }');
	webContents.insertCSS('._ih- { color: #' + color + ' !important }');
	webContents.insertCSS('._4rpi > svg > path { stroke: #' + color + ' !important }');
	webContents.insertCSS('._4rv9._30yy._39bl { stroke: #' + color + ' !important }');
}

function getName(url) {
	return url.split('/t/')[1].replace(new RegExp('\\.', 'g'), '_');
}

function checkRgb(color) { // RGB code without '#'
	return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test('#' + color);
}

function rgbToHex (r,g,b) {
	const red = colorToHex(r);
	const green = colorToHex(g);
	const blue = colorToHex(b);
	return red+green+blue;
}

function colorToHex (rgb) {
	let hex = Number(rgb).toString(16);
	if (hex.length < 2) {
		hex = "0" + hex;
	}
	return hex;
}
