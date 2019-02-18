import {app, dialog} from 'electron';
import isOnline from 'is-online';
import pWaitFor from 'p-wait-for';

function showRetryDialog(message: string): void {
	dialog.showMessageBox(
		{
			message,
			detail: 'Do you want to wait?',
			buttons: ['Wait', 'Quit'],
			defaultId: 0,
			cancelId: 1
		},
		response => {
			if (response === 1) {
				app.quit();
			}
		}
	);
}

export const ensureOnline = async (): Promise<void> => {
	if (!(await isOnline())) {
		const connectivityTimeout = setTimeout(() => {
			showRetryDialog('You appear to be offline. Caprine requires a working internet connection.');
		}, 15000);

		await pWaitFor(isOnline, {interval: 1000});
		clearTimeout(connectivityTimeout);
	}
};
