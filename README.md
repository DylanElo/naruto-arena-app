# Naruto Arena Team Builder

A modern, interactive team builder application for [Naruto Arena](https://naruto-arena.net), built with React and Vite. It features real-time team analysis, synergy recommendations, and smart counter-building logic.

## 🌟 Features

- **Team Builder**: Drag-and-drop or click to build 3-ninja teams.
- **Smart Analysis**: Automatic evaluation of team roles (DPS, Tank, Support, Control) and mechanics.
- **Synergy Recommendations**: Suggests partners that synergize with your selected characters.
- **Counter Picker**: Analyze enemy teams and find the best counters based on game mechanics.
- **Structured Data Engine**: Powered by a robust `skill_effects.json` database of 449+ characters.
- **Energy Management**: Visualizes energy cost distribution to prevent resource bottlenecks.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS
- **Data Logic**: Custom Knowledge Engine (No regex parsing!)
- **Testing**: Vitest

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- NSWag (if generating API clients, optional)

### Local Development

1. **Install dependencies:**
   ```bash
   npm ci
   ```

2. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 to view the app.

3. **Run tests:**
   ```bash
   npm test
   ```

## 📦 Deployment

This project is configured for **automatic deployment to GitHub Pages** via GitHub Actions.

### How it Works
1. Push changes to the `master` or `main` branch.
2. The `.github/workflows/deploy.yml` action automatically builds the app.
3. The build is deployed to the `gh-pages` branch.

### Manual Setup (One-time)
If the site doesn't appear live:
1. Go to repository **Settings** → **Pages**.
2. Under "Source", ensure **GitHub Actions** is selected.

The live site will be available at: `https://<username>.github.io/naruto-arena-app/`

## 🏗️ Architecture

### Core Engines

1. **Knowledge Engine** (`src/utils/knowledgeEngine.js`)
   - The "brain" of the application.
   - Loads structured data from `src/data/skill_effects.json`.
   - Provides clean character profiles with mechanics (stun, heal, pierce, etc.).

2. **Recommendation Engine** (`src/utils/recommendationEngine.js`)
   - Analyzes team composition.
   - Calculates synergy scores.
   - Suggests optimal teammates.

3. **Skill Effects Generator** (`scripts/generate_skill_effects.js`)
   - Node.js script to regenerate `skill_effects.json` from raw `characters.json`.
   - Run `node scripts/generate_skill_effects.js` if you modify character data.

## 📂 Project Structure

```
src/
├── components/     # React UI components
├── data/          # JSON data sources
│   ├── characters.json      # Raw game data
│   └── skill_effects.json   # Generated structured data
├── engine/        # Core game simulation logic
├── utils/         # Helper logic (engines)
│   ├── knowledgeEngine.js   # Character analysis
│   └── recommendationEngine.js # Team building logic
└── App.jsx        # Main application entry
```

## 🤝 Contributing

1. **Generate Data**: If you update `characters.json`, always run the generation script to update skill effects.
2. **Test**: Run `npm test` before pushing to ensure logic integrity.
