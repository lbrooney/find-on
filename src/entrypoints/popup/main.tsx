import { render } from "solid-js/web";

import App from "./App";

// biome-ignore lint/style/noNonNullAssertion: must exist
render(() => <App />, document.getElementById("root")!);
