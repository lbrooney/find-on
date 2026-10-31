import "@/assets/index.css";
import {
	batch,
	createEffect,
	createMemo,
	createResource,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import { browser } from "wxt/browser";

import Settings from "@/components/SettingsIcon";
import { requestSearch } from "@/lib/messages";
import { DEFAULT_POPUP_OPTIONS, getPopupOptions, orderBy } from "@/lib/options";
import {
	BADGE_COLORS,
	displayPosts,
	getCurrentTab,
	numToBadgeText,
	pluralize,
	setBadge,
} from "@/lib/shared";
import { parseHttpUrl, processUrl } from "@/lib/url";
import type { SearchResult, Source } from "@/types/shared";

import Result from "./Result";

interface SourceView extends SearchResult {
	error?: string;
}
const EMPTY: SourceView = { posts: [] };
const control =
	"rounded-md border border-neutral-400 bg-neutral-100 px-2 py-1 dark:border-neutral-600 dark:bg-neutral-700";

export default function Popup() {
	const [options, setOptions] = createStore(structuredClone(DEFAULT_POPUP_OPTIONS));
	const [ready, setReady] = createSignal(false);
	const [input, setInput] = createSignal("");
	const [query, setQuery] = createSignal("");
	const [revision, setRevision] = createSignal(0);
	const [message, setMessage] = createSignal("");
	const [tabId, setTabId] = createSignal<number>();
	const [tabUrl, setTabUrl] = createSignal("");
	const video = createMemo(() => processUrl(query(), { handleYtSpecial: true }));

	function createSource(source: Source) {
		let previousRevision = 0;
		const [result] = createResource(
			() =>
				ready() &&
				options.search.sources[source] &&
				parseHttpUrl(query()) && {
					url: query(),
					exact: source === "reddit" && options.search.exactMatch,
					ignoreQs: options.search.ignoreQs,
					ytHandling: options.search.ytHandling,
					revision: revision(),
				},
			async (params): Promise<SourceView> => {
				const refresh = params.revision !== previousRevision;
				previousRevision = params.revision;
				try {
					return await requestSearch({
						type: "search",
						source,
						url: params.url,
						exact: params.exact,
						ignoreQs: params.ignoreQs,
						ytHandling: params.ytHandling,
						refresh,
					});
				} catch (error) {
					return {
						posts: [],
						error: error instanceof Error ? error.message : "Search failed. Try again.",
					};
				}
			},
			{ initialValue: EMPTY },
		);
		return result;
	}
	const reddit = createSource("reddit");
	const hackernews = createSource("hackernews");
	const loading = () =>
		(options.search.sources.reddit && reddit.loading) ||
		(options.search.sources.hackernews && hackernews.loading);
	const problems = createMemo(() =>
		[
			...(options.search.sources.reddit && !reddit.loading
				? [reddit().error, reddit().warning]
				: []),
			...(options.search.sources.hackernews && !hackernews.loading
				? [hackernews().error, hackernews().warning]
				: []),
		].filter((value): value is string => Boolean(value)),
	);
	const results = createMemo(() => {
		const posts = [
			...(options.search.sources.reddit && !reddit.loading ? reddit().posts : []),
			...(options.search.sources.hackernews && !hackernews.loading ? hackernews().posts : []),
		];
		const direction = options.popup.results.desc ? -1 : 1;
		const order = options.popup.results.orderBy;
		posts.sort((a, b) => {
			if (order === "subreddit") {
				return a.subreddit.localeCompare(b.subreddit) * direction;
			}
			const fields = { age: "created_utc", comments: "num_comments", score: "score" } as const;
			const field = fields[order];
			return (a[field] - b[field]) * direction;
		});
		return displayPosts(posts);
	});
	const source = () => {
		if (!options.search.sources.reddit) {
			return "hackernews";
		}
		return options.search.sources.hackernews ? "all" : "reddit";
	};

	onMount(() => {
		void Promise.all([getCurrentTab(), getPopupOptions()])
			.then(([tab, saved]) => {
				batch(() => {
					setOptions(saved);
					setInput(tab.url ?? "");
					setQuery(tab.url ?? "");
					setTabUrl(tab.url ?? "");
					setTabId(tab.id);
					setReady(true);
					if (!parseHttpUrl(tab.url ?? "")) {
						setMessage("Enter an HTTP or HTTPS page URL to find discussions.");
					}
				});
			})
			.catch((error: unknown) =>
				setMessage(error instanceof Error ? error.message : "Could not load the current tab."),
			);
	});

	let badgeRevision = 0;
	onCleanup(() => {
		badgeRevision += 1;
	});
	createEffect(() => {
		const currentRevision = ++badgeRevision;
		const id = tabId();
		if (
			!ready() ||
			loading() ||
			id === undefined ||
			!parseHttpUrl(query()) ||
			parseHttpUrl(query())?.href !== parseHttpUrl(tabUrl())?.href
		) {
			return;
		}
		const posts = results();
		const errors = problems();
		const count =
			options.autorun.badgeContent === "num_comments"
				? posts.reduce((sum, post) => sum + post.num_comments, 0)
				: posts.length;
		const expectedUrl = parseHttpUrl(query())?.href;
		const archived = options.search.sources.reddit && reddit().via === "arctic-shift";
		const title = errors.length
			? errors.join("\n")
			: `${count} ${options.autorun.badgeContent === "num_comments" ? "comments" : "discussions"} found`;
		void browser.tabs
			.get(id)
			.then(async (tab) => {
				if (
					badgeRevision !== currentRevision ||
					parseHttpUrl(tab.url ?? "")?.href !== expectedUrl
				) {
					return;
				}
				await setBadge(
					id,
					errors.length && !posts.length ? "!" : numToBadgeText(count),
					errors.length ? BADGE_COLORS.error : BADGE_COLORS.success,
					archived ? `${title}\nReddit results provided by Arctic Shift's archive.` : title,
				);
			})
			.catch(() => undefined);
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const url = parseHttpUrl(input().trim());
		if (!url) {
			setMessage("Enter a valid HTTP or HTTPS URL without a username or password.");
			return;
		}
		batch(() => {
			setMessage("");
			setQuery(url.href);
			setReady(true);
			setRevision((value) => value + 1);
		});
	}

	function handleLinkClick(event: MouseEvent, href: string) {
		if (event.shiftKey || event.altKey || event.button !== 0) {
			return;
		}
		event.preventDefault();
		const open = async () => {
			const tab = await getCurrentTab();
			const modified = event.ctrlKey || event.metaKey;
			if (modified || options.popup.newTab) {
				const active = !modified && !options.popup.newtabInBg;
				await browser.tabs.create({
					url: href,
					active,
					...(!active && options.popup.newtabInBgAdjacent ? { index: tab.index + 1 } : {}),
				});
				if (active) {
					window.close();
				}
			} else if (tab.id !== undefined) {
				await browser.tabs.update(tab.id, { url: href });
				window.close();
			}
		};
		void open().catch(() => setMessage("Could not open that link. Please try again."));
	}

	return (
		<main class="flex w-[580px] max-w-full flex-col gap-3 bg-neutral-200 p-4 text-black dark:bg-neutral-800 dark:text-white">
			<form class="flex flex-col gap-2" onSubmit={submit}>
				<div class="flex gap-2">
					<input
						aria-label="Page URL"
						class={`${control} min-w-0 flex-1 p-2`}
						onInput={(event) => setInput(event.currentTarget.value)}
						placeholder="https://example.com/article"
						type="text"
						value={input()}
					/>
					<button
						class="cursor-pointer rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
						disabled={loading()}
						type="submit"
					>
						Search
					</button>
					<button
						aria-label="Open settings"
						class="cursor-pointer rounded-md p-2 hover:bg-neutral-300 dark:hover:bg-neutral-700"
						onClick={() => {
							void browser.runtime
								.openOptionsPage()
								.catch(() => setMessage("Could not open settings."));
						}}
						type="button"
					>
						<Settings height="1.5em" width="1.5em" />
					</button>
				</div>
				<Show when={video().isYt}>
					<label class="flex items-center gap-2">
						<input
							checked={options.search.ytHandling}
							onChange={(event) => setOptions("search", "ytHandling", event.currentTarget.checked)}
							type="checkbox"
						/>
						Search by YouTube video ID <code>{video().urlToSearch}</code>
					</label>
				</Show>
				<Show when={!video().isYt || !options.search.ytHandling}>
					<div class="flex gap-4">
						<label class="flex items-center gap-2">
							<input
								checked={options.search.exactMatch}
								onChange={(event) =>
									setOptions("search", "exactMatch", event.currentTarget.checked)
								}
								type="checkbox"
							/>
							Exact match (Reddit)
						</label>
						<label class="flex items-center gap-2">
							<input
								checked={options.search.ignoreQs}
								onChange={(event) => setOptions("search", "ignoreQs", event.currentTarget.checked)}
								type="checkbox"
							/>
							Ignore query string
						</label>
					</div>
				</Show>
			</form>
			<Show when={message()}>
				<p role="alert">{message()}</p>
			</Show>
			<div class="flex items-center justify-between gap-2">
				<label class="flex items-center gap-2">
					Sources
					<select
						class={control}
						onChange={(event) => {
							const { value } = event.currentTarget;
							setOptions("search", "sources", {
								reddit: value !== "hackernews",
								hackernews: value !== "reddit",
							});
						}}
						value={source()}
					>
						<option value="all">All</option>
						<option value="reddit">Reddit</option>
						<option value="hackernews">Hacker News</option>
					</select>
				</label>
				<div class="flex items-center gap-2">
					<label class="flex items-center gap-2">
						Sort
						<select
							class={control}
							onChange={(event) =>
								setOptions("popup", "results", "orderBy", orderBy(event.currentTarget.value))
							}
							value={options.popup.results.orderBy}
						>
							<option value="score">Score</option>
							<option value="comments">Comments</option>
							<option value="age">Age</option>
							<option value="subreddit">Community</option>
						</select>
					</label>
					<button
						aria-label={`Sort ${options.popup.results.desc ? "ascending" : "descending"}`}
						class={`${control} cursor-pointer`}
						onClick={() => setOptions("popup", "results", "desc", (desc) => !desc)}
						type="button"
					>
						{options.popup.results.desc ? "↓" : "↑"}
					</button>
				</div>
			</div>
			<div aria-live="polite" class="flex flex-col gap-2">
				<Show when={options.search.sources.reddit && reddit.loading}>
					<output>Loading Reddit discussions…</output>
				</Show>
				<Show when={options.search.sources.hackernews && hackernews.loading}>
					<output>Loading Hacker News discussions…</output>
				</Show>
				<For each={problems()}>
					{(problem) => (
						<p
							class="rounded-md bg-amber-100 p-2 text-amber-950 dark:bg-amber-950 dark:text-amber-100"
							role="alert"
						>
							{problem}
						</p>
					)}
				</For>
				<Show
					when={options.search.sources.reddit && !reddit.loading && reddit().via === "arctic-shift"}
				>
					<p class="rounded-md bg-blue-100 p-2 text-blue-950 dark:bg-blue-950 dark:text-blue-100">
						Archived Reddit results via{" "}
						<a
							href="https://arctic-shift.photon-reddit.com/"
							class="underline"
							rel="noopener noreferrer"
							target="_blank"
						>
							Arctic Shift
						</a>
						. Coverage, scores and comment counts may be incomplete or outdated. Sign in to Reddit
						and press Search to retry live results.
					</p>
				</Show>
				<Show
					when={
						options.search.sources.reddit &&
						!reddit.loading &&
						(reddit().error || reddit().warning || reddit().via === "arctic-shift")
					}
				>
					<a
						class="text-blue-700 underline dark:text-blue-300"
						href="https://old.reddit.com/"
						onClick={(event) => handleLinkClick(event, "https://old.reddit.com/")}
						rel="noopener noreferrer"
						target="_blank"
					>
						Open Reddit
					</a>
				</Show>
				<Show when={results().length > 0}>
					<p class="font-semibold">
						{results().length} {pluralize("discussion", results().length)}
					</p>
				</Show>
				<Show
					when={
						ready() &&
						parseHttpUrl(query()) &&
						!loading() &&
						!problems().length &&
						!results().length
					}
				>
					<p>No discussions found for this URL.</p>
				</Show>
			</div>
			<div class="flex flex-col gap-3">
				<For each={results()}>
					{(post) => (
						<Result post={post} oldReddit={options.oldReddit} handleLinkClick={handleLinkClick} />
					)}
				</For>
			</div>
		</main>
	);
}
