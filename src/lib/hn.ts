// Shared Hacker News API helper used in popup.js and background.js

import { DEFAULT_CACHE_PERIOD_MINS } from "@/lib/query";
import {
	cache,
	calcAge,
	getOptions,
	searchCache,
	unixToLocaleDate,
} from "@/lib/shared";
import type { HNHit, HNHits } from "@/types/HN";
import {
	HACKER_NEWS_SUBREDDIT,
	type ProcessedHackerNewsPost,
} from "@/types/shared";

export const HN_API_URL = "https://hn.algolia.com/api/v1/search";
export const HN_URL = "https://news.ycombinator.com";

interface HNCacheItem {
	hits: HNHit[];
	time: number;
}

export function cleanUrl(url: string) {
	try {
		const urlObj = new URL(url);
		const params = urlObj.searchParams;
		["utm_", "clid", "fbclid", "gclid", "ref", "source", "_ga"].forEach(
			(param) => {
				for (const key of params.keys()) {
					if (key.includes(param)) {
						params.delete(key);
					}
				}
			},
		);
		urlObj.search = params.toString();
		return urlObj
			.toString()
			.replace(/^https?:\/\/(www\.)?/, "")
			.replace(/\/$/, "");
	} catch (e) {
		console.error("HN cleanUrl err:", e);
		return url;
	}
}

export async function fetchHnHits(url: string, useCache = true) {
	const cleanUrlStr = cleanUrl(url);
	const cachedData = await searchCache<HNCacheItem>(cleanUrlStr);

	if (useCache && cachedData && (await checkCacheValidity(cachedData))) {
		return cachedData.hits || [];
	}

	const params = new URLSearchParams({
		query: cleanUrlStr,
		restrictSearchableAttributes: "url",
		analytics: "false",
	});
	const res = await fetch(`${HN_API_URL}?${params}`);
	if (!res.ok) {
		throw new Error(
			`Error fetching HN hits: ${res.statusText} - ${res.statusText}`,
		);
	}
	const responseData = (await res.json()) as HNHits;
	const hits = responseData.hits || [];

	await cacheHits(cleanUrlStr, hits);

	return hits;
}

async function cacheHits(query: string, hits: HNHit[]) {
	await cache(query, {
		hits,
		time: Date.now(),
	});
}

async function checkCacheValidity(cache: HNCacheItem) {
	if (!Object.hasOwn(cache, "hits") || !Object.hasOwn(cache, "time")) {
		return false;
	}
	const diff = Date.now() - cache.time;
	const opts = await getOptions({
		cache: { period: DEFAULT_CACHE_PERIOD_MINS },
	});
	return diff < +opts.cache.period * 60000;
}

export function convertHitsToPostObjects(
	hits: HNHit[],
): ProcessedHackerNewsPost[] {
	// Convert Algolia hits to objects compatible with Reddit post data structure
	return hits.map((h) => {
		const time = h.created_at_i ?? Math.floor(Date.now() / 1000);
		return {
			score: h.points ?? 0,
			num_comments: h.num_comments ?? 0,
			title: h.title ?? "HN Discussion",
			url: h.url,
			permalink: `/item?id=${h.objectID}`,
			subreddit: HACKER_NEWS_SUBREDDIT,
			created_utc: time,
			author: h.author ?? "user",
			age: calcAge(time),
			localDate: unixToLocaleDate(time),
		};
	});
}
