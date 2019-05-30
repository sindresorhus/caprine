/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');

const APP_NAME = pkg.productName;
const ICNS_PATH = path.join(__dirname, 'media', 'IconMas.icns');

exports.default = context => {
	const target = context.targets[0].name;
	if (target === 'mas') {
		const {appOutDir} = context;
		const appIconPath = path.join(
			appOutDir,
			`${APP_NAME}.app`,
			'Contents',
			'Resources',
			`${APP_NAME}.icns`
		);
		fs.copyFileSync(ICNS_PATH, appIconPath);
	}
};
