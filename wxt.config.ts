import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type WxtViteConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	imports: false,
	srcDir: "src",
	modules: ["@wxt-dev/module-solid"],
	manifest: {
		name: "Find On - Reddit + Hacker News",
		permissions: ["activeTab", "tabs", "storage"],
		host_permissions: ["http://*/*", "https://*/*"],
		browser_specific_settings: {
			gecko: {
				id: "{fa784cb5-9feb-4063-a712-43c1ce2d4ba5}",
			},
		},
	},
	vite: () =>
		({
			plugins: [tailwindcss()],
		}) as WxtViteConfig,
});
