import "@/assets/index.css";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { JSX } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { browser } from "wxt/browser";

import {
	badgeContent,
	DEFAULT_OPTIONS,
	getAllOptions,
	orderBy,
	updateOptions,
} from "@/lib/options";
import { parseHttpUrl } from "@/lib/url";

const inputClass =
	"rounded-md border border-neutral-400 bg-white px-3 py-1.5 dark:border-neutral-600 dark:bg-neutral-700";
interface CheckboxProps {
	checked: boolean;
	disabled?: boolean;
	children: JSX.Element;
	note?: string;
	onChange: (checked: boolean) => void;
}
function Checkbox(props: CheckboxProps) {
	return (
		<label class="flex cursor-pointer items-start gap-2">
			<input
				checked={props.checked}
				class="mt-1 size-4 shrink-0 accent-blue-600 disabled:cursor-not-allowed"
				disabled={props.disabled}
				onChange={(event) => props.onChange(event.currentTarget.checked)}
				type="checkbox"
			/>
			<span>
				{props.children}
				<Show when={props.note}>
					<span class="mt-0.5 block text-xs text-neutral-600 dark:text-neutral-400">
						{props.note}
					</span>
				</Show>
			</span>
		</label>
	);
}
function Section(props: { title: string; children: JSX.Element }) {
	return (
		<fieldset class="flex flex-col gap-3 border-t border-neutral-300 pt-4 dark:border-neutral-700">
			<legend class="px-1 text-xl font-semibold">{props.title}</legend>
			{props.children}
		</fieldset>
	);
}

function normalizeFilter(value: string): string | undefined {
	const text = value.trim();
	if (!text) {
		return undefined;
	}
	const url = parseHttpUrl(/^https?:\/\//i.test(text) ? text : `https://${text}`);
	if (!url || url.search || /\s/.test(text)) {
		return undefined;
	}
	return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
}

export default function Options() {
	const [options, setOptions] = createStore(structuredClone(DEFAULT_OPTIONS));
	const [original, setOriginal] = createSignal(structuredClone(DEFAULT_OPTIONS));
	const [ready, setReady] = createSignal(false);
	const [saving, setSaving] = createSignal(false);
	const [permissionPending, setPermissionPending] = createSignal(false);
	const [status, setStatus] = createSignal("");
	const [failed, setFailed] = createSignal(false);
	const [newFilter, setNewFilter] = createSignal("");
	const changed = createMemo(() => JSON.stringify(options) !== JSON.stringify(original()));
	let notificationTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(notificationTimer));

	function notify(message: string, error = false) {
		clearTimeout(notificationTimer);
		setStatus(message);
		setFailed(error);
		if (!error) {
			notificationTimer = setTimeout(() => setStatus(""), 3000);
		}
	}
	onMount(() => {
		void Promise.all([getAllOptions(), browser.permissions.contains({ permissions: ["tabs"] })])
			.then(([saved, permitted]) => {
				if (!permitted) {
					saved.autorun.updated = false;
					saved.autorun.activated = false;
				}
				setOptions(saved);
				setOriginal(structuredClone(unwrap(options)));
				setReady(true);
			})
			.catch(() => notify("Could not load settings. Reload this page to try again.", true));
	});

	function toggleAutorun(key: "activated" | "updated", checked: boolean) {
		if (!checked) {
			setOptions("autorun", key, false);
			return;
		}
		setPermissionPending(true);
		void browser.permissions
			.request({ permissions: ["tabs"] })
			.then((granted) => {
				setOptions("autorun", key, granted);
				if (!granted) {
					notify(
						"Automatic search needs permission to read tab URLs. You can still search from the popup.",
						true,
					);
				}
			})
			.catch(() => notify("Could not request tab permission. Please try again.", true))
			.finally(() => setPermissionPending(false));
	}

	function addFilter(): boolean {
		if (!newFilter().trim()) {
			return true;
		}
		const value = normalizeFilter(newFilter());
		if (!value) {
			notify("Enter a domain or a domain with a path, such as example.com/news.", true);
			return false;
		}
		setOptions("filterlist", "filters", (filters) => [...new Set([...filters, value])]);
		setNewFilter("");
		return true;
	}
	async function save() {
		if (!addFilter()) {
			return;
		}
		if (
			!Number.isFinite(options.cache.period) ||
			options.cache.period < 0 ||
			options.cache.period > 1440
		) {
			notify("Cache duration must be between 0 and 1440 minutes.", true);
			return;
		}
		setSaving(true);
		try {
			const snapshot = structuredClone(unwrap(options));
			await updateOptions(snapshot);
			setOriginal(snapshot);
			notify("Settings saved.");
		} catch {
			notify("Could not save settings. Please try again.", true);
		} finally {
			setSaving(false);
		}
	}

	return (
		<main class="mx-auto flex max-w-3xl flex-col gap-5 px-5 py-8">
			<h1 class="text-3xl font-semibold">Find On settings</h1>
			<p>Find Reddit and Hacker News discussions of the pages you visit.</p>
			<Show when={ready()} fallback={<output>Loading settings…</output>}>
				<form
					class="flex flex-col gap-6"
					onSubmit={(event) => {
						event.preventDefault();
						void save();
					}}
				>
					<Section title="Sources">
						<Checkbox
							checked={options.search.sources.reddit}
							disabled={!options.search.sources.hackernews}
							onChange={(checked) => setOptions("search", "sources", "reddit", checked)}
						>
							Search Reddit by default
						</Checkbox>
						<Checkbox
							checked={options.search.sources.hackernews}
							disabled={!options.search.sources.reddit}
							onChange={(checked) => setOptions("search", "sources", "hackernews", checked)}
						>
							Search Hacker News by default
						</Checkbox>
						<p class="text-sm text-neutral-700 dark:text-neutral-300">
							Reddit searches use your signed-in session when available. If Reddit requests sign-in
							or verification, Arctic Shift searches its archive without an account. Archive
							coverage and counts may lag Reddit.{" "}
							<a
								class="text-blue-700 underline dark:text-blue-300"
								href="https://old.reddit.com/"
								rel="noopener noreferrer"
								target="_blank"
							>
								Sign in to Reddit
							</a>{" "}
							in this browser profile for live results. Hacker News requires no account.
						</p>
						<Checkbox
							checked={options.oldReddit}
							onChange={(checked) => setOptions("oldReddit", checked)}
						>
							Open Reddit discussion links on old.reddit.com
						</Checkbox>
					</Section>
					<Section title="Popup">
						<div class="flex flex-wrap items-center gap-3">
							<label class="flex items-center gap-2">
								Sort results by
								<select
									class={inputClass}
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
							<Checkbox
								checked={options.popup.results.desc}
								onChange={(checked) => setOptions("popup", "results", "desc", checked)}
							>
								Descending
							</Checkbox>
						</div>
						<Checkbox
							checked={options.popup.newTab}
							onChange={(checked) => setOptions("popup", "newTab", checked)}
						>
							Open links in a new tab
						</Checkbox>
						<Checkbox
							checked={options.popup.newtabInBg}
							disabled={!options.popup.newTab}
							onChange={(checked) => setOptions("popup", "newtabInBg", checked)}
							note="Keeps the popup open so you can open multiple discussions."
						>
							Open new tabs in the background
						</Checkbox>
						<Checkbox
							checked={options.popup.newtabInBgAdjacent}
							disabled={!options.popup.newTab || !options.popup.newtabInBg}
							onChange={(checked) => setOptions("popup", "newtabInBgAdjacent", checked)}
						>
							Place background tabs next to the current tab
						</Checkbox>
					</Section>
					<Section title="Search defaults">
						<Checkbox
							checked={options.search.exactMatch}
							onChange={(checked) => setOptions("search", "exactMatch", checked)}
							note="Reddit looks up the exact URL. Hacker News uses URL search."
						>
							Exact match on Reddit
						</Checkbox>
						<Checkbox
							checked={options.search.ignoreQs}
							onChange={(checked) => setOptions("search", "ignoreQs", checked)}
							note="Keep this off when query parameters identify a particular page."
						>
							Ignore the query string
						</Checkbox>
						<Checkbox
							checked={options.search.ytHandling}
							onChange={(checked) => setOptions("search", "ytHandling", checked)}
							note="Matches watch, short, embedded and live links to the same video on both sources."
						>
							Search YouTube links by video ID
						</Checkbox>
					</Section>
					<Section title="Automatic search">
						<p class="text-sm text-neutral-700 dark:text-neutral-300">
							When enabled, eligible page URLs are sent to your selected sources as you browse.
							Enabling it requests permission to read tab URLs. Save your changes below.
						</p>
						<Checkbox
							checked={options.autorun.updated}
							disabled={permissionPending()}
							onChange={(checked) => toggleAutorun("updated", checked)}
						>
							Search when a tab loads, reloads or changes its URL
						</Checkbox>
						<Checkbox
							checked={options.autorun.activated}
							disabled={permissionPending()}
							onChange={(checked) => toggleAutorun("activated", checked)}
						>
							Search when switching to a tab
						</Checkbox>
						<Checkbox
							checked={options.autorun.retryExact}
							onChange={(checked) => setOptions("autorun", "retryExact", checked)}
						>
							Try a non-exact Reddit search when the exact search finds nothing
						</Checkbox>
						<Checkbox
							checked={options.autorun.alwaysBothExactAndNonExact}
							onChange={(checked) => setOptions("autorun", "alwaysBothExactAndNonExact", checked)}
							note="Makes more requests. Results from both searches are combined without duplicates."
						>
							Run both exact and non-exact Reddit searches
						</Checkbox>
						<Checkbox
							checked={options.autorun.retryError}
							onChange={(checked) => setOptions("autorun", "retryError", checked)}
							note="At most two attempts. Sign-in, verification and rate-limit responses are never automatically retried."
						>
							Retry network and server failures once after 5 seconds
						</Checkbox>
						<label class="flex flex-wrap items-center gap-2">
							Toolbar badge
							<select
								class={inputClass}
								onChange={(event) =>
									setOptions("autorun", "badgeContent", badgeContent(event.currentTarget.value))
								}
								value={options.autorun.badgeContent}
							>
								<option value="num_posts">Total discussions</option>
								<option value="num_comments">Total comments</option>
							</select>
						</label>
					</Section>
					<Section title="Site filter">
						<label class="flex items-center gap-2">
							Automatic search mode
							<select
								class={inputClass}
								onChange={(event) =>
									setOptions("filterlist", "type", event.currentTarget.value === "allow")
								}
								value={options.filterlist.type ? "allow" : "block"}
							>
								<option value="block">Skip listed sites</option>
								<option value="allow">Only search listed sites</option>
							</select>
						</label>
						<p class="text-sm text-neutral-700 dark:text-neutral-300">
							Add a domain or path, such as example.com or example.com/news. Subdomains are
							included.{" "}
							{options.filterlist.type
								? "An empty list pauses all automatic searches."
								: "An empty list allows automatic searches on all HTTP and HTTPS pages."}
						</p>
						<For each={options.filterlist.filters}>
							{(filter, index) => (
								<div class="flex items-center gap-2">
									<span class="min-w-0 flex-1 rounded-md bg-neutral-200 px-3 py-2 break-all dark:bg-neutral-700">
										{filter}
									</span>
									<button
										aria-label={`Remove ${filter}`}
										class={`${inputClass} cursor-pointer`}
										onClick={() =>
											setOptions("filterlist", "filters", (filters) =>
												filters.filter((_, position) => position !== index()),
											)
										}
										type="button"
									>
										Remove
									</button>
								</div>
							)}
						</For>
						<div class="flex gap-2">
							<input
								aria-label="Domain or path to filter"
								class={`${inputClass} min-w-0 flex-1`}
								onInput={(event) => setNewFilter(event.currentTarget.value)}
								placeholder="example.com/news"
								type="text"
								value={newFilter()}
							/>
							<button class={`${inputClass} cursor-pointer`} onClick={addFilter} type="button">
								Add
							</button>
						</div>
					</Section>
					<Section title="Caching">
						<label class="flex flex-wrap items-center gap-2">
							Keep results for
							<input
								class={`${inputClass} w-24`}
								max="1440"
								min="0"
								onInput={(event) =>
									setOptions("cache", "period", event.currentTarget.valueAsNumber)
								}
								required
								step="1"
								type="number"
								value={options.cache.period}
							/>
							minutes
						</label>
						<p class="text-sm text-neutral-700 dark:text-neutral-300">
							Set 0 to disable caching. Results stay in this browser session and expire after at
							most 24 hours. The popup’s Search button refreshes results; Reddit’s rate limits still
							apply.
						</p>
					</Section>
					<div class="sticky bottom-0 flex items-center gap-3 border-t border-neutral-300 bg-neutral-100 py-4 dark:border-neutral-700 dark:bg-neutral-800">
						<button
							class="cursor-pointer rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
							disabled={saving() || permissionPending()}
							type="submit"
						>
							{saving() ? "Saving…" : "Save settings"}
						</button>
						<Show when={changed() || newFilter().trim()}>
							<span class="text-sm">Unsaved changes</span>
							<button
								class={`${inputClass} cursor-pointer`}
								onClick={() => {
									setOptions(structuredClone(original()));
									setNewFilter("");
								}}
								type="button"
							>
								Reset
							</button>
						</Show>
					</div>
				</form>
			</Show>
			<output
				aria-live="polite"
				class={failed() ? "text-red-700 dark:text-red-300" : "text-green-800 dark:text-green-300"}
			>
				{status()}
			</output>
		</main>
	);
}
