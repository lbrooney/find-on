export function parseHttpUrl(input: string): URL | undefined {
	try {
		const url = new URL(input);
		if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
			return undefined;
		}
		url.hash = "";
		return url;
	} catch {
		return undefined;
	}
}

export function youtubeId(url: URL): string | undefined {
	const host = url.hostname.replace(/^(?:www|m|music)\./, "");
	let id: string | null | undefined;
	if (host === "youtu.be") {
		[, id] = url.pathname.split("/");
	}
	if (host === "youtube.com" || host === "youtube-nocookie.com") {
		id = url.searchParams.get("v");
		if (!id && /^\/(?:embed|v|shorts|live)\//.test(url.pathname)) {
			id = url.pathname.split("/").at(2);
		}
	}
	return id && /^[\w-]{11}$/.test(id) ? id : undefined;
}

export function processUrl(
	input: string,
	{ ignoreQueryString = true, handleYtSpecial = true } = {},
) {
	const url = parseHttpUrl(input);
	if (!url) {
		return { isYt: false, urlToSearch: "" };
	}
	const id = handleYtSpecial ? youtubeId(url) : undefined;
	if (id) {
		return { isYt: true, urlToSearch: id };
	}
	if (ignoreQueryString) {
		url.search = "";
	}
	return { isYt: false, urlToSearch: url.href };
}

export function searchKey(input: string): string {
	const url = parseHttpUrl(input);
	if (!url) {
		return input;
	}
	// Snapshot the keys: deleting while iterating skips adjacent tracking parameters.
	// oxlint-disable-next-line unicorn/no-useless-spread
	for (const key of [...url.searchParams.keys()]) {
		if (
			/^utm_/i.test(key) ||
			["fbclid", "gclid", "dclid", "msclkid", "_ga", "mc_cid", "mc_eid"].includes(key.toLowerCase())
		) {
			url.searchParams.delete(key);
		}
	}
	return url.href.replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "");
}

export function matchesFilter(url: URL, filter: string): boolean {
	const rule = parseHttpUrl(/^https?:\/\//i.test(filter) ? filter : `https://${filter}`);
	if (!rule) {
		return false;
	}
	const host = rule.hostname.replace(/^www\./, "");
	const path = rule.pathname.replace(/\/$/, "");
	return (
		(url.hostname === host || url.hostname.endsWith(`.${host}`)) &&
		(!path || url.pathname === path || url.pathname.startsWith(`${path}/`))
	);
}
