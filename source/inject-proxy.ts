import * as path from 'path';
import {readFileSync} from 'fs';

const s = document.createElement('script');
s.innerHTML = readFileSync(path.join(__dirname, 'ws-proxy.js'), 'utf8').toString();
document.documentElement.querySelector('body')?.append(s);
