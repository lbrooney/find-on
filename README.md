# Find On Reddit + Hacker News

A Chrome, Edge and Firefox extension that finds discussions of the page you are viewing.

[Install for Firefox](https://addons.mozilla.org/en-US/firefox/addon/find-on-reddit-hacker-news/).
Chrome and Edge users can load the unpacked build described below. [GitHub releases](https://github.com/lbrooney/find-on/releases) also provide the identical Mozilla-signed Firefox XPI for installation or manual updates. Whether installed from AMO or GitHub, Firefox receives automatic updates through AMO.

## Reddit access

Reddit discussions work both signed in and signed out. Live results use your existing session on **old.reddit.com**, following the approach in [JeffreyCA/find-on](https://github.com/JeffreyCA/find-on). If Reddit requires sign-in or verification, the extension automatically searches [Arctic Shift’s public Reddit archive](https://github.com/ArthurHeitmann/arctic_shift/blob/master/api/README.md). Neither path needs an API key, and the extension never asks for your password.

The popup and toolbar tooltip identify archive results. Arctic Shift’s coverage can be incomplete, and archived scores and comment counts may be outdated. Exact matching uses the archive’s `url_exact` filter; non-exact searches use URL prefixes with HTTP/HTTPS and www variants. YouTube video searches try the original link and common watch, short, embedded and live URL formats, then verify each result’s video ID. Results are deduplicated and limited to 100 discussions. Arctic Shift accepts URL queries between 14 and 500 characters.

After a Reddit sign-in or verification failure, ordinary lookups use the archive for five minutes without repeatedly contacting Reddit. Sign in through **Open Reddit**, then press **Search** to bypass cached results and retry live Reddit immediately. Reddit rate-limit responses, server errors and network failures do not trigger the archive fallback. Hacker News remains available independently.

Arctic Shift requests omit credentials, are serialized to at most two starts per second, and respect the service’s own cooldown headers. A failed URL-variant lookup preserves any archive results already found and shows a partial-results warning.

The old/new Reddit setting controls where discussion links open. Live Reddit API requests use old.reddit.com; the fallback uses arctic-shift.photon-reddit.com.

## Features

- Search the current page from the popup, or enter another HTTP or HTTPS URL and press Enter.
- Fetch Reddit and Hacker News results independently, with source filtering and sorting by score, comments, age or community.
- Use exact or non-exact Reddit matching, optionally ignoring query parameters.
- Match YouTube watch, short, embedded and live links by video ID on both sources.
- Expand Reddit results with duplicate submissions, preserving available results if expansion fails.
- Optionally search when tabs load or become active, with a domain/path blocklist or allowlist.
- Show discussion or comment counts on the toolbar. A red badge indicates an incomplete lookup; its tooltip explains the problem.
- Open discussions in the current tab, a new tab or an adjacent background tab.

Automatic search is off for new installations. Enabling it requests the optional `tabs` permission; existing saved preferences are retained. Filters match a domain and its subdomains, with an optional path prefix. For example, `example.com/news` matches `www.example.com/news/article` but not `example.com/newsletter` or `notexample.com`.

Results are cached in browser session storage for 30 minutes by default. The cache is bounded, separates sources and matching modes, and shares in-flight requests between popup and automatic searches. Set the cache duration to zero to disable it. **Search** refreshes results, while respecting Reddit's rate limits. Network and server failures receive at most one retry after five seconds; automatic retries can be disabled in settings.

## Privacy

URLs are sent directly to Reddit and Hacker News search, or to Arctic Shift when Reddit requires sign-in or verification. Only Reddit requests include the browser's Reddit cookies; Hacker News and Arctic Shift requests omit credentials. The extension has no backend, telemetry or analytics. Settings use browser sync storage and may sync through your browser account. See the [privacy policy](<Privacy Policy.md>) for details.

## Development

Use **Node.js 24 or newer** and **pnpm 12.16.1**, pinned in `package.json`. The supported browsers are Chrome/Edge 120+ and Firefox 140+ (142+ on Android).

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
# Or:
pnpm dev:firefox
```

Development builds are rebuilt on change. Load `.output/chrome-mv3-dev` through **Load unpacked** on `chrome://extensions` or `edge://extensions`. In Firefox, use **Load Temporary Add-on** on `about:debugging#/runtime/this-firefox` and select `.output/firefox-mv2-dev/manifest.json`. WXT does not launch a separate browser profile; a Reddit session is optional because signed-out searches use Arctic Shift.

| Command              | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `pnpm check`         | Check formatting, lint, types and both production builds      |
| `pnpm format`        | Format source, configuration and documentation with Oxfmt     |
| `pnpm format:check`  | Check formatting without modifying files                      |
| `pnpm lint`          | Run type-aware Oxlint, failing on warnings                    |
| `pnpm lint:fix`      | Apply safe lint fixes                                         |
| `pnpm typecheck`     | Run TypeScript without emitting files (`compile` is an alias) |
| `pnpm build`         | Build `.output/chrome-mv3` for Chrome and Edge                |
| `pnpm build:firefox` | Build `.output/firefox-mv2` for Firefox                       |
| `pnpm zip`           | Package the Chrome/Edge extension                             |
| `pnpm zip:firefox`   | Package the Firefox extension and reproducible source archive |

Oxlint enables correctness, suspicious, performance, style, restriction and nursery categories, with pedantic disabled. Explicit exceptions remove conflicting export conventions, formatting rules owned by Oxfmt, and blanket restrictions on standard TypeScript/JavaScript features. Type checks, promise handling, import validation and accessibility checks remain enabled. Oxfmt also sorts imports and Tailwind classes. No test suite or test dependencies are included.

CI runs `pnpm check` on pushes and pull requests. The release workflow validates a version tag against `package.json`, runs the same checks, submits that version to AMO, then attaches the identical Mozilla-signed Firefox XPI and the Chrome, Firefox and source ZIPs to the GitHub release. Both AMO and GitHub use the same version number and add-on ID; the package has no custom `update_url`, so automatic updates come from AMO. Source archives include the lockfile and build configuration for AMO review. Tailwind scans only `src`, so rebuilding from the source ZIP produces the same extension files. Mozilla’s add-on validator may report an `innerHTML` warning in Solid’s generated template helper; the helper receives compiler-generated markup, and provider data is rendered as text.

## Publishing

The repository's encrypted `AMO_API_KEY` and `AMO_API_SECRET` Actions secrets authorize signing and updates to the existing AMO listing. The tag-triggered Release workflow uses those credentials; they are never included in the extension or source archives.

For a release, update `package.json` and `changelog.md`, commit, and push the matching `v<version>` tag. The workflow packages and submits the extension with source code and review instructions. It waits up to 15 minutes for Mozilla approval, verifies the signed download against AMO's SHA-256 hash, and publishes the same XPI on GitHub. Mozilla can require manual review; an unsigned ZIP is never published as an installable XPI. The workflow can be resumed with its **Run workflow** action and the same tag after approval, reusing the existing AMO submission.

The same operations can be run locally:

```sh
pnpm check
pnpm release:prepare
# Requires AMO_API_KEY and AMO_API_SECRET in the environment:
pnpm release:sign
# Requires GitHub CLI authentication and the pushed release tag:
pnpm release:publish
```

The normal Firefox build is the package submitted to AMO. There is no separate GitHub update channel, version suffix or self-hosted update manifest. Firefox ZIPs are unsigned build artifacts; users install `find-on-<version>-firefox.xpi` or use the AMO listing.

## Layout

- `src/lib/http.ts`: Request timeouts, retries, signed-in Reddit access and rate limiting.
- `src/lib/reddit.ts`, `src/lib/arctic-shift.ts`, `src/lib/hn.ts`: Provider endpoints, signed-out fallback and validated result parsing.
- `src/lib/search.ts`, `src/lib/cache.ts`: Shared lookup coordination and bounded session caching.
- `src/lib/options.ts`, `src/lib/url.ts`: Validated settings and URL matching.
- `src/entrypoints/background.ts`: Automatic lookups, messaging and toolbar badges.
- `src/entrypoints/popup`, `src/entrypoints/options`: SolidJS interfaces styled with Tailwind CSS.

## Credits

Forked from [AdeelH/find-on-reddit](https://github.com/AdeelH/find-on-reddit) and [JeffreyCA/find-on](https://github.com/JeffreyCA/find-on). This fork adds Firefox support and uses SolidJS, Tailwind CSS and WXT. The current Reddit endpoint and session approach was checked against JeffreyCA's updated implementation.

The settings icon is from [Open Source SVG Icons](https://opensourcesvgicons.com). Reddit and Hacker News names belong to their respective owners.
