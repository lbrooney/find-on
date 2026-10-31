import { HACKER_NEWS_SUBREDDIT } from "@/types/shared";
import type { Post, SearchResult } from "@/types/shared";

import { fetchJson, RequestError } from "./http";
import { isRecord, numberValue, stringValue } from "./parse";
import { parseHttpUrl, searchKey } from "./url";

export async function fetchHnHits(
	query: string,
	automatic: boolean,
	retry: boolean,
): Promise<SearchResult> {
	const params = new URLSearchParams({
		analytics: "false",
		query: searchKey(query),
		restrictSearchableAttributes: "url",
		tags: "story",
		hitsPerPage: "100",
	});
	const data = await fetchJson(
		`https://hn.algolia.com/api/v1/search?${params}`,
		"hackernews",
		automatic,
		retry,
	);
	if (!isRecord(data) || !Array.isArray(data.hits)) {
		throw new RequestError("Hacker News returned an unexpected response.");
	}
	const posts = new Map<string, Post>();
	for (const hit of data.hits) {
		if (!isRecord(hit)) {
			continue;
		}
		const id = stringValue(hit.objectID);
		const url = parseHttpUrl(stringValue(hit.url));
		if (!/^\d+$/.test(id) || !url) {
			continue;
		}
		posts.set(id, {
			id,
			source: "hackernews",
			url: url.href,
			permalink: `/item?id=${id}`,
			title: stringValue(hit.title, "Hacker News discussion"),
			author: stringValue(hit.author, "[deleted]"),
			subreddit: HACKER_NEWS_SUBREDDIT,
			score: numberValue(hit.points),
			num_comments: numberValue(hit.num_comments),
			created_utc: numberValue(hit.created_at_i),
		});
	}
	return { posts: [...posts.values()] };
}
