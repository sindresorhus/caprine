const path = require('path');
const fs = require('fs');

class Translater {
  constructor() {
    this.locale = null
    this.gettext = {}
  }

  initLocale(locale) {
    this.locale = locale
    const filePath = path.join(__dirname, 'lang', this.locale + '.json')
    if (fs.existsSync(filePath)) {
      this.gettext = JSON.parse(fs.readFileSync(filePath))
    }
  }

  _(string) {
    return this.gettext[string] ? this.gettext[string][1] : string
  }
}

module.exports = new Translater()