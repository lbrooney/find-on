import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
	imports: false,
	srcDir: "src",
	modules: ["@wxt-dev/module-solid"],
	manifest: {
		name: "Find On Reddit + Hacker News",
		minimum_chrome_version: "120",
		browser_specific_settings: {
			gecko: {
				id: "{fa784cb5-9feb-4063-a712-43c1ce2d4ba5}",
				strict_min_version: "140.0",
				data_collection_permissions: { required: ["browsingActivity", "websiteContent"] },
			},
			gecko_android: { strict_min_version: "142.0" },
		},
		host_permissions: [
			"https://old.reddit.com/*",
			"https://hn.algolia.com/*",
			"https://arctic-shift.photon-reddit.com/*",
		],
		optional_permissions: ["tabs"],
		permissions: ["activeTab", "storage"],
	},
	vite: () => ({ plugins: [tailwindcss()] }),
	zip: {
		includeSources: [
			"src/**",
			"scripts/**",
			"public/**",
			"package.json",
			"pnpm-lock.yaml",
			"tsconfig.json",
			"wxt.config.ts",
			"README.md",
			"changelog.md",
			"License.md",
			"Privacy Policy.md",
			".nvmrc",
			".oxfmtrc.json",
			".oxlintrc.json",
		],
		dotSources: true,
	},
});
