# Privacy Policy

## Consent
By using this extension, you agree to the access and use of the data as described in this policy.

## Data access
To perform its stated function, the extension must access the tab's URL. If auto-search is disabled, this will only happen when the extension popup is opened; if it is enabled, this will happen when a tab's URL is updated (on creation, reload, navigation) or when a tab is navigated to, depending on the auto-search settings.
This includes chrome:// and file:// URLs. 

## Data usage
The URLs accessed are used in the following ways
- To query public APIs for discussion threads:
	- Reddit:
		- https://api.reddit.com/search.json (non-exact search)
		- https://api.reddit.com/info.json (exact search)
		- https://api.reddit.com/duplicates (for every search)
	- Hacker News:
		- https://hn.algolia.com/api/v1/search (search by URL)

- To store the URL and the corresponding search results locally via Chrome's Storage API, if caching is enabled.

Neither the URLs nor the search results are transmitted or stored anywhere else, or used in any other way.

## Security
- All API requests (Reddit & Hacker News) are made over HTTPS.
- The Chrome Storage area where URLs and search results are cached is not encrypted (as stated here: https://developer.chrome.com/apps/storage).

## Changes to this policy
This Privacy Policy may be updated from time to time for any reason. You are advised to consult this Privacy Policy regularly for any changes, as continued use is deemed approval of all changes.
