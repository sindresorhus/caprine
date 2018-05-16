const path = require('path');
const fs = require('fs');

const po2json = require('po2json');

fs.readdir(path.join(__dirname, '../', 'po'), (err, files) => {
	files.forEach(file => {
		const fileFullPath = path.join(__dirname, '../', 'po', file);
		const d = path.parse(fileFullPath);
		if (d.ext === '.po') {
			d.ext = '.json';
			d.base = d.name + d.ext;
			d.dir = path.resolve(d.dir + '/../lang');
			const jsonFilePath = path.format(d);
			po2json.parseFile(fileFullPath, {stringify: true}, (err, jsonData) => {
				if (err) {
					throw err;
				}

				fs.writeFile(jsonFilePath, jsonData, 'utf8', () => {});
			});
		}
	});
});
