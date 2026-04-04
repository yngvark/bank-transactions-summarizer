# Strict Content Security Policy (CSP)

## Context

The app is a static SPA hosted on GitHub Pages with no backend. While the attack surface is limited, a strict CSP adds defense-in-depth against XSS and code injection — particularly relevant since the app processes user-uploaded Excel files.

## Decision

Add a strict CSP via a `<meta http-equiv="Content-Security-Policy">` tag, injected only in production builds through a custom Vite plugin.

### Policy

```
default-src 'none';
script-src 'self';
style-src 'self';
img-src 'self';
font-src 'self';
connect-src 'self';
form-action 'none';
base-uri 'self';
frame-ancestors 'none';
```

### Why build-only

In dev mode, Vite injects inline `<style>` tags for CSS HMR and `@vitejs/plugin-react` adds an inline script preamble for React Fast Refresh. Both would be blocked by a strict CSP, breaking the dev experience. Since CSP in dev mode provides no security value, the plugin uses `apply: 'build'` to only inject the tag in production.

### Why meta tag instead of HTTP headers

GitHub Pages doesn't support custom HTTP response headers. The `<meta>` tag approach works identically for most directives, with two caveats:
- `frame-ancestors` is ignored in meta tags by spec (but included for documentation intent; the GitHub Pages `X-Frame-Options` header provides equivalent protection).
- `report-uri`/`report-to` directives don't work in meta tags (not needed for this project).

## Why these directives

| Directive | Value | Rationale |
|-----------|-------|-----------|
| `default-src` | `'none'` | Deny-by-default; each resource type must be explicitly allowed |
| `script-src` | `'self'` | Only allow scripts from same origin. No inline scripts exist in the production build |
| `style-src` | `'self'` | All CSS is extracted to external files by Vite. React inline `style` props use DOM API which is not governed by CSP |
| `img-src` | `'self'` | No external images or data URIs used |
| `font-src` | `'self'` | @fontsource fonts are bundled by Vite as local assets |
| `connect-src` | `'self'` | No external API calls; file reading uses FileReader (not fetch) |
| `form-action` | `'none'` | No forms submit to a URL |
| `base-uri` | `'self'` | Prevents `<base>` tag injection attacks |
| `frame-ancestors` | `'none'` | Prevents clickjacking (note: not enforced via meta tag, see above) |

## Implementation

Single custom Vite plugin in `v2/frontend/vite.config.ts` (~20 lines). No new dependencies.
