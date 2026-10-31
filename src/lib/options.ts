import { browser } from "wxt/browser";

import type { AllOptions, BadgeContent, OrderBy, PopupOptions } from "@/types/options";

import { isRecord } from "./parse";

export const DEFAULT_OPTIONS: AllOptions = {
	oldReddit: false,
	popup: {
		newTab: true,
		newtabInBg: true,
		newtabInBgAdjacent: false,
		results: { desc: true, orderBy: "score" },
	},
	search: {
		exactMatch: true,
		ignoreQs: true,
		ytHandling: true,
		sources: { hackernews: true, reddit: true },
	},
	autorun: {
		activated: false,
		updated: false,
		alwaysBothExactAndNonExact: false,
		badgeContent: "num_posts",
		retryError: true,
		retryExact: true,
	},
	filterlist: { filters: [], type: false },
	cache: { period: 30 },
};
export const DEFAULT_POPUP_OPTIONS: PopupOptions = {
	autorun: DEFAULT_OPTIONS.autorun,
	oldReddit: DEFAULT_OPTIONS.oldReddit,
	popup: DEFAULT_OPTIONS.popup,
	search: DEFAULT_OPTIONS.search,
};

export function orderBy(value: unknown): OrderBy {
	return value === "comments" || value === "age" || value === "subreddit" ? value : "score";
}
export function badgeContent(value: unknown): BadgeContent {
	return value === "num_comments" ? value : "num_posts";
}
function record(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}
function boolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

export async function getAllOptions(): Promise<AllOptions> {
	const stored = await browser.storage.sync.get<Record<string, unknown>>();
	const popup = record(stored.popup);
	const results = record(popup.results);
	const search = record(stored.search);
	const sources = record(search.sources);
	const autorun = record(stored.autorun);
	const filterlist = record(stored.filterlist);
	const { period } = record(stored.cache);
	const reddit = boolean(sources.reddit, true);
	return {
		oldReddit: boolean(stored.oldReddit, DEFAULT_OPTIONS.oldReddit),
		popup: {
			newTab: boolean(popup.newTab, true),
			newtabInBg: boolean(popup.newtabInBg, true),
			newtabInBgAdjacent: boolean(popup.newtabInBgAdjacent, false),
			results: { orderBy: orderBy(results.orderBy), desc: boolean(results.desc, true) },
		},
		search: {
			exactMatch: boolean(search.exactMatch, true),
			ignoreQs: boolean(search.ignoreQs, true),
			ytHandling: boolean(search.ytHandling, true),
			sources: { reddit, hackernews: !reddit || boolean(sources.hackernews, true) },
		},
		autorun: {
			activated: boolean(autorun.activated, false),
			updated: boolean(autorun.updated, false),
			alwaysBothExactAndNonExact: boolean(autorun.alwaysBothExactAndNonExact, false),
			badgeContent: badgeContent(autorun.badgeContent),
			retryError: boolean(autorun.retryError, true),
			retryExact: boolean(autorun.retryExact, true),
		},
		filterlist: {
			type: boolean(filterlist.type, false),
			filters: Array.isArray(filterlist.filters)
				? filterlist.filters.filter(
						(value): value is string => typeof value === "string" && Boolean(value.trim()),
					)
				: [],
		},
		cache: {
			period:
				typeof period === "number" && Number.isFinite(period)
					? Math.min(1440, Math.max(0, period))
					: 30,
		},
	};
}
export async function getPopupOptions(): Promise<PopupOptions> {
	const { autorun, oldReddit, popup, search } = await getAllOptions();
	return { autorun, oldReddit, popup, search };
}
export async function updateOptions(data: AllOptions): Promise<void> {
	await browser.storage.sync.set(data);
}
