# Deployment Guide - Naruto Arena Team Builder

## 🚀 Automatic Deployment Setup

Your app is now configured to automatically deploy to GitHub Pages whenever you push changes to the `main` branch.

## 📋 One-Time Setup Steps

### 1. Push the New Configuration

Run these commands to push the deployment configuration:

```powershell
cd "c:\Users\dylan\OneDrive\Documents\Naruto Arena\naruto-arena-app"
git add .
git commit -m "Configure GitHub Pages deployment with GitHub Actions"
git push origin main
```

### 2. Enable GitHub Pages in Repository Settings

1. Go to your repository: https://github.com/Dyllo/naruto-arena-app
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select:
   - Source: **GitHub Actions**
4. Click **Save**

### 3. Wait for Deployment

- Go to the **Actions** tab in your repository
- You'll see the "Deploy to GitHub Pages" workflow running
- Wait for it to complete (green checkmark ✅)
- Deployment typically takes 2-5 minutes

## 🌐 Your Live App

Once deployed, your app will be available at:

**https://dyllo.github.io/naruto-arena-app/**

## 🔄 Future Deployments

Every time you push to the `main` branch, the app will automatically:
1. Build the production version
2. Deploy to GitHub Pages
3. Be live within minutes

No manual steps required!

## 📝 Making Updates

```powershell
# Make your code changes, then:
git add .
git commit -m "Your update message"
git push origin main

# Wait 2-5 minutes and your changes will be live!
```

## ✅ What Was Configured

- ✅ **Vite base path**: Set to `/naruto-arena-app/` for correct routing
- ✅ **GitHub Actions workflow**: Automatic build and deployment
- ✅ **Build optimization**: Production-ready builds with minification

## 🔧 Troubleshooting

**Deployment failed?**
- Check the Actions tab for error messages
- Ensure `npm ci` and `npm run build` work locally
- Verify GitHub Pages is enabled in Settings

**App shows 404?**
- Confirm GitHub Pages source is set to "GitHub Actions"
- Check that the workflow completed successfully
- Wait a few minutes for DNS propagation

**Assets not loading?**
- Verify `base: '/naruto-arena-app/'` is in `vite.config.js`
- Ensure all asset paths are relative, not absolute
