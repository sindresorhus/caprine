/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
'use strict';
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');

const APP_NAME = pkg.productName;
const ICON_PATH = path.join(__dirname, 'build', 'IconMas.icns');

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

		fs.copyFileSync(ICON_PATH, appIconPath);
	}
};
