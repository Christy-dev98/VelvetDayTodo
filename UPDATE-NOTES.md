# Velvet Day - integrated update

This folder is a complete updated snapshot based on the uploaded `VelvetDay-main.zip`.

## What changed
- Replaced feature modules so they use the current HTML forms and containers.
- Replaced `app.js`, `navigation.js`, `theme.js`, `search.js`, `init.js`, and `pwa.js` with a consistent API and initialization flow.
- Fixed service-worker cache paths (`checklists.js` spelling) and added `app.js` to the app shell cache.
- Updated `index.html` script order so core app state exists before feature initialization.
- Included the corrected dark-plum app icons and favicon.
- Included the current main and responsive stylesheets used during this work.

## Publishing
Upload the contents of this folder to the root of the GitHub Pages repository, preserving the `css`, `js`, and `assets/icons` folders. Commit and push. After deployment, unregister the old service worker once and hard-refresh the site.

## Important notes
- Keep browser storage data in mind before testing destructive actions. The app uses browser localStorage; deleting browser site data deletes locally saved planner content.
- Browser notifications can be delivered while the page is open. The browser may suspend timers when the app is closed; this implementation does not provide a server-side push notification service.
