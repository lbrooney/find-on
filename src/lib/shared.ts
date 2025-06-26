import { type Browser, browser } from "wxt/browser";
import type { AllOptions } from "@/types/options";
import { DEFAULT_OPTIONS } from "./query";

export const BADGE_COLORS = {
	error: "#DD1616",
	success: "#555555",
};

export async function getCurrentTabUrl() {
	const tab = await getCurrentTab();
	return tab.url;
}

export async function getCurrentTabIndex() {
	const tab = await getCurrentTab();
	return tab.index;
}

export async function getCurrentTab() {
	const tabs = await browser.tabs.query({
		active: true,
		currentWindow: true,
	});
	return tabs[0];
}

export async function navigateTo(url: string) {
	const tab = await getCurrentTab();
	if (tab.id) {
		browser.tabs.update(tab.id, { url });
	}
}

export async function searchCache<T>(query: string) {
	return (
		(await browser.storage.session.get(query)) as { [query]: T | undefined }
	)[query];
}

export async function clearCache() {
	await browser.storage.session.clear();
}

export async function cache<T>(key: string, data: T) {
	await browser.storage.session.set({ [key]: data });
}

export async function updateOptions(data: AllOptions) {
	await browser.storage.sync.set({ options: data });
}

export async function getAllOptions() {
	return getOptions(DEFAULT_OPTIONS);
}

export async function getOptions<T extends Partial<AllOptions>>(
	query: T,
): Promise<T> {
	const data = await browser.storage.sync.get({ options: query });
	return data.options;
}

export const pluralize = (str: string, n: number) =>
	`${str}${n !== 1 ? "s" : ""}`;

const timeUnits = [
	{ decis: 0, factor: 1 / 1e3, name: "seconds" },
	{ decis: 0, factor: 1 / (1e3 * 60), name: "minutes" },
	{ decis: 0, factor: 1 / (1e3 * 60 * 60), name: "hours" },
	{ decis: 0, factor: 1 / (1e3 * 60 * 60 * 24), name: "days" },
	{ decis: 0, factor: 1 / (1e3 * 60 * 60 * 24 * 30), name: "months" },
	{ decis: 1, factor: 1 / (1e3 * 60 * 60 * 24 * 30 * 12), name: "years" },
];

export function calcAge(timestampSeconds: number): string {
	const diffMillis = Date.now() - timestampSeconds * 1e3;
	const [n, unit] = timeUnits
		.map((t) => [+(diffMillis * t.factor).toFixed(t.decis), t.name])
		.reverse()
		.find(([val]) => (val as number) >= 1) || [0, "seconds"]; // Fallback for very small diffs

	const displayUnit = n === 1 ? (unit as string).slice(0, -1) : unit;
	return `${n} ${displayUnit}`;
}

export const unixToLocaleDate = (time: number) =>
	new Date(time * 1000).toLocaleString(undefined, {
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		month: "short",
		year: "numeric",
	});

export function numToBadgeText(n: number) {
	if (n < 1_000) {
		return `${n}`;
	} else if (n < 1_000_000) {
		return `${Math.trunc(n / 1_000)}K+`;
	} else if (n < 1_000_000_000) {
		return `${Math.trunc(n / 1_000_000)}M+`;
	}
	return "inf";
}

export async function removeBadge(tabId: number) {
	return setBadge(tabId, "", BADGE_COLORS.success);
}

export async function setBadge(tabId: number, text: string, color: string) {
	const badge: Browser.action.BadgeTextDetails = { tabId: tabId, text: text };
	const bgCol: Browser.action.BadgeColorDetails = {
		color: color,
		tabId: tabId,
	};
	// could just make the extension mv3 on firefox as well, but DX/hot reload is broken
	try {
		await (browser.action ?? browser.browserAction).setBadgeText(badge);
		await (browser.action ?? browser.browserAction).setBadgeBackgroundColor(
			bgCol,
		);
	} catch (args) {
		console.log(args);
	}
}
