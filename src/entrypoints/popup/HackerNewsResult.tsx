import { HN_URL } from "@/lib/hn";
import { pluralize } from "@/lib/shared";
import type { ProcessedHackerNewsPost } from "@/types/shared";

interface HackerNewsResultProp {
	post: ProcessedHackerNewsPost;
	handleLinkClick: (e: MouseEvent, href: string) => void;
}

export default function HackerNewsResult(props: HackerNewsResultProp) {
	return (
		<div class="flex items-center gap-x-2 rounded-lg bg-neutral-300 p-2 shadow-md transition-colors duration-150 hover:bg-neutral-400 dark:bg-neutral-700 dark:hover:bg-neutral-600">
			<div class="flex w-24 flex-shrink-0 flex-col gap-y-1">
				<div class="text-center font-bold text-blue-700 text-lg dark:text-blue-300">
					{props.post.score}
				</div>
				<span class="overflow-hidden overflow-ellipsis text-nowrap rounded-full bg-orange-500 px-2 py-0.5 text-center font-semibold text-white text-xs">
					Hacker News
				</span>
			</div>
			<div class="flex-grow">
				<a
					class="block break-words font-medium text-blue-800 text-sm hover:underline dark:text-blue-400"
					href={props.post.url}
					onClick={(e) => props.handleLinkClick(e, props.post.url)}
					rel="noopener noreferrer"
					target="_blank"
				>
					{props.post.title}
				</a>
				<div class="mt-1 flex flex-wrap gap-x-1 text-neutral-600 text-xs dark:text-neutral-400">
					{/* Comments */}
					<a
						class="hover:underline"
						href={`${HN_URL}${props.post.permalink}`}
						onClick={(e) =>
							props.handleLinkClick(e, `${HN_URL}${props.post.permalink}`)
						}
						rel="noopener noreferrer"
						target="_blank"
					>
						<span class="text-blue-700 dark:text-blue-300">
							{props.post.num_comments || 0}{" "}
							{pluralize("comment", props.post.num_comments || 0)}
						</span>
					</a>
					<span class="text-neutral-500 dark:text-neutral-500">|</span>
					<span class="text-xs">
						submitted{" "}
						<span class="italic" title={props.post.localDate || ""}>
							{props.post.age || "?"} ago
						</span>{" "}
						by{" "}
						<a
							class="text-blue-700 hover:underline dark:text-blue-300"
							href={`${HN_URL}/user?id=${props.post.author}`}
							onClick={(e) =>
								props.handleLinkClick(
									e,
									`${HN_URL}/user?id=${props.post.author}`,
								)
							}
							rel="noopener noreferrer"
							target="_blank"
						>
							{props.post.author}
						</a>
					</span>
				</div>
			</div>
		</div>
	);
}
