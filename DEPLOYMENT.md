# GitHub Pages

The current repository is `harshit201002/Birthday`. Its project-site URL is
`https://harshit201002.github.io/Birthday/` once deployed.

1. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
2. In **Settings → Secrets and variables → Actions → Variables**, optionally add
   `VITE_YOUTUBE_URL` with the YouTube URL. Leaving it unset preserves the existing
   “A special video is coming soon.” fallback. This is a public, build-time value;
   do not put credentials in it. Changing it requires another workflow run.
3. Push these source changes to `main`, or run **Deploy to GitHub Pages** from the
   Actions tab after the workflow is on GitHub. Allow GitHub's official actions
   if your repository or organization restricts actions. If the `github-pages`
   environment has deployment approvals or branch restrictions, approve the run
   or allow `main` as appropriate.

The `.github/workflows/static.yml` workflow uses Node.js LTS, npm caching, `npm ci`, `npm run build`, and the
official Pages configure/upload/deploy actions pinned to release commits. It
uploads only `dist/` as an artifact; compiled files are not committed.
It also checks that the generated HTML references compiled assets and that its
JavaScript, stylesheet, and preloaded fonts exist before uploading.

Do not use a second static-site workflow that uploads `path: '.'`: this publishes
the raw source `index.html` and causes `/src/main.jsx` and source-font 404s. Keep
the Vite source entry and font preloads in the source `index.html`; the build
rewrites these to `/Birthday/assets/` URLs in `dist/index.html`.

## Base path and local preview

Development (`npm run dev`) runs at `/`. Production builds and previews default
to `/Birthday/`, and this project's workflow explicitly builds for `/Birthday/`.

```sh
npm ci
npm run build
npm run preview
```

Open `http://localhost:4173/Birthday/` for the default build. The section targets
remain `#hero`, `#letters`, and `#surprise`; no router or 404 redirect is needed.

For root-domain or custom-domain local builds, set `PAGES_BASE_PATH=/` for both
build and preview. In PowerShell:

```powershell
$env:PAGES_BASE_PATH = '/'
npm run build
npm run preview
```

Open `http://localhost:4173/`. Remove the temporary override afterward with
`Remove-Item Env:PAGES_BASE_PATH`. For another project path, use `/REPOSITORY/`
with a trailing slash. Configure custom domains and DNS in GitHub Pages settings
before deploying that domain; this workflow does not invent a domain or CNAME.
For a future root/custom-domain deployment, also change the workflow's
`PAGES_BASE_PATH` to `/` before building and deploying.

## Assets and configuration

- Put public photos in `public/letters/` or `public/gifts/`. Build their URLs once
  using `import.meta.env.BASE_URL` plus the path without a leading slash, as in
  `src/data/gifts.js`. Consumers use that URL directly; do not prefix it again.
- Imported artwork, letter previews, local fonts, and dynamic 3D modules receive
  Vite's base path automatically. There are currently no GLB/GLTF model assets;
  the garden uses procedural geometry. Future public model URLs also need
  `import.meta.env.BASE_URL`.
- The optional final photograph still belongs at `public/letters/final-letter.jpg`.
  Its existing missing-image fallback is unchanged; no placeholder image is added.
- `.env.example` remains the local configuration template. `.env`, other private
  environment files, `node_modules/`, `dist/`, logs, and temporary files are ignored.
- Handwritten photos stay on demand; the YouTube iframe is never rendered while
  the birthday gate is locked. Deployment changes do not alter the birthday date.

Local build/preview checks do not constitute a live deployment. Confirm the
workflow succeeds and test the deployed site after enabling Pages and pushing.

References: [Vite Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages)
and [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
