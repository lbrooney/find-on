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
import { convertHitsToPostObjects, fetchHnHits } from "@/lib/hn";
import { DEFAULT_POPUP_OPTIONS, fieldMappings } from "@/lib/query";
import { findOnReddit } from "@/lib/reddit";
import {
	calcAge,
	getCurrentTabIndex,
	getCurrentTabUrl,
	getOptions,
	navigateTo,
	pluralize,
	unixToLocaleDate,
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

export default function Popup() {
	const [options, setOptions] = createStore<{ value: PopupOptions }>({
		value: DEFAULT_POPUP_OPTIONS,
	});

	const [mounted, setMounted] = createSignal(false);

	const [urlInput, setUrlInput] = createSignal<string>("");

	const [searchOptionsVisibility, setSearchOptionsVisibility] =
		createSignal(true);
	const [ytChoiceVisible, setYtChoiceVisible] = createSignal(false);
	const [ytVidIdDisplay, setYtVidIdDisplay] = createSignal("");

	const [statusMessage, setStatusMessage] = createSignal("");

	const [data, { refetch }] = createResource<ProcessedRedditPost[], boolean>(
		() => mounted(),
		async (_, { refetching }) => {
			const url = urlInput();
			const { urlToSearch, isYt } = processUrl(url, {
				ignoreQueryString: options.value.search.ignoreQs,
				handleYtSpecial: options.value.search.ytHandling,
			});

			const [reddit, hn] = await Promise.allSettled([
				findOnReddit(
					urlToSearch,
					!refetching,
					options.value.search.exactMatch && !isYt,
				),
				fetchHnHits(url, !refetching),
			]);
			const posts: ProcessedRedditPost[] = [];
			let statusMessage = "";
			if (reddit.status === "fulfilled") {
				posts.push(
					...reddit.value.posts.map((p) => ({
						title: p.data.title,
						url: p.data.url,
						score: p.data.score,
						num_comments: p.data.num_comments,
						permalink: p.data.permalink,
						created_utc: p.data.created_utc,
						subreddit: p.data.subreddit,
						author: p.data.author,
						age: calcAge(p.data.created_utc),
						localDate: unixToLocaleDate(p.data.created_utc),
					})),
				);
			} else {
				statusMessage = "Failed to fetch Reddit posts. ";
			}
			if (hn.status === "fulfilled") {
				posts.push(...convertHitsToPostObjects(hn.value));
			} else {
				statusMessage = "Failed to fetch Hacker News Posts.";
			}
			setStatusMessage(statusMessage);
			return posts;
		},
		{
			initialValue: [],
		},
	);

	const sortedResults = createMemo(() => {
		if (options.value.popup.results.orderBy === "subreddit") {
			// Sort alphabetically for subreddit
			return data().toSorted(
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
		return data().toSorted(comparator);
	});

	onMount(async () => {
		try {
			setOptions("value", await getOptions(DEFAULT_POPUP_OPTIONS));

			setUrlInput((await getCurrentTabUrl()) ?? "");

			setMounted(true);
		} catch (e) {
			console.error("Initialization error:", e);
			setStatusMessage("Error during initialization.");
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
			browser.tabs.create({ url: href, active: false });
			// Prevent default behavior to keep popup open
			return;
		} else if (options.popup.newTab) {
			if (options.popup.newtabInBg && options.popup.newtabInBgAdjacent) {
				const idx = await getCurrentTabIndex();
				browser.tabs.create({
					url: href,
					active: false,
					index: idx + 1,
				});
			} else {
				browser.tabs.create({
					url: href,
					active: !options.popup.newtabInBg,
				});
			}
		} else {
			navigateTo(href); // Navigate in current tab, closes popup
		}
	};

	return (
		<div class="min-h-screen bg-neutral-200 p-4 font-sans text-black antialiased dark:bg-neutral-800 dark:text-white">
			<div class="container mx-auto min-w-lg space-y-4">
				<div class="flex flex-col">
					<form class="space-y-4">
						<div class="flex flex-col">
							<div class="flex overflow-hidden rounded-md shadow-md">
								<input
									type="text"
									class="flex-1 bg-neutral-300 p-2 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:placeholder-neutral-400"
									placeholder="url to find..."
									value={urlInput()}
									onInput={(e) => setUrlInput(e.currentTarget.value)}
								/>
								<button
									type="button"
									class="cursor-pointer bg-blue-600 px-4 py-2 font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none disabled:cursor-progress disabled:bg-blue-400 dark:disabled:bg-blue-800"
									disabled={data.loading}
									onClick={() => {
										refetch();
										setStatusMessage("");
									}}
								>
									Search
								</button>
							</div>

							<Show when={ytChoiceVisible()}>
								<div class="mt-2 flex items-center">
									<label class="inline-flex cursor-pointer items-center text-neutral-700 dark:text-neutral-300">
										<input
											type="checkbox"
											checked={options.value.search.ytHandling}
											onChange={(e) =>
												setOptions(
													"value",
													"search",
													"ytHandling",
													e.currentTarget.checked,
												)
											}
											class="form-checkbox h-4 w-4 rounded border-neutral-500 bg-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-500 dark:bg-neutral-600"
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
								<div class="mt-2 flex items-center">
									<label class="inline-flex cursor-pointer items-center text-neutral-700 dark:text-neutral-300">
										<input
											type="checkbox"
											checked={options.value.search.exactMatch}
											onChange={(e) =>
												setOptions(
													"value",
													"search",
													"exactMatch",
													e.currentTarget.checked,
												)
											}
											class="form-checkbox h-4 w-4 rounded border-neutral-500 bg-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-500 dark:bg-neutral-600"
										/>
										<span class="ml-2">
											exact match
											<Show when={data().length !== 0}>
												<span class="ml-2 text-neutral-600 text-sm dark:text-neutral-400">
													| <i class="font-semibold">{data().length} matches</i>
												</span>
											</Show>
										</span>
									</label>
								</div>
								<div class="mt-2 flex items-center">
									<label class="inline-flex cursor-pointer items-center text-neutral-700 dark:text-neutral-300">
										<input
											type="checkbox"
											checked={options.value.search.ignoreQs}
											onChange={(e) =>
												setOptions(
													"value",
													"search",
													"ignoreQs",
													e.currentTarget.checked,
												)
											}
											class="form-checkbox h-4 w-4 rounded border-neutral-500 bg-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-500 dark:bg-neutral-600"
										/>
										<span class="ml-2">ignore querystring</span>
									</label>
								</div>
							</Show>
						</div>
					</form>
				</div>

				<div class="mt-4 text-center text-neutral-600 text-sm dark:text-neutral-400">
					{statusMessage()}
				</div>

				<Switch fallback={"No results found..."}>
					<Match when={data.loading}>Loading...</Match>
					<Match when={data.error}>Errored...</Match>
					<Match when={data.state === "ready" && data().length !== 0}>
						<div class="flex flex-col gap-4">
							<div class="flex items-center justify-between text-neutral-600 text-sm dark:text-neutral-400">
								<div class="flex items-center">
									<span class="font-semibold text-neutral-900 dark:text-neutral-300">
										{data().length} {pluralize("result", data().length || 0)}
									</span>
								</div>
								<div class="flex items-center space-x-2">
									<span class="text-neutral-600 dark:text-neutral-400">
										sort
									</span>
									<select
										class="sort-options rounded-md border border-neutral-400 bg-neutral-300 px-2 py-1 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
										value={options.value.popup.results.orderBy}
										onInput={(e) =>
											setOptions(
												"value",
												"popup",
												"results",
												"orderBy",
												e.currentTarget.value as OrderBy,
											)
										}
									>
										<option value="score">score</option>
										<option value="comments">comments</option>
										<option value="age">age</option>
										<option value="subreddit">subreddit</option>
									</select>
									<button
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
										aria-label={`Sort ${options.value.popup.results.desc ? "ascending" : "descending"}`}
										type="button"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											class="size-4 transition-all"
											classList={{
												"-rotate-180": options.value.popup.results.desc,
											}}
										>
											<title>Change Sort Direction</title>
											<path
												fill-rule="evenodd"
												d="M10 18a.75.75 0 01-.75-.75V4.66L7.3 6.95a.75.75 0 01-1.1-1.02l3.25-3.5a.75.75 0 011.1 0l3.25 3.5a.75.75 0 01-1.1 1.02L10.75 4.66v12.59c0 .41-.34.75-.75.75z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
								</div>
							</div>
							<div class="space-y-3">
								<For each={sortedResults()}>
									{(post) => (
										<Switch>
											<Match when={post.subreddit === HACKER_NEWS_SUBREDDIT}>
												<HackerNewsResult
													post={post as ProcessedHackerNewsPost}
													handleLinkClick={handleLinkClick}
												/>
											</Match>
											<Match when={post.subreddit !== HACKER_NEWS_SUBREDDIT}>
												<RedditResult
													post={post}
													handleLinkClick={handleLinkClick}
													redditURL={`https://${options.value.oldReddit ? "old." : ""}reddit.com`}
												/>
											</Match>
										</Switch>
									)}
								</For>
							</div>
						</div>
					</Match>
				</Switch>
			</div>
		</div>
	);
}
