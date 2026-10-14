# E07-T01 production audit — 14 October 2026

Production build passed. The birthday date, gift data, original letter photos, garden design, one-time individual-petal bloom, continuous breeze, six-envelope interactions, and birthday gate were preserved.

## Measured results

| Run | Performance | Accessibility | Best practices | SEO | FCP | LCP | CLS | Lab TTI | TBT | Initial transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| before mobile | 70 | 96 | 100 | 82 | 3.58s | 5.52s | 0 | 6.00s | 162 ms | 2,612,337 B |
| after mobile | 95 | 100 | 100 | 91 | 1.75s | 2.35s | 0 | 3.90s | 167.5 ms | 508,025 B |
| before desktop | 96 | 96 | 100 | 82 | 0.90s | 1.15s | 0 | 1.26s | 10 ms | 2,611,989 B |
| after desktop | 100 | 100 | 100 | 91 | 0.40s | 0.48s | 0 | 0.49s | 0 ms | 632,821 B |

Mobile transfer decreased 80.6%; desktop decreased 75.8%. These are observed navigation resources, not the total size of all files in dist. Desktop loads a larger responsive illustration than mobile. No handwritten photo or YouTube player was fetched on the initial locked page.

**Target verdict:** LCP below 2.5 seconds was achieved on both profiles. Desktop is below three seconds for FCP, LCP, and lab TTI. Mobile FCP and LCP are below three seconds, but lab TTI is 3.90s; the broad mobile under-three-second usability target is **not fully achieved**. The deferred WebGL runtime and initialization remain the main bottleneck. The intentional flower entrance still runs for approximately 4.6 seconds after scene readiness; load metrics do not imply that the cinematic sequence has finished.

**INP:** No field INP is available. Lighthouse navigation does not provide a representative interaction-based INP. Separate, unthrottled trusted keyboard/letter-reader interaction samples had a maximum Event Timing duration of 72 ms. This is a lab sample, not field INP or a guarantee for physical phones.

## Method and reproduction

Before measurements were captured from the unchanged production build, before optimizations. After measurements use the final production output, including the tablet scroll-indicator spacing correction. Raw Lighthouse JSON, precise timestamps, environment, throttling, resource requests, and audit details are retained beside this report. summary.json contains exact bytes, timings and hashes.

- Build: npm run build; serve with npm run preview -- --host 127.0.0.1 --port 4173.
- Lighthouse 13.5.0 CLI, Chrome 154 headless, local production preview. Only performance, accessibility, best-practices, and SEO categories were requested.
- Mobile: default simulated Slow 4G, 150 ms RTT, 1638.4 Kbps throughput, CPU slowdown 4x, 412×823 emulation at DPR 1.75.
- Desktop: desktop preset, 40 ms RTT, 10240 Kbps throughput, CPU slowdown 1x, 1350×940 at DPR 1.
- Navigation audits were run sequentially with browser storage reset; no browser automation ran concurrently. Same machine/browser and preview service were used before and after. Results are individual lab runs, not field percentiles or a multi-run statistical study.
- CLI shape: npm exec --yes --package lighthouse -- lighthouse http://127.0.0.1:4173 --port=9223 --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path=<output-path> --quiet. Add --preset=desktop for desktop.
- Lighthouse was obtained through npm's temporary cache; it was not added to project dependencies. No large testing framework was installed.
- Browser checks used native Chrome DevTools Protocol, production React commit instrumentation, trusted keyboard events, and frame/resource counters. GPU renderer was ANGLE Direct3D11 on AMD Radeon hardware. Device emulation is not physical-device testing.
- Existing package scripts had no lint or test commands; none were invented. Temporary Node logic/browser harnesses exercised actual source and production output.

## JavaScript and asset delivery

| Built JavaScript | Minified bytes | Gzip bytes (Node zlib default) | Loading |
| --- | ---: | ---: | --- |
| index-CBquJEU9.js | 243,839 | 75,411 | Initial entry |
| FlowerScene-Bjbo_OND.js | 930,970 | 246,533 | Deferred 3D scene |
| Total JavaScript | 1,174,809 | 321,944 | Both are included in the navigation transfer above |

Gzip figures above are measured directly from the emitted files using Node zlib defaults. Vite's displayed gzip estimates and observed HTTP transfers can differ because of compression settings and headers. The entry is 243.84 kB raw / 75.41 kB gzip. Baseline entry was 242,251 bytes raw; baseline garden was 930,599 bytes raw. JavaScript was already tree-shaken: removing unused Drei reduces installed packages, rather than materially shrinking the emitted Three.js runtime. Small added scheduling/fallback code increases bundle bytes slightly; the major measured savings come from asset delivery and avoiding critical-path work.

- Replaced render-blocking Google Fonts CSS with local WOFF2 for the same Cormorant Garamond, Great Vibes, and Poppins families/weights; preloaded heading/body fonts. OFL licenses ship in public/licenses.
- Compressed the existing transparent crest into 192/384px WebP and decorative watercolor into 768/1086/1440/2172px WebP variants. Responsive sources keep both sharp at their actual display sizes. Original decorative PNG delivery totaled 2,194,591 bytes and was confirmed unused before removal.
- Two optional high-quality full-dimension WebP delivery previews: 545,472 and 682,668 bytes, versus 2,526,381 and 3,287,757-byte original letter PNGs. Fitted reading/entrance use WebP; zoom loads the unchanged original PNG. No letter content is regenerated or cropped. Gift data paths remain unchanged. Future letters without previews automatically use their data path. When replacing an existing original, regenerate or remove its matching preview to avoid serving an older rendition.
- The first garden import waits 1.2 seconds for heading/countdown paint (zero extra delay for reduced motion); it stays lazy and cached. Failed download yields a localized accessible fallback. Testing an earlier overlapping import worsened mobile LCP, so it was rejected.
- Final handwritten image mounts only when its reveal is requested. YouTube iframe remains absent while locked and is browser-lazy after unlock.

## Rendering and React work

- Shared petal/stem geometry and existing instanced petals are retained; no flower models, positions, geometry quality, or petal materials were changed. Existing DPR cap is retained at 1–1.5.
- Shader programs are warmed with compileAsync before first drawing, then rendering begins. Existing WebGL boundary/fallback is preserved.
- Capped the demand-driven scene at 60 fps; native RAF is canceled while offscreen or reduced-motion. Before, a high-refresh desktop drew 288 frames in 2000.7 ms (about 144 fps). Final idle sample measured 60.3 fps, with bloom and breeze intact.
- Corrected zero-area Intersection Observer edge intersections: the garden and CSS atmosphere pause below 1% visibility. Offscreen frame counters remain unchanged. Reduced motion displays a fully open static garden with no continuous frames.
- Existing frame refs and uniforms handle motion without per-frame React state updates. Bloom ends once, stays open, and never follows scrolling.
- Profiling showed the Letters section rendered every countdown tick. Memoization now skips those unrelated renders while retaining all its local dialog/image state updates. Surprise's existing memoization is preserved. Raw production commit flags are in react-renders-before.json and react-renders-after.json (PerformedWork bit 1 vs 0).
- Resize cycles reuse five GPU geometry buffers and five shader programs. Textures track active flower count (23 mobile / 31 tablet / 59 desktop), with no accumulated geometry/program growth in tested cycles. This is a targeted leak check, not proof of all possible long-session behavior.

## Functional, responsive and accessibility validation

- Tested production UI at 320×700, 375×812, 390×844, 768×1024, 1024×768, and 1440×900. Six square envelopes; two enabled/four disabled; two columns on mobile/tablet and three on desktop; no document horizontal overflow; all four countdown units visible. Screenshots reviewed at these widths, with one short-tablet scroll-indicator/hint overlap corrected.
- Both letter image mappings and native aspect ratios checked at every width. Opening flap/slide, timed transition into reading, full-image fit, zoom to original PNG, vertical scrolling, Enter, Escape, Close, focus restoration and page scroll restoration passed. Background root/body scrolling is locked while a reader is open. Unavailable envelopes cannot open.
- Missing/broken image decode produces the existing text fallback without a broken icon; failure of Letter 01 does not affect Letter 02.
- Individual-petal entrance begins in buds, foreground leads background, reaches full bloom once, then idle breeze continues. Scroll down/up does not change bloom/rest transforms or camera or replay the entrance. Offscreen rendering stops and resumes; reduced-motion scene is static and reader opening is skipped.
- Date logic tests covered explicit timezone, days/hours/minutes/seconds, one-second tick, exact completion, nonnegative values, invalid input, interval stop/cleanup and date changes. The real production target remains 2026-10-21T00:00:00+05:30.
- Browser clock control verified actual midnight unlock without reload, completion message, Hero navigation to #surprise, interval count from one to zero, and two normal letters accessible on either side of the birthday. Actual configuration shows the missing-video fallback; no locked iframe/final-photo request occurs.
- Existing YouTube parser tested all four supported URL forms and rejected malformed URLs, arbitrary hosts, credentials, ports, insecure protocols and invalid IDs. In an isolated temporary production build with a sample URL, verified locked iframe absence, automatic unlock, youtube-nocookie source, normal controls, autoplay=0, playsinline=1, title and fullscreen permission. The iframe response was a test fixture: live YouTube playback/fullscreen was **not verified**, because the actual video URL is unset. Actual environment files were not changed.
- The final letter file is absent. A browser-only response fixture verified its lazy reveal, enlargement, Escape, scroll lock and focus return; actual content was not invented or committed.
- WebGL-unavailable and 3D-chunk-download failures retain accessible fallback text, heading/countdown and normal letters. Expected injected failure diagnostics are separate from the normal-path results. Normal production checks recorded zero runtime errors.
- Fixed countdown timer markup by keeping timer semantics on the wrapper and preserving valid dl/dt/dd semantics inside. Lighthouse accessibility improved from 96 to 100. Live birthday status is preserved without announcing every second. Keyboard focus and touch controls remain usable.
- Event listeners, observers, RAF, countdown interval, opening timeout, model disposal and media-query cleanup reviewed. No app debug logs or scroll-driven bloom listeners were found.

Evidence: browser-checks.json, fallback-checks.json, logic-checks.json, surprise-checks.json, production render profiles, and four raw Lighthouse reports in this directory.

## Modified and removed files

Runtime/configuration:

- package.json, package-lock.json: removed unused Drei and its unused transitive dependencies (48 packages total); added production preview script.
- index.html: same-origin font preloads and description.
- src/index.css: local font faces, audit-artifact exclusion from Tailwind scanning, earlier existing text entrances, and short-tablet scroll-indicator clearance.
- src/App.jsx: removed obsolete test-date flag; same birthday timestamp and shared countdown remain.
- src/components/CountdownTimer.jsx: valid timer/list semantics and removed obsolete test-date notice prop/branch.
- src/components/FlowerScene.jsx: shader warm-up, frame cap, offscreen/reduced-motion scheduling and observer edge fix.
- src/sections/HeroSection.jsx: text-first deferred garden loading, localized import-failure fallback and atmosphere visibility edge fix.
- src/sections/LettersSection.jsx: profiled memoization, responsive decorative WebP and optional letter preview delivery; same gift array and interactions.
- src/sections/LettersSection.css: correct sizing for the picture wrapper's inner image during the existing envelope animation.
- src/sections/SurpriseSection.jsx: lazy final-photo mounting, lazy unlocked iframe and final viewer root/body scroll lock/focus restoration.

Assets/evidence:

- Added four src/assets/fonts/*.woff2 files and three public/licenses/*-OFL.txt licenses.
- Added six responsive decorative WebP files and two letter preview WebPs under src/assets/images; updated hogwarts-crest.md and magical-post.md provenance notes.
- Removed confirmed-unused hogwarts-crest.png and magical-post.png delivery assets, obsolete tulip.glb/lily.glb (1,058,612 bytes) and their obsolete license note. Kept the empty models directory with .gitkeep; removed .gitkeep only from populated font/image/letter folders.
- Added audit/README.md, summary.json, before/after Lighthouse and targeted-check evidence. No audit artifacts are imported by runtime code.
- No changes to src/data/gifts.js, src/components/flowerGeometry.js, src/hooks/useCountdown.js, src/hooks/useSectionReveal.js, original public/letters PNGs, environment settings, or YouTube parser/unlock calculations.

Hashes in summary.json confirm both original letter images and gifts.js stayed unchanged from the baseline.

## Remaining warnings and limits

- Vite still warns about the 930.97 kB minified deferred 3D chunk. Three.js/R3F execution, shader initialization and mobile main-thread work remain material. Removing visible animation or rewriting the renderer solely to hit a score was outside scope.
- Lighthouse reports unused portions of the general-purpose Three.js runtime, main-thread work, request chains, initial CSS blocking, and some forced layout during startup. The final mobile TBT is 167.5 ms (baseline 162 ms); this metric did not improve materially even though LCP/bytes did. No claim of improvement in every metric is made.
- Source maps are not emitted by the existing production config; Lighthouse's diagnostic remains. No new production source exposure was introduced solely for a score.
- SEO 91: no robots.txt exists, and Vite's SPA fallback serves HTML for that path. A crawler policy was not invented for this personal birthday site.
- R3F/Three.js emits a dependency-level THREE.Clock deprecation warning with these installed versions. It is not an app runtime error; dependencies were not replaced or patched just to suppress it.
- Actual VITE_YOUTUBE_URL and final-letter.jpg are not configured/provided. Live video playback/fullscreen and actual final photo require those assets; only gating/embed attributes/viewer mechanics were verified with isolated fixtures.
- Physical low-end phones, field INP, deployed HTTPS/CDN compression/cache headers and real hosting latency were not measured. These local production results do not guarantee a deployed load time.
