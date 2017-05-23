const getLatestRelease = ext =>
  new Promise((resolve, reject) => {
    const xmlhttp = new XMLHttpRequest();
    const url = 'https://api.github.com/repos/sindresorhus/caprine/releases/latest';

    xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        const responseJSON = JSON.parse(this.responseText);
        const asset = responseJSON.assets.filter(asset => asset.name.includes(ext));
        resolve(asset[0].browser_download_url);
      }
    };

    xmlhttp.open('GET', url, true);
    xmlhttp.send();
  });

const addDownloadURLToButton = (caprineBody, downloadButton) => url => {
  const downloadButtonHref = document.createAttribute("href");
  downloadButtonHref.value = url;
  downloadButton.setAttributeNode(downloadButtonHref);
  caprineBody.appendChild(downloadButton);
}

const addDownloadButtonToDOM = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const caprineBody = document.getElementById('caprine-body');
  const downloadButton = document.createElement('a');
  const downloadButtonClass = document.createAttribute("class");
  const downloadText = document.createTextNode('Download');

  downloadButtonClass.value = "button is-info is-outlined is-large";
  downloadButton.setAttributeNode(downloadButtonClass);
  downloadButton.appendChild(downloadText);

  if (userAgent.match(/(mac|os x)/)) {
    getLatestRelease('dmg').then(addDownloadURLToButton(caprineBody, downloadButton));
  } else if (userAgent.match(/windows/)) {
    getLatestRelease('exe').then(addDownloadURLToButton(caprineBody, downloadButton));
  } else if (userAgent.match(/linux/)) {
    getLatestRelease('AppImage').then(addDownloadURLToButton(caprineBody, downloadButton));
  }
}

addDownloadButtonToDOM();