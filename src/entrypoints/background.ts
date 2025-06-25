import { type Browser, browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { fetchHnHits } from "@/lib/hn";
import { DEFAULT_BG_OPTIONS } from "@/lib/query";
import { findOnReddit } from "@/lib/reddit";
import { getOptions } from "@/lib/shared";
import { processUrl, removeQueryString } from "@/lib/url";
import type { HNHit } from "@/types/HN";
import type { BackgroundOptions } from "@/types/options";
import type { RedditListing } from "@/types/Reddit";

export default defineBackground(() => {
	const BADGE_COLORS = {
		error: "#DD1616",
		success: "#555555",
	};

	let bgOpts: BackgroundOptions;

	// The respective listeners will noop if these are false. This hack is needed
	// because we can no longer restart the background page in v3.
	let tabUpdatedListenerActive = false;
	let tabActivatedListenerActive = false;

	// Throttling mechanism to handle multiple firings of the tabs.onUpdated event
	// as the tab goes through different states while loading.
	const recentlyQueried = new Set<string>([]);

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
		_info: Browser.tabs.TabChangeInfo,
		tab: Browser.tabs.Tab,
	) {
		updateListenerFlags();
		const tabUrl = tab.url;
		if (!tabUrl) {
			return;
		}
		if (!tabUpdatedListenerActive) {
			return;
		}
		if (recentlyQueried.has(tabUrl)) {
			return;
		}
		recentlyQueried.add(tabUrl);
		setTimeout(() => recentlyQueried.delete(tabUrl), 1e3);
		await removeBadge(tabId);
		return autoSearch(tabId, tabUrl);
	}

	async function tabActivatedListener(activeInfo: Browser.tabs.TabActiveInfo) {
		updateListenerFlags();
		if (!tabActivatedListenerActive) {
			return;
		}
		const tabId = activeInfo.tabId;
		const tab = await browser.tabs.get(tabId);
		return autoSearch(tabId, tab.url);
	}

	async function autoSearch(tabId: number, url: string | undefined) {
		if (!url || !isAllowed(removeQueryString(url))) {
			return;
		}

		const { urlToSearch, isYt } = processUrl(url, {
			ignoreQueryString: bgOpts.search.ignoreQs,
			handleYtSpecial: bgOpts.search.ytHandling,
		});
		const exactMatch = bgOpts.search.exactMatch && !isYt;
		const [redditPosts, hnPosts] = await Promise.allSettled([
			fetchReddit(urlToSearch, { tabId, exactMatch, isYt }),
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
		return url.length > 0 && !(isChromeUrl(url) || isBlackListed(url));
	}

	function isBlackListed(url: string) {
		return bgOpts.blacklist.some((s) => url.search(s) > -1);
	}

	async function handleError(e: Error, tabId: number) {
		console.error(e);
		return setErrorBadge(tabId);
	}

	function isChromeUrl(url: string) {
		return /^chrome/.test(url);
	}

	async function setErrorBadge(tabId: number) {
		return setBadge(tabId, "X", BADGE_COLORS.error);
	}

	function numToBadgeText(n: number) {
		if (n < 1_000) {
			return `${n}`;
		} else if (n < 1_000_000) {
			return `${Math.trunc(n / 1_000)}K+`;
		} else if (n < 1_000_000_000) {
			return `${Math.trunc(n / 1_000_000)}M+`;
		}
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
		}
		if (bgOpts.autorun.badgeContent === "num_comments") {
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

	async function removeBadge(tabId: number) {
		return setBadge(tabId, "", BADGE_COLORS.success);
	}

	async function setBadge(tabId: number, text: string, color: string) {
		const badge: Browser.action.BadgeTextDetails = { text: text, tabId: tabId };
		const bgCol: Browser.action.BadgeColorDetails = {
			color: color,
			tabId: tabId,
		};
		// could just make the extension mv3 on firefox as well, but DX/hot reload is broken
		try {
			if (!browser.runtime.lastError) {
				(browser.action ?? browser.browserAction).setBadgeText(badge);
			}
			if (!browser.runtime.lastError) {
				(browser.action ?? browser.browserAction).setBadgeBackgroundColor(
					bgCol,
				);
			}
		} catch (args) {
			console.log(args);
		}
	}
});
