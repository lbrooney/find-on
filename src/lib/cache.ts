import { browser } from "wxt/browser";

import type { SearchResult } from "@/types/shared";

import { isRecord } from "./parse";

const PREFIX = "results-v3:";
const MAX_ENTRIES = 80;
const MAX_BYTES = 3_000_000;
interface CacheEntry {
	time: number;
	result: SearchResult;
}
const pending = new Map<string, Promise<SearchResult>>();
let writes: Promise<unknown> = Promise.resolve();

async function read(key: string, minutes: number): Promise<SearchResult | undefined> {
	const stored = await browser.storage.session.get<Record<string, CacheEntry>>(key);
	const entry = stored[key];
	if (entry && Date.now() - entry.time < minutes * 60_000) {
		return entry.result;
	}
	return undefined;
}

async function write(key: string, result: SearchResult): Promise<void> {
	const entries = await browser.storage.session.get<Record<string, CacheEntry>>();
	const cached = Object.entries(entries)
		.filter(([name, value]) => name.startsWith(PREFIX) && isRecord(value))
		.toSorted((a, b) => b[1].time - a[1].time);
	let bytes = JSON.stringify(result).length * 2;
	let count = 1;
	const removed: string[] = [];
	for (const [name, value] of cached) {
		if (name === key) {
			continue;
		}
		bytes += JSON.stringify(value).length * 2;
		count += 1;
		if (count > MAX_ENTRIES || bytes > MAX_BYTES || Date.now() - value.time > 86_400_000) {
			removed.push(name);
		}
	}
	if (removed.length) {
		await browser.storage.session.remove(removed);
	}
	if (JSON.stringify(result).length * 2 <= MAX_BYTES) {
		await browser.storage.session.set({ [key]: { time: Date.now(), result } satisfies CacheEntry });
	}
}

export async function cachedSearch(
	key: string,
	minutes: number,
	refresh: boolean,
	fetcher: () => Promise<SearchResult>,
): Promise<SearchResult> {
	const fullKey = PREFIX + key;
	// Only network work is shared: an explicit refresh must never join a cache read.
	if (!refresh && minutes > 0) {
		const cached = await read(fullKey, minutes).catch(() => undefined);
		if (cached) {
			return cached;
		}
	}
	const existing = pending.get(fullKey);
	if (existing) {
		return existing;
	}
	const task = (async () => {
		const result = await fetcher();
		// Partial responses must be retried, rather than hiding a failed request behind the cache.
		if (minutes > 0 && !result.warning) {
			writes = writes.then(async () => write(fullKey, result)).catch(() => undefined);
			await writes;
		}
		return result;
	})().finally(() => pending.delete(fullKey));
	pending.set(fullKey, task);
	return task;
}
