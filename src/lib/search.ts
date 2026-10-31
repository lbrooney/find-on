import type { AllOptions } from "@/types/options";
import type { SearchRequest, SearchResult } from "@/types/shared";

import { cachedSearch } from "./cache";
import { fetchHnHits } from "./hn";
import { isRecord } from "./parse";
import { findOnReddit } from "./reddit";
import { parseHttpUrl, processUrl } from "./url";

export function isSearchRequest(message: unknown): message is SearchRequest {
	return (
		isRecord(message) &&
		message.type === "search" &&
		(message.source === "reddit" || message.source === "hackernews") &&
		typeof message.url === "string" &&
		["exact", "ignoreQs", "ytHandling", "refresh"].every((key) => typeof message[key] === "boolean")
	);
}

export async function search(
	request: SearchRequest,
	options: AllOptions,
	automatic = false,
): Promise<SearchResult> {
	if (request.url.length > 8192) {
		throw new Error(
			"This URL is too long to search. Remove unnecessary query parameters and try again.",
		);
	}
	if (!parseHttpUrl(request.url)) {
		throw new Error("Enter an HTTP or HTTPS URL without a username or password.");
	}
	const { urlToSearch, isYt } = processUrl(request.url, {
		ignoreQueryString: request.ignoreQs,
		handleYtSpecial: request.ytHandling,
	});
	const exact = request.source === "reddit" && request.exact && !isYt;
	const key = `${request.source}:${exact ? "exact" : "search"}:${urlToSearch}`;
	return cachedSearch(key, options.cache.period, request.refresh, async () =>
		request.source === "reddit"
			? findOnReddit(urlToSearch, {
					exact,
					automatic,
					retry: !automatic || options.autorun.retryError,
					refresh: request.refresh,
					pageUrl: request.url,
				})
			: fetchHnHits(urlToSearch, automatic, !automatic || options.autorun.retryError),
	);
}
