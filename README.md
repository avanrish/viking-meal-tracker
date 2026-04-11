# Viking Meal Tracker

Chrome extension for rating and taking notes on meals from [Kuchnia Vikinga](https://kuchniavikinga.pl) directly on their dashboard.

## Features

- **Star ratings (1-5)** on every meal card in the daily view and the meal swap view
- **Notes** via a popover — click the pen icon, type, auto-saves on typing
- **Color-coded left border** on rated meals (red/orange/yellow/light green/green for 1-5)
- **Searchable history** in the extension popup with filters by rating, category, and sort options
- **CSV import/export** — migrate data from Google Sheets or back it up
- Works across day changes and the meal swap modal (MutationObserver picks up DOM updates)

## Install

1. Clone or download this repo
2. Run `pnpm install` and `pnpm build`
3. Open `chrome://extensions/`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** and select the `dist` folder

## CSV Import

The importer expects this format:

```
"ID","Name","Category","Rating","Notes","First Rated","Last Updated"
"keto-carbonara","Keto Carbonara","","5","","2026-04-09","2026-04-09"
```

A `data.csv` file is included as a starting point. Import it via the extension popup under **Settings > Import CSV**.

## Development

```
pnpm install              # Install dependencies
pnpm build            # Build to dist/
```

After making changes, run `pnpm build` and reload the extension in Chrome.

## Project Structure

```
manifest.json            # Manifest V3
content/
  content.js             # Content script — finds meal cards, injects stars + notes
  content.css            # Styles for injected UI
popup/
  popup.html/js/css      # Extension popup — history, search, filters, settings
lib/
  storage.js             # CRUD on chrome.storage.local, CSV import/export, similarity matching
assets/icons/            # Extension icons (16, 48, 128px)
vite.config.js           # Vite build config — bundles JS as IIFE, copies static files to dist/
```

## Data Storage

All data is stored locally in `chrome.storage.local`. Nothing is sent to any server.
