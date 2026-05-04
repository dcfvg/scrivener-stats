# Scrivener Stats

A standalone, privacy-first web application to visualize your Scrivener writing statistics. All data is processed locally in your browser — nothing is ever uploaded or shared.

![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)

## Features

- **Daily progress chart** — word count over time with cumulative curve
- **Calendar heatmap** — writing activity by day, with academic-year view
- **Weekday distribution** — discover your most productive days of the week
- **Streak analysis** — longest streak, current streak, streak length distribution
- **Key statistics** — total words, average words per writing day, productivity rate
- **Drag-and-drop** — drop a `.scriv` project folder or an export file directly
- **URL loading** — paste a CSV URL in the interface or use the `?path=` parameter to share a pre-loaded link
- **Offline-ready PWA** — installable in Chrome/Edge, works without a network connection

## Supported formats

| Format | How to export from Scrivener |
|--------|------------------------------|
| **Writing History (TSV)** | Project → Writing History… → Export |
| **Project Statistics (CSV)** | Project → Project Statistics… → Word counts per day → Export |
| **Scrivener project folder** | Drop the entire `.scriv` folder — the app auto-detects the stats file |

## Usage

### Online

Visit the hosted version: **https://dcfvg.github.io/scrivener-stats/**

### Load your data

Three ways to get your stats into the app:

1. **Drag and drop** a `.scriv` project folder or an exported file onto the upload zone.
2. **Paste a URL** pointing to a publicly accessible CSV/TSV file in the URL input field.
3. **Share a pre-loaded link** by appending `?path=<url>&label=<name>` to the app URL.

### Run locally

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/dcfvg/scrivener-stats.git
cd scrivener-stats
npm install
npm run dev        # dev server at http://127.0.0.1:3000
npm run build      # static build → dist/
npm run preview    # preview the build at http://127.0.0.1:4678
```

### Local server mode (optional)

`npm run back` starts a local preview server and generates a `server-config.json` that auto-loads a CSV from a companion [scrivener-api](../scrivener-api) service. This is only useful for local automation; the static build works independently.

## Privacy

All parsing and computation happens entirely in your browser using the [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API) and [PapaParse](https://www.papaparse.com/). No data leaves your device.

## Tech stack

- [React 19](https://react.dev/) + TypeScript
- [Vite 6](https://vitejs.dev/)
- [Tailwind CSS 3](https://tailwindcss.com/)
- [Recharts](https://recharts.org/) — charts
- [PapaParse](https://www.papaparse.com/) — CSV/TSV parsing
- [Heroicons](https://heroicons.com/) — icons

## License

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for details.
