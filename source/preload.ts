import { contextBridge } from 'electron'
import config from './config';

contextBridge.exposeInMainWorld('config', {
	get: (key: string) => config.get(key),
	set: (key: string, value: any) => config.set(key, value)
})
