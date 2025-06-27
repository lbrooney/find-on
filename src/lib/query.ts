import type {
	AllOptions,
	AutorunOptions,
	BackgroundOptions,
	OrderBy,
	PopupOptions,
	PopupUIOptions,
	SearchParamOptions,
} from "@/types/options";
import type { ProcessedRedditPost } from "@/types/shared";

export const fieldMappings: Record<OrderBy, keyof ProcessedRedditPost> = {
	age: "created_utc",
	comments: "num_comments",
	score: "score",
	subreddit: "subreddit",
};

/* false = new reddit, true = old reddit */
export const DEFAULT_REDDIT_FRONTEND = false;

export const DEFAULT_POPUP_UI_OPTIONS: PopupUIOptions = {
	newTab: true,
	newtabInBg: true,
	newtabInBgAdjacent: false,
	results: {
		desc: true,
		orderBy: "score",
	},
};

export const DEFAULT_SEARCH_PARAM_OPTIONS: SearchParamOptions = {
	exactMatch: true,
	ignoreQs: true,
	ytHandling: true,
};

export const DEFAULT_AUTORUN_OPTIONS: AutorunOptions = {
	activated: false,
	alwaysBothExactAndNonExact: false,
	badgeContent: "num_posts",
	retryError: true,
	retryExact: true,
	updated: false,
};

export const DEFAULT_POPUP_OPTIONS: PopupOptions = {
	autorun: DEFAULT_AUTORUN_OPTIONS,
	oldReddit: DEFAULT_REDDIT_FRONTEND,
	popup: DEFAULT_POPUP_UI_OPTIONS,
	search: DEFAULT_SEARCH_PARAM_OPTIONS,
};

export const DEFAULT_BG_OPTIONS: BackgroundOptions = {
	autorun: DEFAULT_AUTORUN_OPTIONS,
	blacklist: [],
	search: DEFAULT_SEARCH_PARAM_OPTIONS,
};

export const DEFAULT_CACHE_PERIOD_MINS = 30;
export const DEFAULT_OPTIONS: AllOptions = {
	autorun: DEFAULT_AUTORUN_OPTIONS,
	blacklist: DEFAULT_BG_OPTIONS.blacklist,
	cache: { period: DEFAULT_CACHE_PERIOD_MINS },
	oldReddit: DEFAULT_REDDIT_FRONTEND,
	popup: DEFAULT_POPUP_UI_OPTIONS,
	search: DEFAULT_SEARCH_PARAM_OPTIONS,
};
