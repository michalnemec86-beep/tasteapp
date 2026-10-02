# Pivník installation

`/install` is public and works before sign-in. Signed-in users can find it in the mobile menu and the desktop download icon; the login screen also links to it. Android uses `beforeinstallprompt` when available and otherwise browser instructions. iPhone uses Safari's Add to Home Screen flow. The desktop QR code is generated locally from the current origin and contains only `/install`.

The manifest's stable identity and start URL are `/`. The same application and responsive views run on both platforms; users sign in with their existing account. Installing does not bypass invitations or catalog permissions.

`public/sw.js` stores only the public offline document, its script and app icons. It never stores authenticated HTML, RSC responses, API responses, auth tokens, tasting writes or personalized images. Navigation uses the network with an offline fallback only for a failed network request. Server responses and statistics remain fresh. Worker updates do not force a reload of a filled form.

When offline, a visible banner explains that saving needs a connection. Captured form submissions and internal links are stopped so filled forms can remain open. There is no offline write queue. The offline document retries the original address after connection returns.

Verification: `node --test tests/*.test.mjs`, `npm run build`, and ESLint on the changed files. HTTP checks verify public install assets, service-worker headers, and continued sign-in requirements for catalog pages. Worker tests simulate loss and return of the network and verify the cache allowlist.

Device acceptance checks (require actual phones): install from Chrome on Android and Safari on iPhone; launch from the icon; sign in; navigate and use Back; open and close a tasting modal with the keyboard visible; leave a filled form open while going offline; reconnect and save; relaunch after an application update. iPhone may have a separate sign-in session in the installed app. Installation prompts and wording depend on browser and OS; manual instructions always remain available.
