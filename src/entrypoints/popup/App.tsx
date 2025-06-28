import "@/assets/index.css";

import {
	createEffect,
	createMemo,
	createResource,
	createSignal,
	For,
	Match,
	onMount,
	Show,
	Switch,
} from "solid-js";
import { createStore } from "solid-js/store";
import { browser } from "wxt/browser";
import RedditIcon from "@/components/RedditIcon";
import YCIcon from "@/components/YCombinator";
import { convertHitsToPostObjects, fetchHnHits } from "@/lib/hn";
import { DEFAULT_POPUP_OPTIONS, fieldMappings } from "@/lib/query";
import { convertRedditToPostObjects, findOnReddit } from "@/lib/reddit";
import {
	BADGE_COLORS,
	getCurrentTab,
	getCurrentTabIndex,
	getOptions,
	navigateTo,
	numToBadgeText,
	pluralize,
	removeBadge,
	setBadge,
} from "@/lib/shared";
import { processUrl } from "@/lib/url";
import type { OrderBy, PopupOptions } from "@/types/options";
import {
	HACKER_NEWS_SUBREDDIT,
	type ProcessedHackerNewsPost,
	type ProcessedRedditPost,
} from "@/types/shared";
import HackerNewsResult from "./HackerNewsResult";
import RedditResult from "./RedditResult";

const optionsDisabled: PopupOptions = {
	...DEFAULT_POPUP_OPTIONS,
	search: {
		...DEFAULT_POPUP_OPTIONS.search,
		sources: {
			hackernews: false,
			reddit: false,
		},
	},
};

export default function Popup() {
	const [options, setOptions] = createStore<{ value: PopupOptions }>({
		value: optionsDisabled,
	});

	const [urlInput, setUrlInput] = createSignal<string>("");
	const [tabId, setTabId] = createSignal<number | undefined>(undefined);

	const [searchOptionsVisibility, setSearchOptionsVisibility] =
		createSignal(true);
	const [ytChoiceVisible, setYtChoiceVisible] = createSignal(false);
	const [ytVidIdDisplay, setYtVidIdDisplay] = createSignal("");

	const [redditPosts, { refetch: refetchReddit }] = createResource<
		ProcessedRedditPost[],
		boolean
	>(
		() => options.value.search.sources.reddit,
		async (_, { value, refetching }) => {
			if (!refetching && value?.length !== 0) {
				return value as ProcessedRedditPost[];
			}
			const url = urlInput();
			const { urlToSearch, isYt } = processUrl(url, {
				handleYtSpecial: options.value.search.ytHandling,
				ignoreQueryString: options.value.search.ignoreQs,
			});

			const reddit = await findOnReddit(
				urlToSearch,
				!refetching,
				options.value.search.exactMatch && !isYt,
			);
			return convertRedditToPostObjects(reddit.posts);
		},
		{
			initialValue: [],
		},
	);

	const [hnPosts, { refetch: refetchHN }] = createResource<
		ProcessedHackerNewsPost[],
		boolean
	>(
		() => options.value.search.sources.hackernews,
		async (_, { value, refetching }) => {
			if (!refetching && value?.length !== 0) {
				return value as ProcessedHackerNewsPost[];
			}
			const url = urlInput();

			const hn = await fetchHnHits(url, !refetching);
			return convertHitsToPostObjects(hn);
		},
		{
			initialValue: [],
		},
	);

	createMemo(() => {
		const tab = tabId();
		if (tab) {
			const posts = ([] as ProcessedRedditPost[])
				.concat(options.value.search.sources.reddit ? redditPosts.latest : [])
				.concat(options.value.search.sources.hackernews ? hnPosts.latest : []);

			if (options.value.autorun.badgeContent === "num_comments") {
				void setBadge(
					tab,
					numToBadgeText(posts.reduce((a, p) => a + p.num_comments, 0)),
					BADGE_COLORS.success,
				);
			} else {
				void setBadge(tab, numToBadgeText(posts.length), BADGE_COLORS.success);
			}
		}
	});

	const sortedResults = createMemo(() => {
		const posts = ([] as ProcessedRedditPost[])
			.concat(options.value.search.sources.reddit ? redditPosts.latest : [])
			.concat(options.value.search.sources.hackernews ? hnPosts.latest : []);
		if (options.value.popup.results.orderBy === "subreddit") {
			// Sort alphabetically for subreddit
			return posts.sort(
				(a, b) =>
					a.subreddit.localeCompare(b.subreddit) *
					(options.value.popup.results.desc ? -1 : 1),
			);
		}

		const field = fieldMappings[options.value.popup.results.orderBy];
		const comparator = (a: ProcessedRedditPost, b: ProcessedRedditPost) => {
			let valA: number | string = a[field];
			let valB: number | string = b[field];

			if (field === "created_utc") {
				valA = Number(valA);
				valB = Number(valB);
			}

			// Handle potential undefined or null values by treating them as 0 for numeric fields
			if (typeof valA === "number" && typeof valB === "number") {
				return (
					((valA || 0) - (valB || 0)) *
					(options.value.popup.results.desc ? -1 : 1)
				);
			}
			if (typeof valA === "string" && typeof valB === "string") {
				return (
					valA.localeCompare(valB) * (options.value.popup.results.desc ? -1 : 1)
				);
			}
			return 0; // Fallback if types are mixed or unexpected
		};
		return posts.sort(comparator);
	});

	onMount(async () => {
		try {
			const tab = await getCurrentTab();
			setUrlInput(tab.url ?? "");
			setTabId(tab.id);
			setOptions("value", await getOptions(DEFAULT_POPUP_OPTIONS));
		} catch (e) {
			console.error("Initialization error:", e);
		}
	});

	createEffect(() => {
		const { urlToSearch: videoId, isYt } = processUrl(urlInput(), {
			handleYtSpecial: true,
		});
		if (isYt) {
			setYtVidIdDisplay(videoId ?? "");
			setYtChoiceVisible(true);
			if (options.value.search.ytHandling) {
				setSearchOptionsVisibility(false);
			} else {
				setSearchOptionsVisibility(true);
			}
		} else {
			setYtChoiceVisible(false);
			setSearchOptionsVisibility(true);
		}
	});

	const handleLinkClick = async (e: MouseEvent, href: string) => {
		e.preventDefault();
		e.stopPropagation();

		const options = await getOptions(DEFAULT_POPUP_OPTIONS); // Fetch current options

		if (e.metaKey || e.shiftKey || e.altKey) {
			// Cmd/Shift/Alt + click: let browser handle it (new tab usually)
			window.open(href, "_blank");
			return;
		} else if (e.ctrlKey) {
			// Ctrl + click: Open in new background tab, keep popup open
			browser.tabs.create({ active: false, url: href });
			// Prevent default behavior to keep popup open
			return;
		} else if (options.popup.newTab) {
			if (options.popup.newtabInBg && options.popup.newtabInBgAdjacent) {
				const idx = await getCurrentTabIndex();
				browser.tabs.create({
					active: false,
					index: idx + 1,
					url: href,
				});
			} else {
				browser.tabs.create({
					active: !options.popup.newtabInBg,
					url: href,
				});
			}
		} else {
			navigateTo(href); // Navigate in current tab, closes popup
		}
	};

	return (
		<div class="min-h-screen bg-neutral-200 p-4 font-sans text-black antialiased dark:bg-neutral-800 dark:text-white">
			<div class="container mx-auto flex min-w-lg flex-col gap-y-2">
				<div class="flex flex-col gap-y-1">
					<form class="flex flex-col gap-y-1">
						<div class="flex flex-col gap-y-1">
							<div class="flex overflow-hidden rounded-md shadow-md">
								<input
									class="flex-1 bg-neutral-300 p-2 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:placeholder-neutral-400"
									onInput={(e) => setUrlInput(e.currentTarget.value)}
									placeholder="url to find..."
									type="text"
									value={urlInput()}
								/>
								<button
									class="cursor-pointer bg-blue-600 px-4 py-2 font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none disabled:cursor-progress disabled:bg-blue-400 dark:disabled:bg-blue-800"
									disabled={redditPosts.loading || hnPosts.loading}
									onClick={() => {
										const tab = tabId();
										if (tab) {
											void removeBadge(tab);
										}
										refetchReddit();
										refetchHN();
									}}
									type="button"
								>
									Search
								</button>
							</div>

							<Show when={ytChoiceVisible()}>
								<div class="flex items-center">
									<label class="inline-flex cursor-pointer items-center text-neutral-700 dark:text-neutral-300">
										<input
											checked={options.value.search.ytHandling}
											class="form-checkbox h-4 w-4 rounded border-neutral-500 bg-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-500 dark:bg-neutral-600"
											onChange={(e) =>
												setOptions(
													"value",
													"search",
													"ytHandling",
													e.currentTarget.checked,
												)
											}
											type="checkbox"
										/>
										<span class="ml-2">
											search by video ID{" "}
											<span class="font-bold text-neutral-900 dark:text-neutral-100">
												'{ytVidIdDisplay()}'
											</span>
										</span>
									</label>
								</div>
							</Show>

							<Show when={searchOptionsVisibility()}>
								<div class="flex items-center">
									<label class="inline-flex cursor-pointer items-center text-neutral-700 dark:text-neutral-300">
										<input
											checked={options.value.search.exactMatch}
											class="form-checkbox h-4 w-4 rounded border-neutral-500 bg-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-500 dark:bg-neutral-600"
											onChange={(e) =>
												setOptions(
													"value",
													"search",
													"exactMatch",
													e.currentTarget.checked,
												)
											}
											type="checkbox"
										/>
										<span class="ml-2">exact match</span>
									</label>
								</div>
								<div class="flex items-center">
									<label class="inline-flex cursor-pointer items-center text-neutral-700 dark:text-neutral-300">
										<input
											checked={options.value.search.ignoreQs}
											class="form-checkbox h-4 w-4 rounded border-neutral-500 bg-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-500 dark:bg-neutral-600"
											onChange={(e) =>
												setOptions(
													"value",
													"search",
													"ignoreQs",
													e.currentTarget.checked,
												)
											}
											type="checkbox"
										/>
										<span class="ml-2">ignore querystring</span>
									</label>
								</div>
							</Show>
						</div>
					</form>
					<Switch>
						<Match when={redditPosts.loading}>
							<div>Loading Reddit posts...</div>
						</Match>
						<Match when={redditPosts.error}>
							<div>Errored loading Reddit posts...</div>
						</Match>
					</Switch>
					<Switch>
						<Match when={hnPosts.loading}>
							<div>Loading Hacker News posts...</div>
						</Match>
						<Match when={hnPosts.error}>
							<div>Errored loading Hacker News posts...</div>
						</Match>
					</Switch>
				</div>
				<div class="flex flex-col gap-y-2">
					<div class="flex items-center justify-between text-neutral-600 text-sm dark:text-neutral-400">
						<div class="flex items-center gap-x-2">
							<select
								class="sort-options rounded-md border border-neutral-400 bg-neutral-300 px-2 py-1 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
								onInput={(e) => {
									setOptions(
										"value",
										"search",
										"sources",
										"hackernews",
										e.currentTarget.value === "all" ||
											e.currentTarget.value === "hackernews",
									);
									setOptions(
										"value",
										"search",
										"sources",
										"reddit",
										e.currentTarget.value === "all" ||
											e.currentTarget.value === "reddit",
									);
								}}
								value={
									options.value.search.sources.reddit &&
									options.value.search.sources.hackernews
										? "all"
										: options.value.search.sources.hackernews
											? "hackernews"
											: "reddit"
								}
							>
								<option value="all">All</option>
								<option value="reddit">Reddit</option>
								<option value="hackernews">Hacker News</option>
							</select>
							<span class="text-neutral-600 dark:text-neutral-400">
								sources
							</span>
						</div>
						<div class="flex items-center gap-x-2">
							<span class="text-neutral-600 dark:text-neutral-400">sort</span>
							<select
								class="sort-options rounded-md border border-neutral-400 bg-neutral-300 px-2 py-1 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
								onInput={(e) =>
									setOptions(
										"value",
										"popup",
										"results",
										"orderBy",
										e.currentTarget.value as OrderBy,
									)
								}
								value={options.value.popup.results.orderBy}
							>
								<option value="score">score</option>
								<option value="comments">comments</option>
								<option value="age">age</option>
								<option value="subreddit">subreddit</option>
							</select>
							<button
								aria-label={`Sort ${options.value.popup.results.desc ? "ascending" : "descending"}`}
								class="sort-order rounded-md border border-neutral-400 bg-neutral-300 px-2 py-1 text-neutral-900 transition-colors duration-200 hover:bg-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600"
								onClick={() =>
									setOptions(
										"value",
										"popup",
										"results",
										"desc",
										(desc) => !desc,
									)
								}
								type="button"
							>
								<svg
									class="size-4 transition-all"
									classList={{
										"-rotate-180": options.value.popup.results.desc,
									}}
									fill="currentColor"
									viewBox="0 0 20 20"
									xmlns="http://www.w3.org/2000/svg"
								>
									<title>Change Sort Direction</title>
									<path
										clip-rule="evenodd"
										d="M10 18a.75.75 0 01-.75-.75V4.66L7.3 6.95a.75.75 0 01-1.1-1.02l3.25-3.5a.75.75 0 011.1 0l3.25 3.5a.75.75 0 01-1.1 1.02L10.75 4.66v12.59c0 .41-.34.75-.75.75z"
										fill-rule="evenodd"
									/>
								</svg>
							</button>
						</div>
					</div>
					<Show when={sortedResults().length !== 0}>
						<div class="flex items-center gap-x-0.5">
							<span class="font-semibold text-neutral-900 dark:text-neutral-300">
								{sortedResults().length}{" "}
								{pluralize("result", sortedResults().length)}
							</span>
							<Show when={options.value.search.sources.reddit}>
								<span>|</span>
								<span class="flex items-center gap-x-1 font-semibold text-neutral-900 dark:text-neutral-300">
									{redditPosts.latest.length} <RedditIcon />
									{pluralize("thread", redditPosts.latest.length)}
								</span>
							</Show>
							<Show when={options.value.search.sources.hackernews}>
								<span>|</span>
								<span class="flex items-center gap-x-1 font-semibold text-neutral-900 dark:text-neutral-300">
									{hnPosts.latest.length} <YCIcon class="rounded-sm" />
									{pluralize("hit", hnPosts.latest.length)}
								</span>
							</Show>
						</div>
						<div class="flex flex-col gap-y-3">
							<For each={sortedResults()}>
								{(post) => (
									<Switch>
										<Match when={post.subreddit === HACKER_NEWS_SUBREDDIT}>
											<HackerNewsResult
												handleLinkClick={handleLinkClick}
												post={post as ProcessedHackerNewsPost}
											/>
										</Match>
										<Match when={post.subreddit !== HACKER_NEWS_SUBREDDIT}>
											<RedditResult
												handleLinkClick={handleLinkClick}
												post={post}
												redditURL={`https://${options.value.oldReddit ? "old." : ""}reddit.com`}
											/>
										</Match>
									</Switch>
								)}
							</For>
						</div>
					</Show>
				</div>
			</div>
		</div>
	);
}
