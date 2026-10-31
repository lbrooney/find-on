export const HACKER_NEWS_SUBREDDIT = "Hacker News";
export type Source = "reddit" | "hackernews";

export interface Post {
	id: string;
	source: Source;
	title: string;
	url: string;
	score: number;
	num_comments: number;
	permalink: string;
	created_utc: number;
	subreddit: string;
	author: string;
}

export interface DisplayPost extends Post {
	age: string;
	localDate: string;
}
export interface SearchResult {
	posts: Post[];
	warning?: string;
	via?: "arctic-shift";
}
export type SearchResponse = { ok: true; result: SearchResult } | { ok: false; error: string };
export interface SearchRequest {
	type: "search";
	source: Source;
	url: string;
	exact: boolean;
	ignoreQs: boolean;
	ytHandling: boolean;
	refresh: boolean;
}
