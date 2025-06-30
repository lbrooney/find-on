import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { fetchHnHits } from "@/lib/hn";
import { DEFAULT_BACKGROUND_OPTIONS } from "@/lib/query";
import { findOnReddit } from "@/lib/reddit";
import {
	BADGE_COLORS,
	getOptions,
	numToBadgeText,
	removeBadge,
	setBadge,
	updateOptions,
} from "@/lib/shared";
import { processUrl, removeQueryString } from "@/lib/url";
import type { HNHit } from "@/types/HN";
import type { BackgroundOptions } from "@/types/options";
import type { RedditListing } from "@/types/Reddit";

export default defineBackground(() => {
	let options: BackgroundOptions;

	async function updateListenerFlags() {
		options = await getOptions(DEFAULT_BACKGROUND_OPTIONS);
		if (!(await browser.permissions.contains({ permissions: ["tabs"] }))) {
			options.autorun.activated = false;
			options.autorun.updated = false;
			await updateOptions(options);
		}
	}

	const BG_RETRY_INTERVAL = 5e3;
	const MAX_RETRIES = 5;

	async function setErrorBadge(tabId: number) {
		return setBadge(tabId, "X", BADGE_COLORS.error);
	}

	async function handleError(e: Error, tabId: number) {
		console.error(e);
		return setErrorBadge(tabId);
	}

	async function searchExact(tabId: number, url: string) {
		for (let i = 0; i < MAX_RETRIES; i++) {
			try {
				return (await findOnReddit(url, true, true)).posts;
			} catch (e) {
				if (options.autorun.retryError) {
					await new Promise((resolve) =>
						setTimeout(resolve, BG_RETRY_INTERVAL),
					);
				} else {
					void handleError(e as Error, tabId);
					return [];
				}
			}
		}
		return [];
	}

	async function searchNonExact(tabId: number, url: string) {
		for (let i = 0; i < MAX_RETRIES; i++) {
			try {
				return (await findOnReddit(url, true, false)).posts;
			} catch (e) {
				if (options.autorun.retryError) {
					await new Promise((resolve) =>
						setTimeout(resolve, BG_RETRY_INTERVAL),
					);
				} else {
					void handleError(e as Error, tabId);
					return [];
				}
			}
		}
		return [];
	}

	async function fetchReddit(
		urlToSearch: string,
		{
			isYt,
			exactMatch,
			tabId,
		}: { isYt: boolean; exactMatch: boolean; tabId: number },
	) {
		if (exactMatch) {
			let posts = await searchExact(tabId, urlToSearch);
			if (options.autorun.retryExact && posts.length === 0) {
				posts = await searchNonExact(tabId, urlToSearch);
			} else if (options.autorun.alwaysBothExactAndNonExact) {
				// don't return, just save to cache
				void searchNonExact(tabId, urlToSearch);
			}
			return posts;
		} else {
			const posts = await searchNonExact(tabId, urlToSearch);
			if (options.autorun.alwaysBothExactAndNonExact && !isYt) {
				// don't return, just save to cache
				void searchExact(tabId, urlToSearch);
			}
			return posts;
		}
	}

	async function fetchHN(url: string, tabId: number) {
		for (let i = 0; i < MAX_RETRIES; i++) {
			try {
				return await fetchHnHits(url, true);
			} catch (e) {
				if (options.autorun.retryError) {
					await new Promise((resolve) =>
						setTimeout(resolve, BG_RETRY_INTERVAL),
					);
				} else {
					void handleError(e as Error, tabId);
					return [];
				}
			}
		}
		return [];
	}

	function isFiltered(url: string) {
		return options.filterlist.filters.some((s) => url.search(s) > -1);
	}

	function isAllowed(url: string) {
		url = url.toLowerCase();
		// if whitelist and filtered allowed
		// if blacklist and not filtered allow
		return (
			url.length > 0 &&
			/^https?:\/\//i.test(url) &&
			options.filterlist.type === isFiltered(url)
		);
	}

	async function setResultsBadge(
		tabId: number,
		redditPosts: RedditListing[] = [],
		hnPosts: HNHit[] = [],
	) {
		const color = BADGE_COLORS.success;
		const totalPosts = redditPosts.length + hnPosts.length;
		if (totalPosts === 0) {
			return setBadge(tabId, "0", color);
		} else if (options.autorun.badgeContent === "num_comments") {
			const numCommentsReddit = redditPosts.reduce(
				(a, p) => a + p.data.num_comments,
				0,
			);
			const numCommentsHn = hnPosts.reduce((a, p) => a + p.num_comments, 0);
			const totalComments = numCommentsReddit + numCommentsHn;
			return setBadge(tabId, `${numToBadgeText(totalComments)}`, color);
		} else {
			return setBadge(tabId, `${numToBadgeText(totalPosts)}`, color);
		}
	}

	async function autoSearch(tabId: number, url: string) {
		if (!isAllowed(removeQueryString(url))) {
			return;
		}

		const { urlToSearch, isYt } = processUrl(url, {
			handleYtSpecial: options.search.ytHandling,
			ignoreQueryString: options.search.ignoreQs,
		});
		const exactMatch = options.search.exactMatch && !isYt;
		const [redditPosts, hnPosts] = await Promise.allSettled([
			options.search.sources.reddit
				? fetchReddit(urlToSearch, { exactMatch, isYt, tabId })
				: [],
			options.search.sources.hackernews ? fetchHN(url, tabId) : [],
		]);
		if (redditPosts.status === "fulfilled" && hnPosts.status === "fulfilled") {
			return setResultsBadge(tabId, redditPosts.value, hnPosts.value);
		} else if (redditPosts.status === "fulfilled") {
			return setResultsBadge(tabId, redditPosts.value, []);
		} else if (hnPosts.status === "fulfilled") {
			return setResultsBadge(tabId, [], hnPosts.value);
		}
	}

	browser.tabs.onUpdated.addListener(async (tabId, { status }, tab) => {
		await updateListenerFlags();
		const tabUrl = tab.url;
		// check on status which runs on url change and page reload
		if (!options.autorun.updated || !tabUrl || status !== "loading") {
			return;
		}
		await removeBadge(tabId);
		return autoSearch(tabId, tabUrl);
	});

	browser.tabs.onActivated.addListener(async ({ tabId }) => {
		await updateListenerFlags();
		const tabUrl = (await browser.tabs.get(tabId))?.url;
		if (!options.autorun.activated || !tabUrl) {
			return;
		}
		return autoSearch(tabId, tabUrl);
	});
});
