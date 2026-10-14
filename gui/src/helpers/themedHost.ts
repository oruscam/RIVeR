/**
 * The element that carries `data-theme`, which is where every CSS custom
 * property in this app is defined.
 *
 * `App.tsx` puts `data-theme` on `.default-app-container` — a div inside
 * `<body>`, not on `:root`. CSS custom properties cascade to the subtree of the
 * element that declares them, so anything appended straight to `<body>` sits
 * OUTSIDE that scope and every `var(--…)` on it silently resolves to nothing:
 * no background, no border, no colour. Verified: identical markup gives
 * `rgba(0, 0, 0, 0)` appended to `<body>` and `rgb(20, 20, 20)` appended here.
 *
 * Floating elements created imperatively (d3 tooltips, readouts) must therefore
 * be appended HERE rather than to `<body>`. Falls back to `<body>` so callers
 * still work if the app shell has not mounted yet.
 */
export const getThemedHost = (): HTMLElement =>
  (document.querySelector('[data-theme]') as HTMLElement | null) ?? document.body;
