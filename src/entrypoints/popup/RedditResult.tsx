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
			<div class="flex w-24 flex-shrink-0 flex-col gap-y-1">
				<div class="text-center font-bold text-blue-700 text-lg dark:text-blue-300">
					{props.post.score}
				</div>
				<a
					class="overflow-hidden overflow-ellipsis text-nowrap rounded-full bg-red-700 px-2 py-0.5 text-center text-white text-xs transition-colors duration-150 hover:bg-red-600"
					href={`${props.redditURL}/r/${props.post.subreddit}`}
					onClick={(e) =>
						props.handleLinkClick(
							e,
							`${props.redditURL}/r/${props.post.subreddit}`,
						)
					}
					rel="noopener noreferrer"
					target="_blank"
					title={`/r/${props.post.subreddit}`}
				>
					/r/{props.post.subreddit}
				</a>
			</div>
			<div class="flex-grow">
				<a
					class="block break-words font-medium text-blue-800 text-sm hover:underline dark:text-blue-400"
					href={props.post.url}
					onClick={(e) => props.handleLinkClick(e, props.post.url)}
					rel="noopener noreferrer"
					target="_blank"
				>
					<span class="post-title">{props.post.title}</span>
				</a>
				<div class="mt-1 flex flex-wrap gap-x-1 text-neutral-600 text-xs dark:text-neutral-400">
					<a
						class="hover:underline"
						href={`${props.redditURL}${props.post.permalink}`}
						onClick={(e) =>
							props.handleLinkClick(
								e,
								`${props.redditURL}${props.post.permalink}`,
							)
						}
						rel="noopener noreferrer"
						target="_blank"
					>
						<span class="num-comments text-blue-700 dark:text-blue-300">
							{props.post.num_comments || 0}{" "}
							{pluralize("comment", props.post.num_comments || 0)}
						</span>
					</a>
					<span class="text-neutral-500 dark:text-neutral-500">|</span>
					<span class="text-xs">
						submitted{" "}
						<span class="timeago italic" title={props.post.localDate || ""}>
							{props.post.age || "?"} ago
						</span>{" "}
						by{" "}
						<a
							class="pop text-blue-700 hover:underline dark:text-blue-300"
							href={`${props.redditURL}/u/${props.post.author}`}
							onClick={(e) =>
								props.handleLinkClick(
									e,
									`${props.redditURL}/u/${props.post.author}`,
								)
							}
							rel="noopener noreferrer"
							target="_blank"
						>
							/u/{props.post.author}
						</a>
					</span>
				</div>
			</div>
		</div>
	);
}
