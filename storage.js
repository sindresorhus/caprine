'use strict';
const app = require('app');
const fs = require('fs');
const path = require('path');
const dataFilePath = path.join(app.getPath('userData'), 'data.json');

function readData() {
	try {
		return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
	} catch (ex) {
		return {};
	}
}

exports.set = function (key, value) {
	const data = readData();
	data[key] = value;
	fs.writeFileSync(dataFilePath, JSON.stringify(data));
};

exports.get = function (key) {
	return readData()[key];
};

