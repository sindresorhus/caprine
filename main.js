const getExtension = () => {
	const userAgent = navigator.userAgent.toLowerCase();

	if (userAgent.match(/(mac|os x)/)) {
		return 'dmg'
	} else if (userAgent.match(/windows/)) {
		return 'exe';
	} else if (userAgent.match(/linux/)) {
		return 'AppImage';
	}
};

const getLatestRelease = ext =>
	fetch('https://api.github.com/repos/sindresorhus/caprine/releases/latest')
		.then(res => res.json())
		.then(json => {
			const asset = json.assets.filter(asset => asset.name.includes(ext));
			return {
				url: asset[0].browser_download_url,
				version: json.tag_name
			};
		});

const updateButtonUrl = () => {
	getLatestRelease(getExtension()).then(({url, version}) => {
		document.getElementById('download-button').href = url;
		document.getElementById('version-text').textContent = version;
	});
}

updateButtonUrl();
