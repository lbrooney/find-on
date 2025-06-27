export type BadgeContent = "num_posts" | "num_comments";

export interface AutorunOptions {
	retryExact: boolean;
	alwaysBothExactAndNonExact: boolean;
	updated: boolean;
	activated: boolean;
	retryError: boolean;
	badgeContent: BadgeContent;
}

export interface SearchParamOptions {
	exactMatch: boolean;
	ignoreQs: boolean;
	ytHandling: boolean;
}

export interface BackgroundOptions {
	autorun: AutorunOptions;
	search: SearchParamOptions;
	blacklist: string[];
}

export type OrderBy = "age" | "comments" | "score" | "subreddit";

export interface PopupUIOptions {
	newTab: boolean;
	newtabInBg: boolean;
	newtabInBgAdjacent: boolean;
	results: {
		orderBy: OrderBy;
		desc: boolean;
	};
}

export interface PopupOptions {
	autorun: AutorunOptions;
	popup: PopupUIOptions;
	search: SearchParamOptions;
	oldReddit: boolean;
}

export interface CacheOptions {
	period: number;
}

export interface AllOptions extends BackgroundOptions, PopupOptions {
	cache: CacheOptions;
}
