import { DEFAULT_CACHE_PERIOD_MINS } from "@/lib/query";
import { cache, getOptions, searchCache } from "@/lib/shared";
import type { RedditListing, RedditListings } from "@/types/Reddit";

export const SEARCH_API =
	"https://api.reddit.com/search.json?sort=top&t=all&limit=100&q=url:";
export const INFO_API = "https://reddit.com/api/info.json?url=";
export const DUPLICATES_API = "https://api.reddit.com/duplicates/";

interface RedditCacheData {
	posts: RedditListing[];
	time: number;
}

interface RedditCacheItem {
	exact?: RedditCacheData;
	nonExact?: RedditCacheData;
}

export async function findOnReddit(url: string, useCache = true, exact = true) {
	const url_no_protocol = url.replace(/^https?:\/\//i, "");
	const query = encodeURIComponent(url);
	const queryNoProtocol = encodeURIComponent(url_no_protocol);
	const type = exact ? "exact" : "nonExact";
	const nonType = !exact ? "exact" : "nonExact";

	let otherResultsCount: number | undefined;
	const cached = await searchCache<RedditCacheItem>(query);
	if (cached) {
		const results = cached[type];
		otherResultsCount = cached[nonType]?.posts.length;
		if (useCache && results && (await checkCacheValidity(results))) {
			return {
				posts: results.posts,
				other: otherResultsCount,
			};
		}
	}

	const posts = await getPostsViaApi(exact ? INFO_API : SEARCH_API, query);
	await Promise.all([
		cachePosts(query, posts, type),
		cachePosts(queryNoProtocol, posts, type),
	]);
	return {
		posts: posts,
		other: otherResultsCount,
	};
}

export async function search(query: string, useCache = true, exact = true) {
	let otherResultsCount: number | undefined;
	const cached = await searchCache<RedditCacheItem>(query);
	if (cached) {
		const results = cached[exact ? "exact" : "nonExact"];
		otherResultsCount = cached[exact ? "nonExact" : "exact"]?.posts.length;
		if (useCache && results && (await checkCacheValidity(results))) {
			return {
				posts: results.posts,
				other: otherResultsCount,
			};
		}
	}

	const posts = await getPostsViaApi(exact ? INFO_API : SEARCH_API, query);
	return {
		posts: posts,
		other: otherResultsCount,
	};
}

export async function getPostsViaApi(requestUrl: string, query: string) {
	const res = await fetch(`${requestUrl}${query}`);
	if (!res.ok) {
		throw new Error(`${res.status} - ${res.statusText}`);
	}
	const listings = (await res.json()) as RedditListings;
	const posts = listings.data.children;
	const posts_extended = add_duplicates(posts);
	return posts_extended;
}

export async function add_duplicates(posts: RedditListing[]) {
	// Pick the first post, get its duplicates, if there are any that are not
	// already in the results, add them.
	if (posts.length === 0) {
		return posts;
	}
	const all_ids = new Set(posts.map((p) => p.data.id));
	const id = posts[0].data.id;
	const duplicates = await get_duplicates_for_id(id);
	const newPosts = duplicates.filter((p) => !all_ids.has(p.data.id));
	const expandedPosts = posts.concat(newPosts);
	return expandedPosts;
}

export async function get_duplicates_for_id(post_id: string) {
	const res = await fetch(`${DUPLICATES_API}${post_id}`);
	if (!res.ok) {
		return [];
	}
	const duplicates = (await res.json()) as [RedditListings, RedditListings?];
	// the duplicates API endpoint returns an array of 2, the 2nd element of
	// which contains the duplicate posts
	const posts = duplicates[1]?.data.children ?? [];
	return posts;
}

export async function cachePosts(
	query: string,
	posts: RedditListing[],
	type: "exact" | "nonExact",
) {
	const cached = (await searchCache<RedditCacheItem>(query)) ?? {};

	cached[type] = {
		posts: posts,
		time: Date.now(),
	};
	await cache(query, cached);
}

export async function checkCacheValidity(data: RedditCacheData) {
	if (!(data.time && data.posts)) {
		return false;
	}
	const diff = Date.now() - data.time;
	const opts = await getOptions({
		cache: { period: DEFAULT_CACHE_PERIOD_MINS },
	});
	const not_expired = diff < +opts.cache.period * 60000;
	return not_expired;
}
