import { contextBridge } from 'electron'
import {ipcRenderer as ipc} from 'electron-better-ipc';

contextBridge.exposeInMainWorld('configApi', {
	get: async (key: string) => await ipc.invoke('config:get', key),
	set: (key: string, value: any) => ipc.send('config:set', key, value)
})
