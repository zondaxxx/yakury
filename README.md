# AĒRIS — Matter, made of light

An ultra-premium landing page built as a digital art experience in the
Apple Liquid Glass aesthetic: enormous liquid-glass and chrome objects
suspended in a cinematic, fog-laden space, threaded together by a
scroll-driven camera flight.

![concept](https://img.shields.io/badge/aesthetic-liquid%20glass-9aa7c0)

## Running

Static site, no build step. ES modules require an HTTP server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then open <http://localhost:8000>.

All libraries are vendored in `vendor/` — the site works fully offline
(web fonts degrade gracefully to system type).

## What's inside

| Layer | Tech |
|---|---|
| 3D stage | Three.js r170 — `MeshPhysicalMaterial` with real transmission, dispersion, iridescence and clearcoat |
| Liquid surface | Custom vertex-shader simplex displacement with analytic normal reconstruction, agitated by the cursor via raycast |
| Cinematics | UnrealBloom + custom grade pass (chromatic edges, vignette, animated grain), exponential fog, faked volumetric light blades, dust motes |
| Scroll | Lenis smooth scroll + GSAP ScrollTrigger; one master timeline scrubs the camera through six chapter states, including a flythrough of the chrome gate |
| UI glass | Backdrop-blur panels with hairline gradient borders, cursor-tracked specular highlights, magnetic pill buttons, glass-lens custom cursor |

## Choreography

The page is a single camera journey:

1. **Origin** — the liquid blob breathes beneath the headline.
2. **Material** — dolly-in; the blob drifts right of the glass panel.
3. **Optics** — the camera threads the chrome torus as bloom swells.
4. **Interface** — objects recede behind floating content cards.
5. **Manifesto** — words condense out of the fog, scrubbed to scroll.
6. **Finale** — the constellation regroups into a ringed monolith.

## Behaviour notes

- `prefers-reduced-motion` collapses the journey to a calm static stage.
- Touch devices get lighter geometry, no dispersion and no cursor physics.
- WebGL failure falls back to a gradient backdrop with full content.
