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
- It derives the `VITE_BASE_PATH` automatically from the repository name (for example `/naruto-arena-app/`) and normalizes any custom input you provide during a manual dispatch so there is exactly one leading and trailing slash.
- Artifacts from `npm run build` are automatically uploaded and deployed to the `github-pages` environment.

To enable the site:
1. Push the repository to GitHub with a `main` branch.
2. Go to **Settings → Pages** and choose "GitHub Actions" as the source.
3. Trigger the "Deploy to GitHub Pages" workflow (push to `main` or use **Run workflow**). Optional: provide a custom base path input if your Pages site needs a different subfolder (the workflow will normalize your input).
4. After the workflow finishes, the published URL will appear in the workflow summary under the `github-pages` environment.
