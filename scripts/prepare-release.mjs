import { mkdir, readFile, writeFile } from "node:fs/promises";

const { version } = JSON.parse(await readFile("package.json", "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(version)) {
	throw new Error("Release versions must use major.minor.patch.");
}
const changelog = await readFile("changelog.md", "utf8");
const marker = `## v${version}\n`;
if (!changelog.includes(marker)) {
	throw new Error(`Missing changelog for ${version}.`);
}
const notes = changelog.split(marker)[1].split("\n## ")[0].trim();
const repo = "https://github.com/lbrooney/find-on";
const releaseNotes = `## Firefox installation\n\nInstall \`find-on-${version}-firefox.xpi\` from this release or use [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/find-on-reddit-hacker-news/). Both distribute the identical Mozilla-signed version **${version}** with the same add-on ID and settings. Automatic Firefox updates come from AMO; GitHub also provides signed packages for manual installation or updates.\n\nThe Firefox ZIP is an unsigned build artifact for review. Use the signed XPI for installation.\n\n## Changes\n\n${notes}\n\n## Compatibility\n\nChrome/Edge 120+, Firefox 140+, Firefox for Android 142+. Reddit searches work signed in or through Arctic Shift's public archive when signed out.\n\n[Source and build instructions](${repo}/tree/v${version})\n`;
await mkdir(".output", { recursive: true });
await writeFile(".output/release-notes.md", releaseNotes);
await writeFile(
	".output/amo-metadata.json",
	`${JSON.stringify(
		{
			version: {
				license: "MIT",
				release_notes: { "en-US": notes },
				approval_notes:
					"Build with Node.js 24 and pnpm 12.16.1: corepack enable; pnpm install --frozen-lockfile; pnpm build:firefox. The output is .output/firefox-mv2. Solid's template helper uses compiler-generated static HTML; API data is rendered as text. Reddit uses existing session cookies; signed-out searches use Arctic Shift without credentials. Automatic searching is opt-in. The identical signed XPI is mirrored to GitHub; all installed copies receive automatic updates from AMO.",
			},
		},
		undefined,
		2,
	)}\n`,
);
process.stdout.write(`Prepared release metadata for v${version}.\n`);
