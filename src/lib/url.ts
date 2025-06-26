const YT_REGEX =
	/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|shorts|watch|live|e(?:mbed)?)\/|\S*?(?:[?&]|%3F)v(?:=|%3D)))([^"&?/\s]{11})/i;
const DASHES_REGEX = /^-*(.*)/i;

export function processUrl(
	url: string,
	{ ignoreQueryString = true, handleYtSpecial = true },
) {
	if (handleYtSpecial) {
		const ytVideoID = YT_REGEX.exec(url)?.[1];
		if (ytVideoID) {
			// biome-ignore lint/style/noNonNullAssertion: exec returns 2 things
			return { isYt: true, urlToSearch: DASHES_REGEX.exec(ytVideoID)![1] };
		}
	}
	return {
		isYt: false,
		urlToSearch: ignoreQueryString ? removeQueryString(url) : url,
	};
}

export function removeQueryString(url: string) {
	return url.split(/[?#]/i)[0];
}
