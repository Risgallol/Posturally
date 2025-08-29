# SlouchApp — Client‑Only Web Starter

This starter lets you put a simple posture demo **online** while keeping users' video **on their laptop**. All compute runs in the browser using MediaPipe Tasks (WASM). No uploads.

## Quick start (local)

1. **Install a static server** (pick one):
   - Python: `python3 -m http.server 5173`
   - Node: `npx serve` or `npx http-server`

2. Open the printed URL (e.g. http://localhost:5173) and click **Start camera**.

> Browsers require **HTTPS** or **localhost** for the camera.

## Deploy (pick one)

### Option A — Netlify (easy)
1. Create a free Netlify account.
2. Click **Add new site → Deploy manually**, drag this whole folder.
3. Netlify will serve it with strict security headers from `netlify.toml`.

### Option B — Vercel (from GitHub)
1. Push these files to a GitHub repo.
2. In Vercel, **New Project → Import** that repo.
3. Deploy. Vercel will apply the headers in `vercel.json`.

### Option C — GitHub Pages (manual)
1. Push to GitHub.
2. In **Settings → Pages**, choose `Deploy from a branch → main /root`.
3. Ensure HTTPS is on.

## Verify privacy

- Open DevTools → **Network** tab. After the page loads, there should be **no outgoing requests** while the camera runs (except the first-time model file download).
- You can also go offline: the service worker will keep the app working.
- Click **Stop camera** to end the stream (the webcam light turns off).

## Customize

- Edit thresholds in the UI or in `script.js` defaults.
- Replace copy in `index.html` and `privacy.html`.
- If you add analytics or crash reporting, disclose that in the privacy page.

---

Generated 2025-08-17.
