import "@/assets/index.css";

import { dequal } from "dequal";
import {
	batch,
	createSignal,
	For,
	Match,
	onMount,
	Show,
	Switch,
} from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { browser } from "wxt/browser";
import { DEFAULT_OPTIONS } from "@/lib/query";
import { getAllOptions, updateOptions } from "@/lib/shared";
import type { AllOptions, BadgeContent, OrderBy } from "@/types/options";
import { CheckboxOption } from "./CheckboxOption";
import { DescriptionOptions } from "./DescriptionOption";
import { Note } from "./Note";
import { SelectOption } from "./SelectOption";

const NOTIFICATION_TIMEOUT = 2500;

const formControlClasses =
	"block w-full px-3 py-1.5 text-base leading-normal border border-solid rounded shadow-sm transition-colors" +
	" bg-white border-gray-400 text-gray-700" +
	" dark:bg-gray-700 dark:border-gray-600 dark:text-white";

function Options() {
	const [mounted, setMounted] = createSignal(false);
	const [options, setOptions] = createStore<{ value: AllOptions }>({
		value: DEFAULT_OPTIONS,
	});
	const [originalOptions, setOriginalOptions] = createSignal(DEFAULT_OPTIONS);
	const [statusMessage, setStatusMessage] = createSignal("");
	const [statusClass, setStatusClass] = createSignal("");

	const saveOptions = async () => {
		try {
			await updateOptions(unwrap(options.value));
			setOriginalOptions(JSON.parse(JSON.stringify(options.value)));
			notifySuccess();
		} catch (_e) {
			notifyFailure();
		}
	};

	const notifySuccess = () => {
		setStatusClass("success");
		setStatusMessage("Saved!");
		setTimeout(() => {
			setStatusMessage("");
			setStatusClass("");
		}, NOTIFICATION_TIMEOUT);
	};

	const notifyFailure = (msg = "Error saving options") => {
		setStatusClass("text-red-400");
		setStatusMessage(msg);
	};

	onMount(async () => {
		const userOptions = unwrap(await getAllOptions());
		setOptions({ value: userOptions });
		setOriginalOptions(JSON.parse(JSON.stringify(userOptions)));
		setMounted(true);
	});

	return (
		<Switch>
			<Match when={!mounted}>Not Mounted</Match>
			<Match when={mounted}>
				<div class="container mx-auto px-4 py-5">
					<h1 class="mb-5 text-4xl">Options</h1>
					<hr class="my-5 border-gray-200 border-t dark:border-gray-700" />{" "}
					<form class="form">
						<h2 class="mt-5 mb-2 text-2xl">Sources</h2>
						<div class="mb-4 flex flex-col gap-y-2.5">
							<div class="flex items-start">
								<CheckboxOption
									checked={options.value.search.sources.reddit}
									description={[
										"Search ",
										{ text: "Reddit", type: "bold" },
										" for links by default.",
									]}
									disabled={!options.value.search.sources.hackernews}
									setSimpleChecked={(checked) => {
										setOptions("value", "search", "sources", "reddit", checked);
									}}
								/>
							</div>
							<div class="flex items-start">
								<CheckboxOption
									checked={options.value.search.sources.hackernews}
									description={[
										"Search ",
										{ text: "Hacker News", type: "bold" },
										" for links by default.",
									]}
									disabled={!options.value.search.sources.reddit}
									setSimpleChecked={(checked) => {
										setOptions(
											"value",
											"search",
											"sources",
											"hackernews",
											checked,
										);
									}}
								/>
							</div>
						</div>
						<hr class="my-5 border-gray-200 border-t dark:border-gray-700" />

						<h2 class="mt-5 mb-2 text-2xl">Old Reddit</h2>
						<div class="mb-4">
							<div class="flex items-start">
								<CheckboxOption
									checked={options.value.oldReddit}
									description={[
										"Make Reddit links point to ",
										{ text: "old.reddit.com", type: "code" },
									]}
									setSimpleChecked={(checked) => {
										setOptions("value", "oldReddit", checked);
									}}
								/>
							</div>
						</div>
						<hr class="my-5 border-gray-200 border-t dark:border-gray-700" />

						<h2 class="mt-5 mb-2 text-2xl">Popup</h2>
						<div class="mb-4">
							<h3 class="mt-3 text-lg">Results</h3>
							<div class="flex items-center">
								<div class="flex w-full items-center">
									<SelectOption
										description="By default, sort results by"
										onChange={(e) => {
											setOptions(
												"value",
												"popup",
												"results",
												"orderBy",
												e.currentTarget.value as OrderBy,
											);
										}}
										options={[["score"], ["comments"], ["age"], ["subreddit"]]}
										value={options.value.popup.results.orderBy}
									/>
									<CheckboxOption
										align={false}
										checked={options.value.popup.results.desc}
										description={"descending"}
										setSimpleChecked={(checked) => {
											setOptions("value", "popup", "results", "desc", checked);
										}}
									/>
								</div>
							</div>

							<h3 class="mt-3 mb-2 text-lg">Links</h3>
							<div class="mb-4 flex flex-col gap-y-2.5">
								<div class="flex items-start">
									<CheckboxOption
										checked={options.value.popup.newTab}
										description={"Open links in new tab"}
										setSimpleChecked={(checked) =>
											setOptions("value", "popup", "newTab", checked)
										}
									/>
								</div>
								<div class="flex items-start">
									<CheckboxOption
										checked={options.value.popup.newtabInBg}
										description={
											"Open new tab in the background without switching to it. Allows opening multiple links without closing the popup."
										}
										note={"Note: Only applies if the above option is enabled."}
										setSimpleChecked={(checked) =>
											setOptions("value", "popup", "newtabInBg", checked)
										}
									/>
								</div>

								<div class="flex items-start">
									<CheckboxOption
										checked={options.value.popup.newtabInBgAdjacent}
										description={
											"If opening a new tab in the background, put it right next to the current tab instead of at the end."
										}
										note={"Only applies if the above two options are enabled."}
										setSimpleChecked={(checked) =>
											setOptions(
												"value",
												"popup",
												"newtabInBgAdjacent",
												checked,
											)
										}
									/>
								</div>
							</div>
						</div>
						<hr class="my-5 border-gray-200 border-t dark:border-gray-700" />

						<h2 class="mt-5 mb-2 text-2xl">Search Defaults</h2>
						<div class="mb-4 flex flex-col gap-y-2.5">
							<div class="flex items-start">
								<CheckboxOption
									checked={options.value.search.exactMatch}
									description={"Exact match (Reddit only)"}
									note={[
										[
											"If checked, ",
											{ text: "xyz.com", type: "code" },
											" will ",
											{ text: "not", type: "underline" },
											" match ",
											{ text: "xyz.com/abc", type: "code" },
											", ",
											{ text: "xyz.com/abc/dev", type: "code" },
											"etc.",
										],
										[
											'Uses Reddit API\'s "info" endpoint instead of the "search" endpoint and is therefore faster and more reliable. HN search is always fuzzy.',
										],
									]}
									setSimpleChecked={(checked) =>
										setOptions("value", "search", "exactMatch", checked)
									}
								/>
							</div>
							<div class="flex items-start">
								<CheckboxOption
									checked={options.value.search.ignoreQs}
									description={"Ignore query-string"}
									setSimpleChecked={(checked) =>
										setOptions("value", "search", "ignoreQs", checked)
									}
								/>
							</div>
							<div class="flex items-start">
								<CheckboxOption
									checked={options.value.search.ytHandling}
									description={"Special handling of YouTube video links"}
									note={[
										[
											"If checked, search using the video ID only instead of the full URL to find all variations of YouTube links e.g. ",
											{ text: "youtu.be/dQw4w9WgXcQ", type: "code" },
											", ",
											{
												text: "youtube.com/watch?v=dQw4w9WgXcQ",
												type: "code",
											},
											", and more.",
										],
									]}
									setSimpleChecked={(checked) =>
										setOptions("value", "search", "ytHandling", checked)
									}
								/>
							</div>
						</div>
						<hr class="my-5 border-gray-200 border-t dark:border-gray-700" />

						<h2 class="mt-5 mb-2 text-2xl">Auto-search</h2>
						<div class="mb-4">
							<h3 class="mt-3 mb-2 text-lg">When to run the search?</h3>
							<div class="mb-4 flex flex-col gap-y-2.5">
								<div class="flex items-start">
									<CheckboxOption
										checked={options.value.autorun.updated}
										description={
											"When a tab's URL updates (e.g. you open a new tab, or you go to a different URL on the same tab, or refresh the tab)."
										}
										note={[
											[
												"This feature requires the ",
												{ text: "tabs", type: "code" },
												" permission. Previously this was granted implicitly, but is now is requested upon activating this option. ",
												"Once activated you won't be requested again to grant permission. ",
												"Remember to click ",
												{ text: "save", type: "underline" },
												" at the bottom!",
											],
										]}
										setComplexChecked={async (e) => {
											const response = await browser.permissions.request({
												permissions: ["tabs"],
											});
											if (response) {
												setOptions(
													"value",
													"autorun",
													"updated",
													e.target.checked,
												);
											} else {
												e.target.checked = false;
											}
										}}
										type="complex"
									/>
								</div>
								<div class="flex items-start">
									<CheckboxOption
										checked={options.value.autorun.activated}
										description={"Every time you go to an already open tab."}
										note={[
											[
												"This feature requires the ",
												{ text: "tabs", type: "code" },
												" permission. Previously this was granted implicitly, but is now is requested upon activating this option. ",
												"Once activated you won't be requested again to grant permission. ",
												"Remember to click ",
												{ text: "save", type: "underline" },
												" at the bottom!",
											],
										]}
										setComplexChecked={async (e) => {
											const response = await browser.permissions.request({
												permissions: ["tabs"],
											});
											if (response) {
												setOptions(
													"value",
													"autorun",
													"activated",
													e.target.checked,
												);
											} else {
												e.target.checked = false;
											}
										}}
										type="complex"
									/>
								</div>
							</div>

							<h3 class="mt-3 mb-2 text-lg">Exact vs non-exact</h3>
							<div class="mb-4 flex flex-col gap-y-2.5">
								<div class="flex items-start">
									<CheckboxOption
										checked={options.value.autorun.retryExact}
										description={
											"Automatically do a non-exact search if exact search returns zero results."
										}
										note={"Only applies to auto-search."}
										setSimpleChecked={(checked) =>
											setOptions("value", "autorun", "retryExact", checked)
										}
									/>
								</div>

								<div class="flex items-start">
									<CheckboxOption
										checked={options.value.autorun.alwaysBothExactAndNonExact}
										description={
											"Always automatically search exact and non-exact."
										}
										note={"Only applies to auto-search."}
										setSimpleChecked={(checked) =>
											setOptions(
												"value",
												"autorun",
												"alwaysBothExactAndNonExact",
												checked,
											)
										}
									/>
								</div>
							</div>

							<h3 class="mt-3 mb-2 text-lg">Retry</h3>
							<div class="mb-4 flex flex-col gap-y-2.5">
								<div class="flex items-start">
									<CheckboxOption
										checked={options.value.autorun.retryError}
										description={
											"Retry search (every 5 seconds) in case of server error (Max attempts: 5)."
										}
										setSimpleChecked={(checked) =>
											setOptions("value", "autorun", "retryError", checked)
										}
									/>
								</div>
							</div>

							<h3 class="mt-3 text-lg">Display</h3>
							<div class="flex w-full items-center">
								<SelectOption
									description="Number to show in extension icon"
									onChange={(e) => {
										setOptions(
											"value",
											"autorun",
											"badgeContent",
											e.currentTarget.value as BadgeContent,
										);
									}}
									options={[
										["num_posts", "total posts (Reddit + HN)"],
										["num_comments", "total comments (Reddit + HN)"],
									]}
									value={options.value.autorun.badgeContent}
								/>
							</div>

							<h3 class="mt-3 mb-2 text-lg">
								{options.value.filterlist.type ? "Whitelist" : "Blacklist"}
							</h3>
							<div class="mb-4 flex flex-col gap-y-2.5">
								<div class="flex items-start">
									<CheckboxOption
										checked={options.value.filterlist.type}
										description={"Toggle filter mode."}
										note={[
											[
												"Checked means ",
												{ text: "whitelist", type: "underline" },
												". Unchecked means ",
												{ text: "blacklist", type: "underline" },
												".",
											],
										]}
										setSimpleChecked={(checked) =>
											setOptions("value", "filterlist", "type", checked)
										}
									/>
								</div>
								<p class="">
									<DescriptionOptions
										formatted={[
											"Add a domain ",
											{ text: "facebook.com", type: "code" },
											" or ",
											{ text: "reddit.com/me", type: "code" },
											` to the ${options.value.filterlist.type ? "whitelist" : "blacklist"}, one per input box. Leave an input empty to delete.`,
											" Auto-search will not run on URLs belonging to these domains.",
										]}
									/>
								</p>
								<div class="flex w-full flex-col gap-y-2">
									<For each={options.value.filterlist.filters}>
										{(item, idx) => (
											<input
												class={formControlClasses}
												onChange={(e) => {
													batch(() => {
														setOptions(
															"value",
															"filterlist",
															"filters",
															idx(),
															e.currentTarget.value.trim().toLowerCase(),
														);
														setOptions(
															"value",
															"filterlist",
															"filters",
															(prev) => prev.filter((val) => val !== ""),
														);
													});
												}}
												type="text"
												value={item}
											/>
										)}
									</For>
									<input
										class={formControlClasses}
										onChange={(e) => {
											if (e.currentTarget.value.trim() !== "") {
												setOptions(
													"value",
													"filterlist",
													"filters",
													options.value.filterlist.filters.length,
													e.currentTarget.value.trim().toLowerCase(),
												);
												e.currentTarget.value = "";
											}
										}}
										type="text"
										value={""}
									/>
								</div>
							</div>
						</div>
						<hr class="my-5 border-gray-200 border-t dark:border-gray-700" />

						<h2 class="mt-5 mb-2 text-2xl">Caching</h2>
						<div class="mb-4">
							<div class="w-full">
								<span class="mr-2 whitespace-nowrap">Cache results for</span>
								<input
									class={
										"inline-block w-auto min-w-0 rounded border border-gray-400 border-solid bg-white px-2.5 py-1 align-middle text-gray-700 text-sm leading-snug dark:border-gray-600 dark:bg-gray-700 dark:text-white"
									}
									max="1440"
									min="0"
									onChange={(e) => {
										setOptions(
											"value",
											"cache",
											"period",
											e.currentTarget.valueAsNumber,
										);
									}}
									type="number"
									value={options.value.cache.period}
								/>
								<span class="mb-1.5 ml-2 whitespace-nowrap">
									minutes. (Max: 1440)
								</span>

								<div>
									<Note
										notes={[
											["the search button in the popup always bypasses cache."],
										]}
									/>
								</div>
							</div>
						</div>
						<hr class="my-5 border-gray-200 border-t dark:border-gray-700" />

						<div class="mt-5 flex items-center pb-5">
							<div class="mr-4 flex-shrink-0">
								<button
									class={
										"inline-block cursor-pointer whitespace-nowrap rounded bg-none px-3 py-1.5 text-center align-middle text-base transition-colors " +
										"border-gray-300 bg-gray-100 text-gray-800 " +
										"hover:bg-gray-200 hover:text-gray-800 " +
										"active:border-gray-400 active:bg-gray-300 active:text-gray-800 " +
										"dark:border-gray-500 dark:bg-gray-700 dark:text-gray-200 " +
										"dark:hover:bg-gray-800 dark:hover:text-white " +
										"dark:active:border-gray-600 dark:active:bg-gray-900 dark:active:text-white"
									}
									onClick={saveOptions}
									type="button"
								>
									Save
								</button>
							</div>
							<div class={`font-bold text-save-status ${statusClass()}`}>
								{statusMessage()}
							</div>
						</div>
					</form>
				</div>
				<Show when={!dequal(options.value, originalOptions())}>
					<div class="fixed right-4 bottom-4 flex w-96 items-center justify-between rounded-lg bg-neutral-200 px-3 py-3 text-center text-sm opacity-100 starting:opacity-0 shadow-2xl duration-500 dark:bg-neutral-700">
						<span>You have unsaved changes.</span>
						<button
							class="cursor-pointer rounded-md bg-black px-2 py-1 font-semibold text-white text-xs italic dark:bg-white dark:text-black"
							onClick={() => {
								setOptions({
									value: JSON.parse(JSON.stringify(originalOptions())),
								});
							}}
							type="button"
						>
							Reset Changes
						</button>
					</div>
				</Show>
			</Match>
		</Switch>
	);
}

export default Options;
