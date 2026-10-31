import type { Post, SearchResult } from "@/types/shared";

import { findOnArcticShift } from "./arctic-shift";
import type { ArchiveSearchOptions } from "./arctic-shift";
import { fetchJson, RedditAccessError, RequestError } from "./http";
import { isRecord } from "./parse";
import { parseRedditPost } from "./reddit-post";
import { searchKey } from "./url";

const REDDIT = "https://old.reddit.com";

function parseListing(value: unknown): Post[] {
	if (!isRecord(value) || !isRecord(value.data) || !Array.isArray(value.data.children)) {
		throw new RequestError("Reddit returned an unexpected response. Open Reddit and try again.");
	}
	const posts: Post[] = [];
	for (const child of value.data.children) {
		if (!isRecord(child) || child.kind !== "t3" || !isRecord(child.data)) {
			continue;
		}
		const post = parseRedditPost(child.data);
		if (post) {
			posts.push(post);
		}
	}
	return posts;
}

export async function findOnReddit(
	query: string,
	options: ArchiveSearchOptions & { refresh: boolean },
): Promise<SearchResult> {
	const { exact, automatic, retry, refresh } = options;
	const url = new URL(exact ? "/api/info.json" : "/search.json", REDDIT);
	url.search = new URLSearchParams({
		limit: "100",
		raw_json: "1",
		...(exact
			? { url: query }
			: {
					q: `url:"${searchKey(query).replaceAll('"', "")}"`,
					sort: "top",
					t: "all",
					type: "link",
				}),
	}).toString();
	let posts: Post[];
	try {
		posts = parseListing(await fetchJson(url.href, "reddit", automatic, retry, refresh));
	} catch (error) {
		if (!(error instanceof RedditAccessError)) {
			throw error;
		}
		return findOnArcticShift(query, options);
	}
	const [first] = posts;
	if (!first) {
		return { posts };
	}
	try {
		const data = await fetchJson(
			`${REDDIT}/duplicates/${first.id}.json?limit=100&raw_json=1`,
			"reddit",
			automatic,
			retry,
		);
		if (!Array.isArray(data) || !data[1]) {
			throw new RequestError("Reddit returned an unexpected response for related threads.");
		}
		const unique = new Map(posts.map((post) => [post.id, post]));
		for (const post of parseListing(data[1])) {
			unique.set(post.id, post);
		}
		return { posts: [...unique.values()] };
	} catch (error) {
		return {
			posts,
			warning: `Some related threads could not be loaded. ${error instanceof Error ? error.message : "Try again."}`,
		};
	}
}
