import type {
	AllOptions,
	AutorunOptions,
	BackgroundOptions,
	CacheOptions,
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
const DEFAULT_REDDIT_FRONTEND = false;

const DEFAULT_POPUP_UI_OPTIONS: PopupUIOptions = {
	newTab: true,
	newtabInBg: true,
	newtabInBgAdjacent: false,
	results: {
		desc: true,
		orderBy: "score",
	},
};

const DEFAULT_SEARCH_PARAM_OPTIONS: SearchParamOptions = {
	exactMatch: true,
	ignoreQs: true,
	ytHandling: true,
};

const DEFAULT_AUTORUN_OPTIONS: AutorunOptions = {
	activated: true,
	alwaysBothExactAndNonExact: false,
	badgeContent: "num_posts",
	retryError: true,
	retryExact: true,
	updated: true,
};

export const DEFAULT_POPUP_OPTIONS: PopupOptions = {
	autorun: DEFAULT_AUTORUN_OPTIONS,
	oldReddit: DEFAULT_REDDIT_FRONTEND,
	popup: DEFAULT_POPUP_UI_OPTIONS,
	search: DEFAULT_SEARCH_PARAM_OPTIONS,
};

export const DEFAULT_BACKGROUND_OPTIONS: BackgroundOptions = {
	autorun: DEFAULT_AUTORUN_OPTIONS,
	blacklist: [],
	search: DEFAULT_SEARCH_PARAM_OPTIONS,
};

const DEFAULT_CACHE_PERIOD_MINS = 30;

export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
	period: DEFAULT_CACHE_PERIOD_MINS,
};

export const DEFAULT_OPTIONS: AllOptions = {
	...DEFAULT_POPUP_OPTIONS,
	...DEFAULT_BACKGROUND_OPTIONS,
	cache: DEFAULT_CACHE_OPTIONS,
};
