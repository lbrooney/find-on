import { Show } from "solid-js";

import { pluralize } from "@/lib/shared";
import type { DisplayPost } from "@/types/shared";

interface ResultProps {
	post: DisplayPost;
	oldReddit: boolean;
	handleLinkClick: (event: MouseEvent, href: string) => void;
}
export default function Result(props: ResultProps) {
	const isReddit = () => props.post.source === "reddit";
	const origin = () =>
		isReddit()
			? `https://${props.oldReddit ? "old" : "www"}.reddit.com`
			: "https://news.ycombinator.com";
	const discussion = () => `${origin()}${props.post.permalink}`;
	const author = () =>
		isReddit()
			? `${origin()}/user/${encodeURIComponent(props.post.author)}`
			: `${origin()}/user?id=${encodeURIComponent(props.post.author)}`;
	return (
		<article class="flex items-center gap-3 rounded-lg bg-neutral-300 p-3 shadow-sm dark:bg-neutral-700">
			<div class="flex w-24 shrink-0 flex-col items-center gap-1">
				<span
					aria-label={`${props.post.score} points`}
					class="text-lg font-bold text-blue-700 dark:text-blue-300"
				>
					{props.post.score}
				</span>
				<Show
					when={isReddit()}
					fallback={
						<span class="rounded-full bg-orange-700 px-2 py-0.5 text-xs text-white">
							Hacker News
						</span>
					}
				>
					<a
						class="max-w-full truncate rounded-full bg-red-700 px-2 py-0.5 text-xs text-white hover:underline"
						href={`${origin()}/r/${encodeURIComponent(props.post.subreddit)}`}
						onClick={(event) =>
							props.handleLinkClick(
								event,
								`${origin()}/r/${encodeURIComponent(props.post.subreddit)}`,
							)
						}
						rel="noopener noreferrer"
						target="_blank"
					>
						r/{props.post.subreddit}
					</a>
				</Show>
			</div>
			<div class="min-w-0 flex-1">
				<a
					class="block font-medium break-words text-blue-800 hover:underline dark:text-blue-300"
					href={props.post.url}
					onClick={(event) => props.handleLinkClick(event, props.post.url)}
					rel="noopener noreferrer"
					target="_blank"
				>
					{props.post.title}
				</a>
				<div class="mt-1 flex flex-wrap gap-x-1 text-xs text-neutral-700 dark:text-neutral-300">
					<a
						class="text-blue-800 hover:underline dark:text-blue-300"
						href={discussion()}
						onClick={(event) => props.handleLinkClick(event, discussion())}
						rel="noopener noreferrer"
						target="_blank"
					>
						{props.post.num_comments} {pluralize("comment", props.post.num_comments)}
					</a>
					<span>·</span>
					<span title={props.post.localDate}>{props.post.age} ago</span>
					<span>by</span>
					<Show when={props.post.author !== "[deleted]"} fallback={<span>[deleted]</span>}>
						<a
							class="hover:underline"
							href={author()}
							onClick={(event) => props.handleLinkClick(event, author())}
							rel="noopener noreferrer"
							target="_blank"
						>
							{props.post.author}
						</a>
					</Show>
				</div>
			</div>
		</article>
	);
}
