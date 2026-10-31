import type { Post } from "@/types/shared";

import { isRecord, numberValue, stringValue } from "./parse";
import { parseHttpUrl } from "./url";

export function parseRedditPost(value: unknown): Post | undefined {
	if (!isRecord(value)) {
		return undefined;
	}
	const id = stringValue(value.id);
	const subreddit = stringValue(value.subreddit);
	const url = parseHttpUrl(stringValue(value.url_overridden_by_dest) || stringValue(value.url));
	if (!/^[a-z0-9]+$/i.test(id) || !/^\w+$/.test(subreddit) || !url) {
		return undefined;
	}
	const permalink = stringValue(value.permalink);
	return {
		id,
		source: "reddit",
		url: url.href,
		permalink: permalink.startsWith("/r/") ? permalink : `/r/${subreddit}/comments/${id}/`,
		title: stringValue(value.title, "Reddit discussion"),
		author: stringValue(value.author, "[deleted]"),
		subreddit,
		score: numberValue(value.score),
		num_comments: Math.max(0, numberValue(value.num_comments)),
		created_utc: Math.min(253_402_300_799, Math.max(0, numberValue(value.created_utc))),
	};
}
