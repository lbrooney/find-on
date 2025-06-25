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
	score: "score",
	comments: "num_comments",
	age: "created_utc",
	subreddit: "subreddit",
};

/* false = new reddit, true = old reddit */
export const DEFAULT_REDDIT_FRONTEND = false;

export const DEFAULT_POPUP_UI_OPTIONS: PopupUIOptions = {
	newTab: true,
	newtabInBg: true,
	newtabInBgAdjacent: false,
	results: {
		orderBy: "score",
		desc: true,
	},
};

export const DEFAULT_SEARCH_PARAM_OPTIONS: SearchParamOptions = {
	exactMatch: true,
	ignoreQs: true,
	ytHandling: true,
};

export const DEFAULT_POPUP_OPTIONS: PopupOptions = {
	popup: DEFAULT_POPUP_UI_OPTIONS,
	search: DEFAULT_SEARCH_PARAM_OPTIONS,
	oldReddit: DEFAULT_REDDIT_FRONTEND,
};

export const DEFAULT_AUTORUN_OPTIONS: AutorunOptions = {
	retryExact: true,
	alwaysBothExactAndNonExact: false,
	updated: true,
	activated: true,
	retryError: true,
	badgeContent: "num_posts",
};

export const DEFAULT_BG_OPTIONS: BackgroundOptions = {
	autorun: DEFAULT_AUTORUN_OPTIONS,
	search: DEFAULT_SEARCH_PARAM_OPTIONS,
	blacklist: [],
};

export const DEFAULT_CACHE_PERIOD_MINS = 30;
export const DEFAULT_OPTIONS: AllOptions = {
	oldReddit: DEFAULT_REDDIT_FRONTEND,
	autorun: DEFAULT_AUTORUN_OPTIONS,
	blacklist: DEFAULT_BG_OPTIONS.blacklist,
	cache: { period: DEFAULT_CACHE_PERIOD_MINS },
	popup: DEFAULT_POPUP_UI_OPTIONS,
	search: DEFAULT_SEARCH_PARAM_OPTIONS,
};
