import { browser } from "wxt/browser";

import type { Post, DisplayPost } from "@/types/shared";

export const BADGE_COLORS = { error: "#DD1616", success: "#555555" };

export async function getCurrentTab() {
	const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
	if (!tab) {
		throw new Error("No active browser tab is available.");
	}
	return tab;
}

export const pluralize = (word: string, count: number) => `${word}${count === 1 ? "" : "s"}`;
const timeUnits = [
	{ seconds: 31_536_000, name: "year" },
	{ seconds: 2_592_000, name: "month" },
	{ seconds: 86_400, name: "day" },
	{ seconds: 3600, name: "hour" },
	{ seconds: 60, name: "minute" },
	{ seconds: 1, name: "second" },
];
export function calcAge(timestamp: number): string {
	const age = Math.max(0, Date.now() / 1000 - timestamp);
	for (const unit of timeUnits) {
		if (age >= unit.seconds) {
			const count = Math.floor(age / unit.seconds);
			return `${count} ${pluralize(unit.name, count)}`;
		}
	}
	return "0 seconds";
}
const dateFormat = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
	month: "short",
	year: "numeric",
});
export function displayPosts(posts: Post[]): DisplayPost[] {
	return posts.map((post) => ({
		...post,
		age: calcAge(post.created_utc),
		localDate: dateFormat.format(post.created_utc * 1000),
	}));
}
export function numToBadgeText(count: number): string {
	if (count < 1000) {
		return String(count);
	}
	if (count < 1_000_000) {
		return `${Math.trunc(count / 1000)}K+`;
	}
	return `${Math.trunc(count / 1_000_000)}M+`;
}
export async function setBadge(
	tabId: number,
	text: string,
	color = BADGE_COLORS.success,
	title = "Find on Reddit & Hacker News",
): Promise<void> {
	try {
		const action = import.meta.env.MANIFEST_VERSION === 2 ? browser.browserAction : browser.action;
		await Promise.all([
			action.setBadgeText({ tabId, text }),
			action.setBadgeBackgroundColor({ tabId, color }),
			action.setTitle({ tabId, title }),
		]);
	} catch {
		// Tabs can close while a lookup is in flight.
	}
}
export async function removeBadge(tabId: number): Promise<void> {
	await setBadge(tabId, "");
}
