import { browser } from "wxt/browser";

import type { SearchRequest, SearchResponse, SearchResult } from "@/types/shared";

export async function requestSearch(request: SearchRequest): Promise<SearchResult> {
	const response = await browser.runtime.sendMessage<SearchRequest, SearchResponse | undefined>(
		request,
	);
	if (!response) {
		throw new Error("The extension is restarting. Close and reopen the popup.");
	}
	if (!response.ok) {
		throw new Error(response.error);
	}
	return response.result;
}
