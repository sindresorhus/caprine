import {contextBridge} from 'electron';
import {ipcRenderer as ipc} from 'electron-better-ipc';

contextBridge.exposeInMainWorld('configApi', {
	async get(key: string) {
		return ipc.invoke('config:get', key);
	},
	set(key: string, value: string) {
		ipc.send('config:set', key, value);
	},
});
