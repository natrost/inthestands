# In the Stands — site code

Custom code for [inthestands.co](https://www.inthestands.co) (Webflow), served via jsDelivr.

## league-landing/

List view + map view for the league landing pages (`/mls`, `/mlb`, `/nwsl`).

- `league-landing.js` / `league-landing.css` — the feature. D3 and the map shapes load only when someone opens the map.
- `photos.json` — stadium photos per team slug (from the Stadium Images CMS collection).
- `test-*.html` — local test pages that mimic the Webflow markup. Run `python3 -m http.server -d league-landing` and open `/test-mls.html`.

### Webflow setup (per league page)

1. **Collection List Wrapper** → custom attribute `data-its-league` = `MLS` / `MLB` / `NWSL`.
2. **Collection Item** → custom attributes bound to Overview CMS fields:
   `data-its-team` (Team Name with City), `data-its-slug` (Slug), `data-its-stadium` (Ballpark/Field),
   `data-its-city` (City), `data-its-opened` (Opened), `data-its-division` (Division),
   `data-its-lat` (Latitude), `data-its-lng` (Longitude).
3. Page settings → custom code (before `</body>`):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/natrost/inthestands@v0.1.0/league-landing/league-landing.css">
<script src="https://cdn.jsdelivr.net/gh/natrost/inthestands@v0.1.0/league-landing/league-landing.js" defer></script>
```

The original CMS list stays in the HTML (SEO, no-JS fallback) and is hidden by the script.
Add `#map` to the URL to open straight to the map.

### Releasing a change

Commit, then tag a new version (`git tag v0.1.1 && git push --tags`) and bump the version in the Webflow custom code.
jsDelivr caches tagged versions permanently, so each release needs a new tag.
