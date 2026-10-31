# Changelog

## v2.1.0

- Publish one Mozilla-signed Firefox package on AMO and GitHub using the same version and add-on ID, with automatic updates through AMO and repeatable release/signing scripts.

- Add automatic signed-out Reddit search through Arctic Shift, with exact/prefix URL matching, common YouTube variants, archive labels and independent rate limiting. No API key or Reddit account is needed for archive results.

- Restore Reddit lookups through authenticated old.reddit.com JSON endpoints, including duplicate submissions.
- Explain sign-in, verification, timeout, invalid response and rate-limit failures in the popup while preserving results from the other source.
- Share requests through the background worker, deduplicate in-flight searches, and bound session caching by source, search mode, age and size.
- Honor Reddit cooldown headers and cap automatic Reddit traffic. Retry transient failures at most once after five seconds.
- Prevent stale background requests from updating badges after tab navigation. Keep error badges and partial-result tooltips accurate.
- Fix popup searches when options change, Enter-key submission, unsupported URLs and empty-result feedback.
- Use URL parsing for YouTube IDs and domain/path filters, retaining leading dashes in video IDs and matching subdomains safely.
- Simplify the popup and options UI, share result rendering, validate saved settings and make automatic search opt-in for new installations.
- Update all direct dependencies to current stable releases, including WXT 0.21, Vite 8, TypeScript 7, Solid 1.9 and Tailwind 4.3. Require Node 24 and pin pnpm 12.
- Replace Biome with Oxfmt and type-aware Oxlint, enable non-pedantic rule categories, and remove unused dependencies and API types.
- Update Firefox permission disclosures, documentation, editor recommendations, CI and release packaging. No tests or test dependencies were added.

## v2.0.0

- Add support for Firefox.
  - Previously this was not possible as Firefox does not support the Sandbox entrypoint the extension used for templating.
- Replaced JQuery, Bootstrap, and Handlebars with SolidJS and TailwindCSS.
- Fetch Reddit and Hacker News posts simultaneously.
- Replace local storage with session storage for cache.
- Add option toggle between blacklist or whitelist for autoload.
- Add option to choose which sources to search by default.
- Add option to filter by source in the popup.
- Reduce host permissions to just what is required for fetching from APIs.
- Entering URLs is now done by individual inputs per entry rather than a textbox.
- Make `tabs` permission optional and upon attemping to enable autoload user will be prompted for permission.
- Autoload now only runs on `http` and `https` urls.
- Use the [WXT](https://wxt.dev) framework to speed up dev and improve DX.
- Convert project from JavaScript to TypeScript.
- Optimize and simplify some logic.

## v1.7.1:

- Add build script
- Support caching on HN results
- Fix "No results found" message not showing in popup
- Update options page text

## v1.7.0:

- Hacker News integration

## v1.6.1:

- Make the options page dark themed, consistent with the popup (https://github.com/AdeelH/find-on-reddit/pull/51)
  - Thanks nkmathew for the suggestion!
- Add option for opening tab in background next to current tab instead of at the end (https://github.com/AdeelH/find-on-reddit/pull/52)
  - Thanks nkmathew for the suggestion!
- Fix problem w/ count of other kind of search not showing up plus general improvements (https://github.com/AdeelH/find-on-reddit/pull/53)
- Add new option to do both exact and non-exact search with auto-search (https://github.com/AdeelH/find-on-reddit/pull/54)
- Update dependencies (https://github.com/AdeelH/find-on-reddit/pull/56)

## v1.5.8:

- Fix a bug causing links to not open in the same tab.

## v1.5.6:

- Add option to show comment count instead of post count on extension icon when
  using auto-search.
- Update to manifest v3.
- Code improvements.

## v1.5.5:

- Can now find even more results (in some cases) by using the /duplicates
  API endpoint. (Thanks Droyk for the suggestion!)
- Can now find even more results (in some cases) by omitting the URL protocol
  when doing a fuzzy search.
- Fix bug that cause the popup to close after opening a link using ctrl + click.
  (Thanks Droyk for the report!)
- Minor bug fixes.

## v1.5.4:

- Update Handlebars.js to 4.7.7 as per https://github.com/advisories/GHSA-f2jv-r9rf-7988.

## v1.5.2:

- Fix bug in ctrl/cmd/shift/alt+click behavior. (Thanks NovaDev94 for the report!)
- Minor improvements to the options page.

## v1.5.0:

- Updated Handlebars.js to latest version to
  include recently released security patch.
- Fixed bug that caused the popup size/zoom to change on when a hyperlink was
  clicked (https://github.com/AdeelH/find-on-reddit/issues/17,
  thanks nkmathew for the report and debugging help).
- Fixed bug that sometimes caused the search results to not render.
- Improved ajax error handling.
- Minor fixes and improvements.

## v1.4.8:

- Added option to make all links point to old.reddit.com. Enabled by default.

## v1.4.7:

- UI fixes and improvements

## v1.4.5:

- added option to sort search results
  - can sort on score, comments, age and
    subreddit
  - default sorting preference can be set
    in the options
- minor improvements

## v1.4.4:

- minor fixes and improvements

## v1.4.3:

- bug fixes

## v1.4.1:

- reduced extension size
- added 'exact match' option to
  toggle between search and info
  API endpoints
- default options for search (exact matching,
  query-string, YT handling) can now be set
  on the options page
- added option to allow automatic non-exact
  search if exact search returns 0 results
  (default: enabled)
- added option to allow automatic retry in
  case of server/network error
  (default: enabled)
- both exact and non-exact search results
  are now cached for each URL
  simultaneously
- UI improvement: toggling the checkboxes
  in the popup automatically initiates
  the search without the user needing to
  press the search button
- UI improvement: automatically uncheck
  'ignore query string' if YT video detected
- UI improvement: clear old badge on
  URL update
- added option to post/repost link to Reddit
  from the popup
- other fixes and improvements

## v1.3.2:

- fixed bug in caching implementation

## v1.3.1:

- added auto-search feature
- added options page
- minor fixes and improvements

## v1.2.1:

- ignore query-string by default
- workaround for leading dashes in YT video
  IDs being interpreted as boolean NOT by
  Reddit search
- minor fixes and improvements
