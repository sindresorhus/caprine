'use strict';
const app = require('app');
const fs = require('fs');
const path = require('path');
const dataFilePath = path.join(app.getPath('userData'), 'data.json');

function readData() {
	if (!fs.existsSync(dataFilePath)) {
		return {};
	}

	return JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
}

exports.set = function (key, value) {
	const data = readData();
	data[key] = value;
	fs.writeFileSync(dataFilePath, JSON.stringify(data));
};

exports.get = function (key) {
	const data = readData();
	let value = null;
	if (key in data) {
		value = data[key];
	}
	return value;
};

