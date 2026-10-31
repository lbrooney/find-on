import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";

const repository = "lbrooney/find-on";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const tag = `v${version}`;
const artifacts = ["chrome.zip", "firefox.zip", "sources.zip", "firefox.xpi"].map(
	(suffix) => `.output/find-on-${version}-${suffix}`,
);
await Promise.all(artifacts.map(async (file) => access(file)));
function gh(args) {
	const result = spawnSync("gh", args, { stdio: "inherit" });
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(`GitHub command failed (${result.status}).`);
	}
}
const existing = spawnSync("gh", ["release", "view", tag, "--repo", repository], {
	stdio: "ignore",
});
if (existing.status !== 0) {
	gh([
		"release",
		"create",
		tag,
		"--repo",
		repository,
		"--verify-tag",
		"--draft",
		"--title",
		tag,
		"--notes-file",
		".output/release-notes.md",
	]);
}
gh(["release", "upload", tag, "--repo", repository, "--clobber", ...artifacts]);
gh([
	"release",
	"edit",
	tag,
	"--repo",
	repository,
	"--draft=false",
	"--latest",
	"--notes-file",
	".output/release-notes.md",
]);
process.stdout.write(`Published https://github.com/${repository}/releases/tag/${tag}\n`);
