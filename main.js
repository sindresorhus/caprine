const getLatestRelease = ext =>
  fetch('https://api.github.com/repos/sindresorhus/caprine/releases/latest')
    .then(res => res.json())
    .then(responseJSON => {
      const asset = responseJSON.assets.filter(asset => asset.name.includes(ext));
      return asset[0].browser_download_url;
    });

const addDownloadURLToButton = (caprineBody, downloadButton) => url => {
  downloadButton.href = url;
  caprineBody.appendChild(downloadButton);
}

const addDownloadButtonToDOM = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const caprineBody = document.getElementById('caprine-body');
  const downloadButton = document.getElementById('download-button');

  if (userAgent.match(/(mac|os x)/)) {
    getLatestRelease('dmg').then(addDownloadURLToButton(caprineBody, downloadButton));
  } else if (userAgent.match(/windows/)) {
    getLatestRelease('exe').then(addDownloadURLToButton(caprineBody, downloadButton));
  } else if (userAgent.match(/linux/)) {
    getLatestRelease('AppImage').then(addDownloadURLToButton(caprineBody, downloadButton));
  }
}

addDownloadButtonToDOM();