import * as path from 'path';
import {fixPathForAsarUnpack} from 'electron-util';

export const caprineIconPath = fixPathForAsarUnpack(path.join(__dirname, '..', 'static', 'Icon.png'));
