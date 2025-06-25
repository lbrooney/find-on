import { pluralize } from "@/lib/shared";
import type { ProcessedRedditPost } from "@/types/shared";

interface RedditResultProp {
	post: ProcessedRedditPost;
	handleLinkClick: (e: MouseEvent, href: string) => void;
	redditURL: string;
}

export default function RedditResult(props: RedditResultProp) {
	return (
		<div class="flex items-center gap-x-2 rounded-lg bg-neutral-300 p-2 shadow-md transition-colors duration-150 hover:bg-neutral-400 dark:bg-neutral-700 dark:hover:bg-neutral-600">
			<div class="flex w-24 flex-shrink-0 flex-col gap-y-2">
				<div class="text-center font-bold text-blue-700 text-lg dark:text-blue-300">
					{props.post.score}
				</div>
				<a
					href={`${props.redditURL}/r/${props.post.subreddit}`}
					target="_blank"
					rel="noopener noreferrer"
					title={`/r/${props.post.subreddit}`}
					onClick={(e) =>
						props.handleLinkClick(
							e,
							`${props.redditURL}/r/${props.post.subreddit}`,
						)
					}
					class="overflow-hidden overflow-ellipsis text-nowrap rounded-full bg-red-700 px-2 py-0.5 text-center text-white text-xs transition-colors duration-150 hover:bg-red-600"
				>
					/r/{props.post.subreddit}
				</a>
			</div>
			<div class="flex-grow">
				<a
					href={props.post.url}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e) => props.handleLinkClick(e, props.post.url)}
					class="block break-words font-medium text-blue-800 text-sm hover:underline dark:text-blue-400"
				>
					<span class="post-title">{props.post.title}</span>
				</a>
				<div class="mt-1 flex flex-wrap gap-x-1 text-neutral-600 text-xs dark:text-neutral-400">
					<a
						href={`${props.redditURL}${props.post.permalink}`}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(e) =>
							props.handleLinkClick(
								e,
								`${props.redditURL}${props.post.permalink}`,
							)
						}
						class="hover:underline"
					>
						<span class="num-comments text-blue-700 dark:text-blue-300">
							{props.post.num_comments || 0}{" "}
							{pluralize("comment", props.post.num_comments || 0)}
						</span>
					</a>
					<span class="text-neutral-500 dark:text-neutral-500">|</span>
					<span class="text-xs">
						submitted{" "}
						<span
							class="timeago italic"
							title={props.post.localDate || ""}
						>
							{props.post.age || "?"} ago
						</span>{" "}
						by{" "}
						<a
							class="pop text-blue-700 hover:underline dark:text-blue-300"
							href={`${props.redditURL}/u/${props.post.author}`}
							target="_blank"
							rel="noopener noreferrer"
							onClick={(e) =>
								props.handleLinkClick(
									e,
									`${props.redditURL}/u/${props.post.author}`,
								)
							}
						>
							/u/{props.post.author}
						</a>
					</span>
				</div>
			</div>
		</div>
	);
}
