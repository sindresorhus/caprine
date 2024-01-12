import elementReady from 'element-ready';

(async () => {
	const startCallButton = (await elementReady('._3quh._30yy._2t_', {
		stopOnDomReady: false,
	}))!;

	startCallButton.click();
})();
