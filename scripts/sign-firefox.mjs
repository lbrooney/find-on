import { spawn } from "node:child_process";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const API = "https://addons.mozilla.org/api/v5/";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const issuer = process.env.AMO_API_KEY;
const secret = process.env.AMO_API_SECRET;
if (!issuer || !secret) {
	throw new Error("AMO_API_KEY and AMO_API_SECRET must be configured.");
}

function token() {
	const now = Math.floor(Date.now() / 1000);
	const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
	const payload = Buffer.from(
		JSON.stringify({ iss: issuer, jti: randomUUID(), iat: now, exp: now + 60 }),
	).toString("base64url");
	const data = `${header}.${payload}`;
	return `${data}.${createHmac("sha256", secret).update(data).digest("base64url")}`;
}

async function amo(path, options = {}) {
	const response = await fetch(`${API}${path}`, {
		...options,
		headers: {
			Authorization: `JWT ${token()}`,
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		signal: AbortSignal.timeout(30_000),
	});
	if (response.status === 404) {
		return undefined;
	}
	if (!response.ok) {
		throw new Error(`AMO request failed with HTTP ${response.status}: ${await response.text()}`);
	}
	return response.json();
}

async function submit() {
	await new Promise((resolve, reject) => {
		const child = spawn(
			"pnpm",
			[
				"dlx",
				"web-ext@10.8.0",
				"sign",
				"--channel",
				"listed",
				"--source-dir",
				".output/firefox-mv2",
				"--artifacts-dir",
				".output/signing",
				"--upload-source-code",
				`.output/find-on-${version}-sources.zip`,
				"--amo-metadata",
				".output/amo-metadata.json",
				"--approval-timeout",
				"900000",
				"--no-config-discovery",
				"--no-input",
			],
			{
				stdio: "inherit",
				env: { ...process.env, WEB_EXT_API_KEY: issuer, WEB_EXT_API_SECRET: secret },
			},
		);
		child.on("error", reject);
		child.on("exit", (code) =>
			code === 0 ? resolve() : reject(new Error(`web-ext submission exited with ${code}.`)),
		);
	});
}

const manifest = JSON.parse(await readFile(".output/firefox-mv2/manifest.json", "utf8"));
const { gecko } = manifest.browser_specific_settings;
if (manifest.version !== version || gecko.update_url) {
	throw new Error("The Firefox package must use the release version and AMO updates.");
}
const addonPath = `addons/addon/${encodeURIComponent(gecko.id)}/`;
const versionPath = `${addonPath}versions/${version}/`;
let release = await amo(versionPath);
if (!release) {
	await submit();
	release = await amo(versionPath);
}
if (release?.channel !== "listed") {
	throw new Error(`Unexpected AMO channel for ${version}.`);
}
await writeFile(
	".output/firefox-signing-status.json",
	`${JSON.stringify({ version, status: release.file.status, editUrl: release.edit_url }, undefined, 2)}\n`,
);
process.stdout.write(`AMO ${version}: ${release.file.status}\n`);
const privacy = await readFile("Privacy Policy.md", "utf8");
await amo(addonPath, {
	method: "PATCH",
	body: JSON.stringify({ privacy_policy: { "en-US": privacy } }),
});
if (release.file.status !== "public") {
	throw new Error(
		`Mozilla has not approved ${version} yet. The submission is preserved; rerun after approval.`,
	);
}
// Never attach the AMO authorization header to the signed package download.
const response = await fetch(release.file.url, { signal: AbortSignal.timeout(60_000) });
if (!response.ok) {
	throw new Error(`Signed download failed with HTTP ${response.status}.`);
}
const bytes = Buffer.from(await response.arrayBuffer());
const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
if (hash !== release.file.hash) {
	throw new Error("Signed Firefox package hash does not match AMO.");
}
await writeFile(`.output/find-on-${version}-firefox.xpi`, bytes);
process.stdout.write(`Downloaded Mozilla-signed Firefox ${version}.\n`);
