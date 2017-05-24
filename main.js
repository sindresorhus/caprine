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
			return asset[0].browser_download_url;
		});

const updateButtonUrl = () => {
	getLatestRelease(getExtension()).then(url => {
		document.getElementById('download-button').href = url;
	});
}

updateButtonUrl();
