# Scrivener Stat Visualizer

Local-first web app to visualize Scrivener writing statistics. Files are processed in your browser.

## Features
- Accepts Scrivener project folders (.scriv) or exports: Writing History (.txt) and Project Statistics (.csv)
- Summary stats: totals, averages, longest/current streak, most productive day, writing rate
- Visualizations: monthly progress with streak view, calendar heatmap (calendar/academic), streak distribution, weekday breakdown

## Usage
1. Drop a .scriv project folder or export file into the app.
2. If the project metadata does not include stats, export Writing History or Project Statistics and drop the file.

### Export from Scrivener
- Writing History: Project > Writing History... > Export
- Project Statistics: Project > Project Statistics... > Word counts per day > Export

## Development
npm install
npm run dev
npm run build
npm run preview

## GH Pages
Set the base path for your repo and deploy:
VITE_BASE_PATH=/scrivener-stats/ npm run build
npm run deploy
