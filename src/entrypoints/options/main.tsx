import { render } from 'solid-js/web';

import App from './App';

// biome-ignore lint/style/noNonNullAssertion: mount
render(() => <App />, document.getElementById('root')!);
