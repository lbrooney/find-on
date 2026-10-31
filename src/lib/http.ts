import { browser } from "wxt/browser";

import type { Source } from "@/types/shared";

const GUARD_KEY = "reddit-rate-guard-v1";
const ARCTIC_GUARD_KEY = "arctic-shift-rate-guard-v1";
const REQUEST_TIMEOUT = 10_000;
const RETRY_DELAY = 5000;
type HttpSource = Source | "arctic-shift";
const names = { reddit: "Reddit", hackernews: "Hacker News", "arctic-shift": "Arctic Shift" };

export class RequestError extends Error {
	constructor(
		message: string,
		readonly retryable = false,
		readonly pauseUntil = 0,
		readonly automaticOnly = false,
	) {
		super(message);
		this.name = "RequestError";
	}
}

export class RedditAccessError extends RequestError {
	constructor(message: string, pauseUntil = Date.now() + 300_000) {
		super(message, false, pauseUntil, true);
		this.name = "RedditAccessError";
	}
}

interface RateGuard {
	limitedUntil: number;
	pausedUntil: number;
	tokens: number;
	updatedAt: number;
	message: string;
	accessBlocked?: boolean;
}
let redditQueue: Promise<unknown> = Promise.resolve();
let arcticQueue: Promise<unknown> = Promise.resolve();

interface ArcticGuard {
	limitedUntil: number;
	nextRequestAt: number;
}

function retryTime(headers: Headers): number {
	const now = Date.now();
	const after = headers.get("retry-after");
	const seconds = Number(after);
	const date = after && !Number.isFinite(seconds) ? Date.parse(after) : Number.NaN;
	const reset = Number(headers.get("x-ratelimit-reset"));
	const resetAt = Number(headers.get("x-ratelimit-reset-at"));
	const times = [
		after && Number.isFinite(seconds) ? now + seconds * 1000 : 0,
		Number.isFinite(date) ? date : 0,
		Number.isFinite(reset) ? now + reset * 1000 : 0,
		Number.isFinite(resetAt) ? resetAt : 0,
	].filter((time) => time > now);
	return times.length ? Math.max(...times) : now + 60_000;
}

async function request(
	url: string,
	source: HttpSource,
): Promise<{ data: unknown; headers: Headers }> {
	const signal = AbortSignal.timeout(REQUEST_TIMEOUT);
	try {
		const response = await fetch(url, {
			credentials: source === "reddit" ? "include" : "omit",
			cache: "no-store",
			headers: { Accept: "application/json" },
			signal,
		});
		const { headers, status } = response;
		if (status === 429) {
			await response.body?.cancel();
			const until = retryTime(headers);
			throw new RequestError(
				`${names[source]} is rate limited. Try again after ${new Date(until).toLocaleTimeString()}.`,
				false,
				until,
			);
		}
		if (
			source === "reddit" &&
			(status === 401 || /\/(?:login|account\/login)(?:\/|\?|$)/.test(response.url))
		) {
			await response.body?.cancel();
			throw new RedditAccessError("Sign in to Reddit in this browser profile, then search again.");
		}
		if (!response.ok) {
			await response.body?.cancel();
			if (source === "reddit" && status === 403) {
				throw new RedditAccessError(
					"Reddit blocked this request. Open Reddit to sign in or complete its verification, then search again.",
				);
			}
			if (source === "arctic-shift" && status === 422) {
				throw new RequestError(
					"Arctic Shift could not finish this search. Try again shortly.",
					true,
				);
			}
			throw new RequestError(`${names[source]} returned HTTP ${status}.`, status >= 500);
		}
		if (!/\bjson\b/i.test(headers.get("content-type") ?? "")) {
			await response.body?.cancel();
			if (source === "reddit") {
				throw new RedditAccessError(
					"Reddit returned a sign-in or verification page. Open Reddit in this browser profile, then search again.",
				);
			}
			throw new RequestError(`${names[source]} returned an unexpected response.`);
		}
		return { data: (await response.json()) as unknown, headers };
	} catch (error) {
		if (error instanceof RequestError) {
			throw error;
		}
		if (error instanceof SyntaxError) {
			throw new RequestError(`${names[source]} returned invalid JSON.`);
		}
		throw new RequestError(
			signal.aborted
				? `${names[source]} timed out. Try again.`
				: `Could not connect to ${names[source]}. Check your connection and try again.`,
			true,
		);
	}
}

async function redditRequest(url: string, automatic: boolean, refresh: boolean): Promise<unknown> {
	const stored = await browser.storage.session.get<{ [GUARD_KEY]?: RateGuard }>(GUARD_KEY);
	const now = Date.now();
	const guard = stored[GUARD_KEY] ?? {
		limitedUntil: 0,
		pausedUntil: 0,
		tokens: 8,
		updatedAt: now,
		message: "",
	};
	guard.tokens = Math.min(8, guard.tokens + (Math.max(0, now - guard.updatedAt) * 8) / 60_000);
	guard.updatedAt = now;
	if (guard.limitedUntil > now) {
		throw new RequestError(guard.message || "Reddit requests are paused. Try again shortly.");
	}
	if (guard.accessBlocked && guard.pausedUntil > now && !refresh) {
		throw new RedditAccessError(guard.message, guard.pausedUntil);
	}
	if (automatic && guard.pausedUntil > now) {
		throw new RequestError(guard.message || "Reddit requests are paused. Try again shortly.");
	}
	if (automatic) {
		if (guard.tokens < 1) {
			throw new RequestError(
				"Automatic Reddit searches are paused to limit requests. Open the popup to search.",
			);
		}
		guard.tokens -= 1;
	}
	try {
		const { data, headers } = await request(url, "reddit");
		guard.message = "";
		guard.pausedUntil = 0;
		guard.accessBlocked = false;
		const remaining = headers.get("x-ratelimit-remaining");
		const reset = headers.get("x-ratelimit-reset");
		if (
			remaining !== null &&
			Number(remaining) < 10 &&
			reset !== null &&
			Number.isFinite(Number(reset))
		) {
			guard.pausedUntil = now + Math.max(0, Number(reset)) * 1000;
		}
		return data;
	} catch (error) {
		if (error instanceof RequestError && error.pauseUntil) {
			if (error.automaticOnly) {
				guard.pausedUntil = error.pauseUntil;
				guard.accessBlocked = error instanceof RedditAccessError;
			} else {
				guard.limitedUntil = error.pauseUntil;
			}
			guard.message = error.message;
		}
		throw error;
	} finally {
		await browser.storage.session.set({ [GUARD_KEY]: guard });
	}
}

async function arcticRequest(url: string): Promise<unknown> {
	const stored = await browser.storage.session.get<{ [ARCTIC_GUARD_KEY]?: ArcticGuard }>(
		ARCTIC_GUARD_KEY,
	);
	const guard = stored[ARCTIC_GUARD_KEY] ?? { limitedUntil: 0, nextRequestAt: 0 };
	if (guard.limitedUntil > Date.now()) {
		throw new RequestError(
			`Arctic Shift is rate limited. Try again after ${new Date(guard.limitedUntil).toLocaleTimeString()}.`,
		);
	}
	// This free archive asks clients to keep traffic to a couple of requests per second.
	const delay = Math.min(500, Math.max(0, guard.nextRequestAt - Date.now()));
	if (delay) {
		await new Promise<void>((resolve) => setTimeout(resolve, delay));
	}
	guard.nextRequestAt = Date.now() + 500;
	try {
		const response = await request(url, "arctic-shift");
		return response.data;
	} catch (error) {
		if (error instanceof RequestError && error.pauseUntil) {
			guard.limitedUntil = error.pauseUntil;
		}
		throw error;
	} finally {
		await browser.storage.session.set({ [ARCTIC_GUARD_KEY]: guard });
	}
}

export async function fetchJson(
	url: string,
	source: HttpSource,
	automatic: boolean,
	retry: boolean,
	refresh = false,
): Promise<unknown> {
	const run = async () => {
		if (source === "hackernews") {
			const response = await request(url, source);
			return response.data;
		}
		if (source === "arctic-shift") {
			const pending = arcticQueue.then(async () => arcticRequest(url));
			arcticQueue = pending.catch(() => undefined);
			return pending;
		}
		const pending = redditQueue.then(async () => redditRequest(url, automatic, refresh));
		redditQueue = pending.catch(() => undefined);
		return pending;
	};
	try {
		return await run();
	} catch (error) {
		if (!retry || !(error instanceof RequestError) || !error.retryable) {
			throw error;
		}
		await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY));
		return run();
	}
}
