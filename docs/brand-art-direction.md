# ShipWright Brand Art Direction

## Purpose
ShipWright's public brand system should feel like premium logistics infrastructure: atmospheric, operational, intelligent, and proof-backed. The landing page may be more expressive than the internal app, but it must still communicate calm operational confidence.

This system exists to prevent future marketing work from drifting into generic SaaS cards, decorative gradients, or dashboard-heavy visuals.

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

## Colour Atmosphere
Use colour as atmosphere and meaning, not decoration:

- Commerce amber: order intake, merchant/customer activity.
- Command blue: dispatch intelligence, operator context, platform oversight.
- Proof green: delivery completion, payment capture, closeout.
- Soft violet/rose: ambient depth only; never the primary brand impression.
- White/off-white: the base of the visual system.

Avoid saturated full-page gradients, neon glows, crypto/gaming colours, and loud alert washes.

## Composition Rules
- One major visual anchor per section.
- Typography supports the scene; it should not be the only source of impact.
- Use asymmetry, layered depth, and directional route movement.
- Prefer rows, editorial moments, and visual scenes over equal-weight card grids.
- Do not rely on product screenshots as the whole brand system.
- Internal operational UI must stay calmer and more task-first than the public landing page.

## Depth And Glow Rules
- Use soft blur and route-light glows sparingly.
- Shadows should feel atmospheric, not like stacked dashboard cards.
- Floating panels should look like signal fragments, not full app screenshots.
- Route trails should imply movement without claiming real-time driver motion.

## Interaction Rules
- Hover movement should be subtle: small lift, soft glow, no bounce.
- No heavy animation libraries for brand atmosphere.
- Motion should support operational movement and sequence, not visual novelty.

## What Not To Build
- Generic SaaS vector illustrations.
- Dense dashboard screenshot walls.
- Fake map movement, fake ETA, or fake live courier location.
- Autonomous AI visual metaphors that imply actions happen without operator approval.
- Marketing gradients imported into `/app`, `/admin`, `/driver`, or other internal command surfaces.
