# ShipWright Brand Art Direction

## Purpose
ShipWright's public brand system should feel like premium logistics infrastructure: atmospheric, operational, intelligent, and proof-backed. The landing page may be more expressive than the internal app, but it must still communicate calm operational confidence.

This system exists to prevent future marketing work from drifting into generic SaaS cards, decorative gradients, or dashboard-heavy visuals.

Related direction:

- `docs/brand-world.md` defines the emotional world, audience feelings, and visual metaphors.
- `docs/landing-page-art-direction.md` translates the brand world into landing-page composition and future hero concepts.

## Visual World
ShipWright's recognisable visual language is built around five motifs:

- Route-light trails: movement from merchant to courier to customer.
- Commerce nodes: paid order signals entering the operating network.
- Command signals: operator intelligence, dispatch coordination, and human review.
- Proof markers: delivery completion, POD, capture, and closeout evidence.
- City-grid orchestration: local commerce infrastructure without literal maps or fake live tracking.

## Implemented Asset
The first bespoke art-directed scene is:

- `apps/web/public/brand/shipwright-network-scene.svg`

It is a lightweight SVG-native composition used by the public landing hero. It shows the ShipWright operating loop: commerce enters, command coordinates, courier movement progresses, proof closes the loop, and oversight remains visible.

## Scene System
Use these scene concepts for future public landing visuals:

| Scene | Meaning | Visual Treatment |
| --- | --- | --- |
| Order enters the network | A customer order becomes operational work | Amber node, route entry, soft commerce glow |
| Dispatch intelligence coordinates movement | Operator sees risk and recovery context | Blue command node, floating signal panel |
| Courier execution in motion | Courier offer, route stage, and handoff progress | Route-light arc, directional movement, no fake map |
| Proof captured / fulfilment complete | POD, capture, fulfilled state, closeout evidence | Green proof marker, quiet completion signal |
| Platform command oversight | Cross-org posture and readiness | Dark or white oversight card, restrained signal count |

## Canonical Landing Direction
The canonical public landing hero direction is now `Route Orchestration`.

Brand spine:

1. Order enters the network.
2. Route intelligence coordinates movement.
3. Proof closes the loop.

Supporting visual roles:

- `Route Orchestration` is the hero composition.
- `City-Grid Intelligence` is the background atmosphere.
- `Proof and Accountability` is the closing visual language.

Future landing-page visual work should extend this spine rather than introduce unrelated metaphors.

## Illustration System
ShipWright illustration should be dimensional, atmospheric, and operationally specific. It should show the product's operating loop without becoming a literal screenshot or a fake live map.

Preferred formats:

- SVG-native hero and section assets.
- CSS-native supporting atmosphere.
- Small proprietary markers for commerce, command, courier, proof, and oversight.
- Composable route-light layers that can appear in hero, mega menu, footer, and proof sections.

Preferred visual ingredients:

- Soft city-grid perspective.
- Curved route trails.
- Floating signal fragments.
- Proof stamps and closeout ticks.
- Ambient urban light.
- Subtle depth blur and shadow.

Do not use:

- Generic SaaS vector people.
- Flat delivery clipart.
- Cartoon scooters.
- Fake ETA/location visuals.
- Dense dashboard screenshot walls.
- Neon, cyberpunk, or crypto-style lighting.

## Colour Atmosphere
Use colour as atmosphere and meaning, not decoration:

- Royal command blue: primary CTAs, dispatch intelligence, operator context, platform oversight, and trust. Public primary buttons should use this deeper blue rather than black or generic bright SaaS blue.
- Bright blue: hover states, selected highlights, route-light signals, and small command accents. It should add energy around action without becoming the default filled surface.
- Commerce orange/amber: order intake, merchant/customer activity, route-start warmth, controlled pilot packaging, and commercial movement accents.
- Proof green: delivery completion, payment capture, closeout, readiness, and validated proof moments.
- Deep navy/command navy: editorial typography, internal sidebar surfaces, serious infrastructure tone, and restrained product framing.
- Red: true risk only. Do not use red as a brand accent or commercial attention colour.
- Soft violet/rose: ambient depth only; never the primary brand impression.
- White/off-white: the base of the visual system.

Avoid saturated full-page gradients, neon glows, crypto/gaming colours, and loud alert washes.

Colour should increase only at meaningful operating moments:

- Order entering the network.
- Dispatch coordination.
- Courier movement.
- Proof and closeout.
- Platform oversight.
- Commercial pilot pathways and conversion moments, using blue for action and amber for warmth.

Most page surfaces should stay white, off-white, pale grey-blue, or warm ivory so the brand feels premium instead of decorative.

Button and CTA colour rules:

- Primary public CTAs use royal command blue with a brighter blue hover state and deeper active state.
- Secondary CTAs stay white/off-white with subtle blue borders or navy text.
- Orange is an accent for route movement and commerce warmth, not the primary button colour.
- Green is reserved for proof/completion cues.
- Internal operational risk states should not be recoloured for marketing warmth.

## Typography Personality
Typography should feel editorial and confident, but it should not carry the entire brand identity.

Rules:

- Use large hero type sparingly.
- Let visual scenes carry emotional weight.
- Use generous line-height and restrained line length.
- Prefer medium and semibold weights outside major hero moments.
- Avoid repeated oversized headings in every section.
- Section typography should vary rhythmically so the page feels curated rather than templated.

Typography should dominate only when the section is an editorial statement. In visual sections, typography should support the scene.

## Composition Rules
- One major visual anchor per section.
- Typography supports the scene; it should not be the only source of impact.
- Use asymmetry, layered depth, and directional route movement.
- Prefer rows, editorial moments, and visual scenes over equal-weight card grids.
- Do not rely on product screenshots as the whole brand system.
- Internal operational UI must stay calmer and more task-first than the public landing page.

## Hero Exploration Directions
Route Orchestration is the selected canonical direction. The remaining concepts are secondary lenses, not competing hero directions.

### Route Orchestration
A perspective city grid with an amber commerce node, blue command node, moving courier marker, and green proof destination. This is the canonical hero direction and should anchor the brand system.

### Commerce Movement
A warmer merchant-to-customer scene that shows local commerce moving through a structured route. This is the most merchant-friendly direction.

### Calm Command Centre
A sparse command scene where daily briefing, recovery suggestion, incident summary, and proof state appear as floating signals around one route-light spine. This is the most operator-led direction.

### City-Grid Intelligence
An abstract overhead urban system with soft route trails and platform oversight markers. This is the most platform-company direction.

### Fulfilment Lifecycle
A cinematic sequence of order, authorisation, dispatch, pickup, drop-off, capture, proof, and report. This is the most proof-led direction.

## Depth And Glow Rules
- Use soft blur and route-light glows sparingly.
- Shadows should feel atmospheric, not like stacked dashboard cards.
- Floating panels should look like signal fragments, not full app screenshots.
- Route trails should imply movement without claiming real-time driver motion.

## Interaction Rules
- Hover movement should be subtle: small lift, soft glow, no bounce.
- No heavy animation libraries for brand atmosphere.
- Motion should support operational movement and sequence, not visual novelty.
- Route-light motion may gently draw, pulse, or progress when future motion is added.
- Mega menus should open softly and feel layered, not like basic dropdowns.
- Respect reduced-motion settings.

## Mega Menu Art Direction
Public mega menus should communicate platform maturity, not just provide links.

They should include:

- A short editorial intro.
- Soft layered surface treatment.
- Small route-light visual anchors.
- Commerce, command, and proof node cues.
- Clear grouping without enterprise clutter.

They should not include:

- Dark menu panels.
- Dense link lists.
- Dashboard screenshots.
- Decorative icons without meaning.

## What Not To Build
- Generic SaaS vector illustrations.
- Dense dashboard screenshot walls.
- Fake map movement, fake ETA, or fake live courier location.
- Autonomous AI visual metaphors that imply actions happen without operator approval.
- Marketing gradients imported into `/app`, `/admin`, `/driver`, or other internal command surfaces.
