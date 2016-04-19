'use strict';
const fs = require('fs');
const path = require('path');
const electron = require('electron');
const dataFilePath = path.join(electron.app.getPath('userData'), 'data.json');

function readData() {
	try {
		return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
	} catch (err) {
		return {};
	}
}

exports.set = (key, val) => {
	const data = readData();
	data[key] = val;
	fs.writeFileSync(dataFilePath, JSON.stringify(data));
};

exports.get = key => readData()[key];

