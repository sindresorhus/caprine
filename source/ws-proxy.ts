type TProtocols = string | string[] | undefined;
type TOutArgs = [data: string | ArrayBufferLike | Blob | ArrayBufferView];

interface IArgs {
	url: string;
	protocols?: TProtocols;
}

const WebSocketProxy = new Proxy(window.WebSocket, {
	construct(Target, args) {
		const {url, protocols} = (args as unknown) as IArgs;
		const instance = new Target(url, protocols);

		instance.send = new Proxy(instance.send, {
			apply(Target, thisArg, args) {
				const data = new Uint8Array(args[0]);
				console.log(Buffer.from(data).toString());
				return Target.apply(thisArg, args as TOutArgs);
			}
		});

		return instance;
	}
});

window.WebSocket = WebSocketProxy;
