# 📊 Scrivener Stat Visualizer

A beautiful, privacy-focused web application to visualize your Scrivener writing statistics. Track your progress, analyze your writing habits, and stay motivated with detailed insights and charts.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Privacy](https://img.shields.io/badge/privacy-100%25%20local-green.svg)

## ✨ Features

- 📈 **Interactive Charts**: Monthly progress, daily streaks, and productivity trends
- 🔥 **Streak Tracking**: Visualize your writing consistency with heatmaps and streak analysis
- 📅 **Calendar Views**: Toggle between calendar year and academic year views
- 🌓 **Dark/Light Mode**: Comfortable viewing in any lighting condition
- 🖨️ **Print-Optimized**: Generate clean A4 reports of your statistics
- 🔒 **100% Private**: All data processing happens locally in your browser - nothing is uploaded

## 🚀 Quick Start (For Users)

### Option 1: Use Online (Recommended)
Simply visit the hosted version at: **https://[your-github-username].github.io/scrivener-stats/**

### Option 2: Run Locally

**Prerequisites:** Node.js (v18 or higher)

1. **Download or clone this repository**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## 📥 How to Export Your Scrivener Data

This tool supports two export formats from Scrivener:

### Method 1: Writing History (Recommended)
Best for detailed daily statistics including words added, deleted, and net change.

1. Open your Scrivener project
2. Go to **Project** → **Writing History...**
3. Click the **Export** button
4. Save the `.txt` file

### Method 2: Project Statistics
Useful for total word count tracking over time.

1. Open your Scrivener project
2. Go to **Project** → **Project Statistics...**
3. Switch to the **Word counts per day** tab
4. Click **Export...** and save as `.csv`

Once you have your export file, simply drag and drop it into the application or click to browse and select it.

## 📊 What You'll See

### Statistics Cards
- **Total Words**: Your cumulative writing output
- **Average Words/Day**: Mean productivity on active writing days
- **Longest Streak**: Maximum consecutive days of writing
- **Writing Days**: Total number of active writing sessions
- **Most Productive Day**: Your personal record for words in a single day
- **Writing Rate**: Percentage of days with writing activity

### Charts & Visualizations
- **Monthly Progress**: Bar chart showing words written per month with streak overlays
- **Writing Consistency**: Calendar heatmap with toggle between calendar/academic years
- **Streak Distribution**: Breakdown of your writing streaks by length

## 🛠️ For Developers

### Tech Stack
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool with HMR
- **Tailwind CSS 3** - Styling
- **Recharts** - Data visualization
- **PapaParse** - Robust CSV parsing

### Project Structure
```
scrivener-stat-visualizer/
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard layout
│   ├── CalendarHeatmap.tsx
│   ├── DailyProgressChart.tsx
│   ├── FileUpload.tsx
│   └── ...
├── services/
│   └── analysis.ts      # Data parsing and statistics
├── types.ts             # TypeScript interfaces
├── App.tsx              # Root component
└── index.tsx            # Entry point
```

### Development Commands

```bash
# Install dependencies
npm install

# Run development server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Key Implementation Details

**Data Processing**
- All dates handled in UTC for consistency
- Supports both TSV (Writing History) and CSV (Project Statistics) formats
- Robust parsing with PapaParse for complex CSV files
- Streak calculation counts all activity days (including editing/deletion)

**Performance**
- Memoized chart data calculations
- Responsive design optimized for desktop and mobile
- Efficient re-renders with React hooks

**Privacy**
- Zero server-side processing
- No analytics or tracking
- Files processed entirely in browser memory
- No data persistence (refresh clears everything)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built for writers using [Scrivener](https://www.literatureandlatte.com/scrivener/overview) by Literature & Latte.

---

**Questions or Issues?** Open an issue on GitHub or contact [your contact info].
