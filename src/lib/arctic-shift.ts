import type { Post, SearchResult } from "@/types/shared";

import { fetchJson, RequestError } from "./http";
import { isRecord } from "./parse";
import { parseRedditPost } from "./reddit-post";
import { parseHttpUrl, youtubeId } from "./url";

const SEARCH_API = "https://arctic-shift.photon-reddit.com/api/posts/search";
const RESULT_LIMIT = 100;
const FIELDS = "id,title,url,author,subreddit,score,num_comments,created_utc";

export interface ArchiveSearchOptions {
	exact: boolean;
	automatic: boolean;
	retry: boolean;
	pageUrl: string;
}

function searchUrls(query: string, pageUrl: string, exact: boolean): string[] {
	const url = parseHttpUrl(query);
	if (!url) {
		// Reddit can search a video ID anywhere in a URL; the archive requires full URL prefixes.
		const original = parseHttpUrl(pageUrl);
		if (!original || youtubeId(original) !== query) {
			throw new RequestError("This URL cannot be searched in Arctic Shift.");
		}
		original.search =
			original.pathname === "/watch" ? new URLSearchParams({ v: query }).toString() : "";
		return [
			...new Set([
				original.href,
				`https://www.youtube.com/watch?v=${query}`,
				`https://youtu.be/${query}`,
				`https://www.youtube.com/shorts/${query}`,
				`https://www.youtube.com/embed/${query}`,
				`https://www.youtube.com/live/${query}`,
				`https://www.youtube.com/v/${query}`,
				`https://www.youtube-nocookie.com/embed/${query}`,
				`http://www.youtube.com/watch?v=${query}`,
				`http://youtu.be/${query}`,
				`https://youtube.com/watch?v=${query}`,
			]),
		];
	}
	if (exact) {
		return [url.href];
	}
	const hosts = new Set([url.hostname]);
	if (url.hostname.startsWith("www.")) {
		hosts.add(url.hostname.slice(4));
	} else if (url.hostname.includes(".") && !/^[\d.]+$/.test(url.hostname)) {
		hosts.add(`www.${url.hostname}`);
	}
	const protocols = new Set([url.protocol, "https:", "http:"]);
	const variants = new Set<string>();
	for (const hostname of hosts) {
		for (const protocol of protocols) {
			const variant = new URL(url);
			variant.hostname = hostname;
			variant.protocol = protocol;
			variants.add(variant.href);
		}
	}
	return [...variants];
}

export async function findOnArcticShift(
	query: string,
	options: ArchiveSearchOptions,
): Promise<SearchResult> {
	const urls = searchUrls(query, options.pageUrl, options.exact).filter(
		(url) => url.length >= 14 && url.length <= 500,
	);
	if (!urls.length) {
		throw new RequestError(
			"Arctic Shift requires URLs between 14 and 500 characters. Try removing unnecessary query parameters.",
		);
	}
	const videoId = parseHttpUrl(query) ? undefined : query;
	const posts = new Map<string, Post>();
	const result = (): SearchResult => ({
		posts: [...posts.values()]
			.toSorted((a, b) => b.created_utc - a.created_utc)
			.slice(0, RESULT_LIMIT),
		via: "arctic-shift",
	});
	let completed = false;
	for (const url of urls) {
		const params = new URLSearchParams({
			url,
			url_exact: String(options.exact),
			limit: String(RESULT_LIMIT),
			sort: "desc",
			fields: FIELDS,
		});
		try {
			// Stop on a failed request or a full result set instead of issuing every variant at once.
			// oxlint-disable-next-line no-await-in-loop
			const response = await fetchJson(
				`${SEARCH_API}?${params}`,
				"arctic-shift",
				options.automatic,
				options.retry,
			);
			if (!isRecord(response) || !Array.isArray(response.data)) {
				throw new RequestError("Arctic Shift returned an unexpected response.");
			}
			completed = true;
			for (const value of response.data) {
				const post = parseRedditPost(value);
				if (!post) {
					continue;
				}
				const candidate = parseHttpUrl(post.url);
				if (!candidate) {
					continue;
				}
				let matches = options.exact ? candidate.href === url : candidate.href.startsWith(url);
				if (videoId) {
					matches = youtubeId(candidate) === videoId;
				}
				if (matches) {
					posts.set(post.id, post);
				}
			}
			if (posts.size >= RESULT_LIMIT) {
				break;
			}
		} catch (error) {
			if (!completed) {
				throw error;
			}
			return {
				...result(),
				warning: `Some archived URL variations could not be searched. ${error instanceof Error ? error.message : "Try again."}`,
			};
		}
	}
	return result();
}
