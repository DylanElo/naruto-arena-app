# Naruto Arena Team Builder

A React + Vite experience for exploring Naruto Arena rosters with energy-aware team analysis, synergy highlights, and lineup recommendations.

## Local development

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```

## Production build

Build the optimized bundle:
```bash
npm run build
```
The output is generated in `dist/`.

## GitHub Pages deployment

This repository includes a GitHub Actions workflow that publishes the static build to GitHub Pages:

- The workflow runs on pushes to `main` and on manual dispatch.
- During the build step it sets `VITE_BASE_PATH="/naruto-arena-app/"` so assets resolve correctly when hosted at `https://<username>.github.io/naruto-arena-app/`.
- Artifacts from `npm run build` are automatically uploaded and deployed to the `github-pages` environment.

To enable the site:
1. Push the repository to GitHub with a `main` branch.
2. Go to **Settings → Pages** and choose "GitHub Actions" as the source.
3. Trigger the "Deploy to GitHub Pages" workflow (push to `main` or use **Run workflow**). The published URL will appear in the workflow summary under the `github-pages` environment.
