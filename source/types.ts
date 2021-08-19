export interface INewDesign {
	isNewDesign: boolean;
}

export interface IToggleSounds extends INewDesign {
	checked: boolean;
}

export interface IToggleMuteNotifications extends INewDesign {
	defaultStatus: boolean;
}

export type TProxyArgs = [string, string | string[] | undefined];

export type TProxyOutArgs = [data: string | ArrayBufferLike | Blob | ArrayBufferView];
