export const HACKER_NEWS_SUBREDDIT = "Hacker News" as const;

export interface RedditPostType<SubredditType extends string = string> {
	title: string;
	url: string;
	score: number;
	num_comments: number;
	permalink: string;
	created_utc: number;
	subreddit: SubredditType;
	author: string;
}

export interface ProcessedRedditPost<SubredditType extends string = string>
	extends RedditPostType<SubredditType> {
	age: string;
	localDate: string;
}

export type ProcessedHackerNewsPost = ProcessedRedditPost<
	typeof HACKER_NEWS_SUBREDDIT
>;
