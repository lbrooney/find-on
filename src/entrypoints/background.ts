import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { getAllOptions } from "@/lib/options";
import { isSearchRequest, search } from "@/lib/search";
import { BADGE_COLORS, numToBadgeText, removeBadge, setBadge } from "@/lib/shared";
import { matchesFilter, parseHttpUrl, processUrl } from "@/lib/url";
import type { AllOptions } from "@/types/options";
import type { SearchRequest, SearchResponse, SearchResult, Source } from "@/types/shared";

export default defineBackground({
	persistent: false,
	main() {
		const searches = new Map<number, symbol>();
		let settings: Promise<AllOptions> | undefined;
		const getSettings = async () =>
			(settings ??= getAllOptions().catch((error: unknown) => {
				settings = undefined;
				throw error;
			}));

		browser.storage.onChanged.addListener((_changes, area) => {
			if (area === "sync") {
				settings = undefined;
				searches.clear();
			}
		});
		browser.permissions.onRemoved.addListener(() => searches.clear());
		browser.tabs.onRemoved.addListener((tabId) => searches.delete(tabId));

		// Register synchronously so a suspended service worker can answer the popup immediately.
		browser.runtime.onMessage.addListener((message: unknown, sender, respond) => {
			if (sender.id !== browser.runtime.id || !isSearchRequest(message)) {
				return false;
			}
			void getSettings()
				.then(async (options) => search(message, options))
				.then((result) => respond({ ok: true, result } satisfies SearchResponse))
				.catch((error: unknown) =>
					respond({
						ok: false,
						error: error instanceof Error ? error.message : "Search failed. Try again.",
					} satisfies SearchResponse),
				);
			return true;
		});

		async function autoSearch(tabId: number, input: string, token: symbol, options: AllOptions) {
			const url = parseHttpUrl(input);
			if (
				!url ||
				options.filterlist.type !==
					options.filterlist.filters.some((filter) => matchesFilter(url, filter))
			) {
				return;
			}
			const makeRequest = (source: Source, exact = options.search.exactMatch): SearchRequest => ({
				type: "search",
				source,
				url: url.href,
				exact,
				refresh: false,
				ignoreQs: options.search.ignoreQs,
				ytHandling: options.search.ytHandling,
			});
			const redditSearch = async (): Promise<SearchResult> => {
				if (!options.search.sources.reddit) {
					return { posts: [] };
				}
				const exact =
					options.search.exactMatch &&
					!processUrl(url.href, { handleYtSpecial: options.search.ytHandling }).isYt;
				const first = await search(makeRequest("reddit", exact), options, true);
				if (first.warning) {
					return first;
				}
				if (
					options.autorun.alwaysBothExactAndNonExact &&
					!processUrl(url.href, { handleYtSpecial: options.search.ytHandling }).isYt
				) {
					try {
						const other = await search(makeRequest("reddit", !exact), options, true);
						return {
							posts: [
								...new Map(
									[...first.posts, ...other.posts].map((post) => [post.id, post]),
								).values(),
							],
							warning: other.warning,
							via: first.via ?? other.via,
						};
					} catch (error) {
						return {
							...first,
							warning:
								error instanceof Error ? error.message : "Some Reddit threads could not be loaded.",
						};
					}
				}
				return exact && options.autorun.retryExact && !first.posts.length
					? search(makeRequest("reddit", false), options, true)
					: first;
			};
			const results = await Promise.allSettled([
				redditSearch(),
				options.search.sources.hackernews
					? search(makeRequest("hackernews"), options, true)
					: Promise.resolve<SearchResult>({ posts: [] }),
			]);
			if (searches.get(tabId) !== token) {
				return;
			}
			const tab = await browser.tabs.get(tabId);
			if (searches.get(tabId) !== token || parseHttpUrl(tab.url ?? "")?.href !== url.href) {
				return;
			}
			const posts = results.flatMap((result) =>
				result.status === "fulfilled" ? result.value.posts : [],
			);
			const errors = results.flatMap((result) => {
				if (result.status === "rejected") {
					return [result.reason instanceof Error ? result.reason.message : "Search failed."];
				}
				return result.value.warning ? [result.value.warning] : [];
			});
			const count =
				options.autorun.badgeContent === "num_comments"
					? posts.reduce((total, post) => total + post.num_comments, 0)
					: posts.length;
			const archived = results.some(
				(result) => result.status === "fulfilled" && result.value.via === "arctic-shift",
			);
			const title = errors.length
				? errors.join("\n")
				: `${count} ${options.autorun.badgeContent === "num_comments" ? "comments" : "discussions"} found`;
			await setBadge(
				tabId,
				errors.length && !posts.length ? "!" : numToBadgeText(count),
				errors.length ? BADGE_COLORS.error : BADGE_COLORS.success,
				archived ? `${title}\nReddit results provided by Arctic Shift's archive.` : title,
			);
		}

		async function run(tabId: number, trigger: "updated" | "activated", url?: string) {
			const token = Symbol();
			if (trigger === "updated") {
				searches.set(tabId, token);
			}
			try {
				if (trigger === "updated") {
					await removeBadge(tabId);
				}
				const [options, permitted] = await Promise.all([
					getSettings(),
					browser.permissions.contains({ permissions: ["tabs"] }),
				]);
				if (!permitted || !options.autorun[trigger]) {
					return;
				}
				if (trigger === "activated") {
					// An activation must not cancel an in-flight navigation lookup.
					if (searches.has(tabId)) {
						return;
					}
					searches.set(tabId, token);
				} else if (searches.get(tabId) !== token) {
					return;
				}
				const tab = url ? undefined : await browser.tabs.get(tabId);
				const input = url ?? tab?.url;
				if (input && searches.get(tabId) === token) {
					await autoSearch(tabId, input, token, options);
				}
			} catch {
				// Navigation or closing a tab can invalidate an automatic lookup.
			} finally {
				if (searches.get(tabId) === token) {
					searches.delete(tabId);
				}
			}
		}
		browser.tabs.onUpdated.addListener((tabId, change, tab) => {
			if (change.url || change.status === "loading") {
				void run(tabId, "updated", change.url ?? tab.url);
			}
		});
		browser.tabs.onActivated.addListener(({ tabId }) => {
			void run(tabId, "activated");
		});
	},
});
