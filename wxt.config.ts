import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type WxtViteConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	imports: false,
	manifest: {
		browser_specific_settings: {
			gecko: {
				id: "{fa784cb5-9feb-4063-a712-43c1ce2d4ba5}",
			},
		},
		host_permissions: [
			"https://api.reddit.com/*",
			"https://reddit.com/api/*",
			"https://www.reddit.com/api/*",
			"https://hn.algolia.com/api/v1/search/*",
		],
		name: "Find On Reddit + Hacker News",
		optional_permissions: ["tabs"],
		permissions: ["activeTab", "storage"],
	},
	modules: ["@wxt-dev/module-solid"],
	srcDir: "src",
	vite: () =>
		({
			plugins: [tailwindcss()],
		}) as WxtViteConfig,
});
