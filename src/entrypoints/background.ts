import { type Browser, browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { fetchHnHits } from "@/lib/hn";
import { DEFAULT_BG_OPTIONS } from "@/lib/query";
import { findOnReddit } from "@/lib/reddit";
import {
	BADGE_COLORS,
	getOptions,
	numToBadgeText,
	removeBadge,
	setBadge,
} from "@/lib/shared";
import { processUrl, removeQueryString } from "@/lib/url";
import type { HNHit } from "@/types/HN";
import type { BackgroundOptions } from "@/types/options";
import type { RedditListing } from "@/types/Reddit";

export default defineBackground(() => {
	let bgOpts: BackgroundOptions;

	// The respective listeners will noop if these are false. This hack is needed
	// because we can no longer restart the background page in v3.
	let tabUpdatedListenerActive = false;
	let tabActivatedListenerActive = false;

	browser.tabs.onUpdated.addListener(tabUpdatedListener);
	browser.tabs.onActivated.addListener(tabActivatedListener);
	updateListenerFlags();

	async function updateListenerFlags() {
		bgOpts = await getOptions(DEFAULT_BG_OPTIONS);
		tabUpdatedListenerActive = bgOpts.autorun.updated;
		tabActivatedListenerActive = bgOpts.autorun.activated;
	}

	async function tabUpdatedListener(
		tabId: number,
		{ url: tabUrl }: Browser.tabs.TabChangeInfo,
	) {
		updateListenerFlags();
		if (!tabUpdatedListenerActive) {
			return;
		}
		if (!(tabUpdatedListenerActive && tabUrl)) {
			return;
		}
		await removeBadge(tabId);
		return autoSearch(tabId, tabUrl);
	}

	async function tabActivatedListener({ tabId }: Browser.tabs.TabActiveInfo) {
		updateListenerFlags();
		if (!tabActivatedListenerActive) {
			return;
		}
		const tab = await browser.tabs.get(tabId);
		return autoSearch(tabId, tab.url);
	}

	async function autoSearch(tabId: number, url: string | undefined) {
		if (!url || !isAllowed(removeQueryString(url))) {
			return;
		}

		const { urlToSearch, isYt } = processUrl(url, {
			handleYtSpecial: bgOpts.search.ytHandling,
			ignoreQueryString: bgOpts.search.ignoreQs,
		});
		const exactMatch = bgOpts.search.exactMatch && !isYt;
		const [redditPosts, hnPosts] = await Promise.allSettled([
			fetchReddit(urlToSearch, { exactMatch, isYt, tabId }),
			fetchHN(url, tabId),
		]);
		if (redditPosts.status === "fulfilled" && hnPosts.status === "fulfilled") {
			return setResultsBadge(tabId, redditPosts.value, hnPosts.value);
		} else if (redditPosts.status === "fulfilled") {
			return setResultsBadge(tabId, redditPosts.value, []);
		} else if (hnPosts.status === "fulfilled") {
			return setResultsBadge(tabId, [], hnPosts.value);
		}
	}

	const BG_RETRY_INTERVAL = 5e3;
	const MAX_RETRIES = 5;

	async function fetchHN(url: string, tabId: number) {
		for (let i = 0; i < MAX_RETRIES; i++) {
			try {
				return await fetchHnHits(url, true);
			} catch (e) {
				if (bgOpts.autorun.retryError) {
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

	async function searchExact(tabId: number, url: string) {
		for (let i = 0; i < MAX_RETRIES; i++) {
			try {
				return (await findOnReddit(url, true, true)).posts;
			} catch (e) {
				if (bgOpts.autorun.retryError) {
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
				if (bgOpts.autorun.retryError) {
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
			if (bgOpts.autorun.retryExact && posts.length === 0) {
				posts = await searchNonExact(tabId, urlToSearch);
			} else if (bgOpts.autorun.alwaysBothExactAndNonExact) {
				// don't return, just save to cache
				void searchNonExact(tabId, urlToSearch);
			}
			return posts;
		} else {
			const posts = await searchNonExact(tabId, urlToSearch);
			if (bgOpts.autorun.alwaysBothExactAndNonExact && !isYt) {
				// don't return, just save to cache
				void searchExact(tabId, urlToSearch);
			}
			return posts;
		}
	}

	function isAllowed(url: string) {
		url = url.toLowerCase();
		return url.length > 0 && /^https?:\/\//i.test(url) && !isBlackListed(url);
	}

	function isBlackListed(url: string) {
		return bgOpts.blacklist.some((s) => url.search(s) > -1);
	}

	async function handleError(e: Error, tabId: number) {
		console.error(e);
		return setErrorBadge(tabId);
	}

	async function setErrorBadge(tabId: number) {
		return setBadge(tabId, "X", BADGE_COLORS.error);
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
		} else if (bgOpts.autorun.badgeContent === "num_comments") {
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
});
