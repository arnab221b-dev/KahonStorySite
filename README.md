# Kahon · কাহন — Audio Story Sanctuary

A dreamy, soft-UI Spotify-style audio story player built as the web facade for the Bengali audio story YouTube channel **Kahon (কাহন)** (`@kahonstory`).

## Features

- **Real Channel Content**: Synced directly from [`youtube.com/@kahonstory`](https://www.youtube.com/@kahonstory) — 279+ audio stories, 39 curated playlists & podcasts, and 535+ hours of Bengali storytelling.
- **Cover-Art Ambient Backdrop**: Every story and playlist carries an extracted cover-art color palette that smoothly morphs the multi-orb ambient background as you browse or listen.
- **Spotify-Style Player**:
  - Persistent bottom playback bar with `-15s` / `+30s` skip, playback speed (`0.75x` – `2x`), bedtime sleep timer, shuffle, repeat, and queue management.
  - Saved resume positions, liked stories, and listening history stored locally in `localStorage`.
  - Toggleable **Cover Art Sanctuary** vs **Watch YouTube Video** inside the Now Playing panel, plus a full-screen Immersive Mode.
- **Palette**: `#ff9900`, `#818181`, `#454545`, `#313131`, `#181818`.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Refresh Channel Catalog

To pull the latest stories, playlists, and cover-art palettes from `@kahonstory`:

```bash
npm run sync
```

## Production Build

```bash
npm run build
```

## Automated Deployment (GitHub Pages & Hostinger Fork Workflow)

Every push to `main` (and once daily at `18:23 UTC` via [deploy.yml](.github/workflows/deploy.yml)) automatically syncs `@kahonstory`, builds `dist/`, and pushes ready-to-serve static files to the `gh-pages` branch without touching `main` (preventing fork merge conflicts).

**One-time setup on a client fork:**
1. Open the **Actions** tab in the fork and click **Enable workflows**, and ensure **Settings → Actions → General → Workflow permissions** allows **Read and write permissions**.
2. **GitHub Pages:** Set **Settings → Pages → Branch** to `gh-pages`.
3. **Hostinger:** Connect Hostinger Git Auto-Deployment (with the webhook enabled) to the `gh-pages` branch → `public_html`. Afterward, simply merge upstream changes into `main` on GitHub and Hostinger updates automatically.
