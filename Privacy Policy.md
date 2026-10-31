# Privacy Policy

Find On finds Reddit and Hacker News discussions of a URL. It has no backend server, analytics, telemetry or advertising.

## URLs and requests

Opening the popup reads the active tab's URL and searches the enabled sources. You can also enter a URL manually. Automatic search is off by default for new installations. When enabled in settings, it reads tab URLs when pages load or tabs become active, according to your preferences and site filters.

Only HTTP and HTTPS URLs without embedded usernames or passwords are searched. Browser pages such as `about:`, `chrome:` and `file:` URLs are not sent. URL fragments are removed. Query strings can be excluded in settings; if retained, they may contain information supplied by the visited site. YouTube links can be searched by video ID instead of the full URL. Hacker News queries also remove recognized tracking parameters.

Requests go directly over HTTPS to the selected providers and, when needed, the Reddit archive fallback:

- **Reddit:** `https://old.reddit.com/api/info.json`, `/search.json` and `/duplicates/<post-id>.json`. Requests include the browser's existing Reddit cookies so Reddit can use your signed-in session. Find On does not read cookie values, ask for a password, store credentials or send Reddit cookies to Hacker News or Arctic Shift.
- **Arctic Shift:** `https://arctic-shift.photon-reddit.com/api/posts/search`. If Reddit requests sign-in or verification, the extension sends the searched URL to this independent public Reddit archive. Non-exact searches may send HTTP/HTTPS and www URL variants. YouTube searches send common video URL forms. Requests omit cookies and other browser credentials. This fallback also applies to automatic searches when enabled.
- **Hacker News search:** `https://hn.algolia.com/api/v1/search`. These requests omit browser credentials and disable Algolia search analytics through the API parameter.

These providers receive the requested URL or search term and ordinary connection metadata, such as your IP address, and apply their own privacy policies. Opening a result link navigates to the linked website in your browser.

## Browser storage

- Preferences, including the automatic-search site filter, are saved in browser sync storage. Your browser may synchronize them through your browser account.
- Successful search results, their query keys and timestamps are cached in browser session storage. The default validity period is 30 minutes, configurable from zero (disabled) to 1440 minutes. The cache is bounded by entry count and size; expired entries are pruned as new results are cached. Session storage is cleared when the browser session ends.
- Reddit sign-in pause information and both Reddit and Arctic Shift rate-limit information also uses session storage so background worker restarts do not reset request limits.

URLs and results are not sent to the extension author. Browser storage is not an encrypted vault; do not treat it as secure storage for secrets.

## Permissions

`activeTab` allows the popup to read the current tab after you open it. `storage` saves settings and temporary results. Optional `tabs` permission enables automatic search; declining it still allows manual search. Host permissions are limited to old.reddit.com, hn.algolia.com and arctic-shift.photon-reddit.com. The extension does not inject scripts into visited pages or read their contents.

Firefox's installation disclosure declares browsing activity for queried URLs and website content for Reddit cookies transmitted by the browser. Removing the extension removes its settings and cached data from the local browser.

## Changes

Changes to data handling will be reflected in this policy and the project changelog.
