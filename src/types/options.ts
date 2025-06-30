export type BadgeContent = "num_posts" | "num_comments";

export interface AutorunOptions {
	retryExact: boolean;
	alwaysBothExactAndNonExact: boolean;
	updated: boolean;
	activated: boolean;
	retryError: boolean;
	badgeContent: BadgeContent;
}

export interface Sources {
	reddit: boolean;
	hackernews: boolean;
}

export interface SearchParamOptions {
	exactMatch: boolean;
	ignoreQs: boolean;
	sources: Sources;
	ytHandling: boolean;
}

interface FilterList {
	type: boolean;
	filters: string[];
}

export interface BackgroundOptions {
	autorun: AutorunOptions;
	search: SearchParamOptions;
	filterlist: FilterList;
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
