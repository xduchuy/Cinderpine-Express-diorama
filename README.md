# Cinderpine Express

A single-page, procedurally built three.js r128 autumn fairground. Open `dist/cinderpine-express.html` in a WebGL browser. The only runtime request is the requested three.js r128 script from cdnjs. Bevan and Hanken Grotesk fonts, all application code, geometry, textures, palette data and WebAudio synthesis are embedded in the HTML. There is no track editor or build-time JavaScript dependency.

## Controls

- 1–4: Park, Follow, Chase, front seat.
- Space: dispatch the selected train. Auto dispatch waits about 13 seconds while boarding.
- Q / E: quarter-turn orbit. Drag: orbit, or look around in the front seat.
- Scroll / pinch: zoom. X: 1× / 2× / 4× simulation speed.
- [ / ]: 1–6 CSS-pixel art size. M: mute. ?: shortcuts.
- Phone: tap the bottom sheet handle to collapse tickets.

The interface theme and Day / Dusk / Night are independent controls. Audio starts with the first gesture; the sound button can also start it explicitly.

## Implementation

`CONTRACT.md` was written before implementation and shared with three parallel agents: park/guests/effects, rails/stations/trains, and audio. Core track authoring, solver, physics, ride, rendering, camera and UI integration are in `src/core.js` and `src/app.js`.

Turtle programs author eased pitches, turns, hills, a sideways-shifted clothoid loop, helix and tunnel. A damped numerical shooting correction closes each path, followed by centripetal smoothing and arc-length resampling at approximately 0.5 m. Forward work-energy integration models gravitational potential, rolling resistance and quadratic drag; chain drives, magnetic trims and a backward braking envelope shape the speed profile. A distance-based final brake brings trains to the station. Banking is calculated from the perpendicular force vector, with transport preserving negative-g airtime. Inverted loop frames are explicitly tested. Ratings are game scores, not engineering certification.

Both cameras render into the same low-resolution colour/depth target. The post shader adds depth outlines, sky, clouds, stars and Bayer dithering. A 32³ nearest-colour lookup built in OKLab maps to one fixed 90-entry palette. Pixel art is enlarged with nearest-neighbour CSS rendering. Geometry and guests use batching/instancing. Six local lights are shared by the park and selected train; no shadow maps or downloaded art assets are used.

## Validation

`tests/physics-report.json` records 500 seconds of deterministic simulation per coaster (8, 11 and 14 completed laps), finite frames, all ride states and events, no unintended stalls, zone bounds, loop inversion/clearance and effectively zero lateral g. Closure residuals are below 0.000001 m. Peak felt g is 4.18 / 4.18 / 4.22; minimum moving speeds are 2.20 / 2.28 / 3.26 m/s.

`tests/browser-report.json`, `tests/camera-matrix-report.json`, and 19 PNG screenshots cover desktop Park / Follow / Chase / first-person, Day / Dusk / Night, 390×844 phone layout, collapsed sheet, front-seat night, audio startup, dispatch, shortcuts, themes and always-visible pixel/speed controls. Headless Chromium reports no application console errors or warnings. Chromium's software-renderer ReadPixels diagnostic is excluded from application warnings.

The cloud environment blocks cdnjs, so browser tests fulfill the exact CDN URL with the same r128 build fetched from the allowed npm mirror. The shipped HTML retains the requested cdnjs URL. This verifies application rendering with r128, not CDN availability. Phone viewport behavior was tested in headless Chromium/SwiftShader; physical-phone GPU performance and audible sound quality were not measured.

## Rebuild and test

```sh
python build.py
python -m http.server 8000 --directory dist
# In another terminal, with Playwright installed and Chromium available:
# Fetch three@0.128.0/build/three.min.js into /tmp/three.min.js for tests only.
node tests/physics.cjs
node tests/full-browser.cjs
node tests/camera-matrix.cjs
node tests/final-smoke.cjs
```

Both distributed HTML files are identical. Source font files are in `assets/`; their SIL Open Font License is included there. The root `index.html` can be served directly with GitHub Pages (branch `main`, folder `/`). The hosted preview is https://cinderpine-express-autumn.h-dev.chatgpt.site/.
