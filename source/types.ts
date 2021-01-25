export interface INewDesign {
	isNewDesign: boolean;
}

export interface IToggleSounds extends INewDesign {
	checked: boolean;
}

export interface IToggleMuteNotifications extends INewDesign {
	defaultStatus: boolean;
}
