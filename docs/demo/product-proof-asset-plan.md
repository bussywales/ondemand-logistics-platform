# Product Proof Asset Plan

Purpose: create staging-safe visual proof assets for the public site, demo packs, and investor/operator materials without using fake customer claims or exposing sensitive data.

## Asset directory
Public proof assets should live in:

```text
apps/web/public/proof/
```

Do not store generated proof JSON artifacts in this directory.

## Capture standard
Use staging pages only after a successful readiness run:

```bash
pnpm rehearsal:verify-staging
```

Before capturing, confirm:
- `/admin/release-readiness` is `READY`
- `/admin/validation-evidence` has fresh release verify, paid proof, and required-auth smoke records
- staging web is deployed from latest `main`
- authenticated admin/business/fleet smoke accounts are available when needed

## Recommended assets
| Filename | Source route | Purpose | Safe capture notes |
| --- | --- | --- | --- |
| `release-readiness-ready.png` | `/admin/release-readiness` | Anchor the demo in a single READY/NEEDS_REVIEW/BLOCKED posture. | Show verdict and evidence checklist; crop any user/account chrome. |
| `validation-evidence.png` | `/admin/validation-evidence` | Show stored release verification, paid-delivery proof, and required-auth smoke evidence. | Avoid exposing internal IDs unless approved; timestamps are acceptable. |
| `admin-command.png` | `/admin/command` | Show cross-org operational posture and command intelligence. | Use broad posture cards; crop detailed org/user rows if sensitive. |
| `merchant-menu-operations.png` | `/app/restaurant` | Show menu editing, availability, history, and rollback readiness. | Use staging merchant names only; avoid real menu/customer data. |
| `finance-review.png` | `/app/finance` or `/admin/finance` | Show review-only finance posture and persistent reviews. | Hide payment provider IDs, emails, phone numbers, and exact totals if sensitive. |
| `dispatch-audit.png` | `/admin/dispatch-audit` | Show manual dispatch/assignment auditability. | Crop actor emails, exact courier identities, and internal-only IDs unless approved. |
| `fleet-workspace.png` | `/fleet` | Show fleet readiness and driver-company workspace. | Use staging fleet data only; avoid personal driver details. |
| `governance-controls.png` | `/admin/governance` | Show enterprise suspension/governance controls. | Do not show real user emails or suspension reasons. |
| `analytics-dashboard.png` | `/admin/analytics` | Show first-party funnel analytics without fake external tooling. | Do not invent conversion numbers; use staging data or crop to structure. |
| `demo-request-pipeline.png` | `/admin/demo-requests` | Show persisted commercial intake and follow-up workflow. | Redact requester names/emails/organisations unless they are explicit staging fixtures. |

## File naming convention
- Use lowercase kebab-case.
- Use `.png` for committed public assets.
- Match the expected filenames exactly where possible.
- If creating variants, suffix with purpose, for example `admin-command-cropped.png`.

## Cropping and redaction rules
- Crop browser chrome unless it helps orient the viewer.
- Prefer 16:10 or 4:3 crops for public site cards.
- Redact or crop emails, phone numbers, personal names, addresses, payment intent IDs, bearer tokens, cookies, webhook URLs, and exact internal IDs.
- Use staging-safe fixture labels such as Pilot Kitchen, Staging Fleet, Example order, or Demo request.
- Do not blur so aggressively that the proof becomes meaningless; crop first, redact second.

## What each asset should prove
- Release readiness: ShipWright has a current readiness verdict.
- Validation evidence: readiness is backed by stored evidence, not a slide claim.
- Admin command: platform teams can see cross-org posture calmly.
- Merchant operations: merchants can manage menu/pricing/visibility with auditability.
- Finance review: finance posture is visible and human-reviewed.
- Dispatch audit: manual intervention is accountable.
- Fleet workspace: driver-company readiness is visible without punitive scoring.
- Governance controls: enterprise access controls are reversible and audited.
- Analytics dashboard: first-party funnel signals exist without external tracking vendors.
- Demo request pipeline: commercial interest is persisted and follow-up is operationally visible.

## Public-site use
The landing page supports proof images if files exist in `apps/web/public/proof/`. If a file is absent, the page renders the existing CSS-native visual card instead of a broken image.

Do not update public copy to imply screenshots are customer production screenshots. Use language such as:
- reviewed staging proof
- controlled pilot evidence
- product proof visual
- staging-safe product capture

Avoid:
- customer logo wall
- production metrics
- guaranteed delivery claims
- autonomous AI claims

## Manual capture process
1. Run `pnpm rehearsal:verify-staging`.
2. Open the source route on staging with the correct smoke/admin/business/fleet account.
3. Confirm the screen contains only staging-safe data.
4. Crop/redact according to this plan.
5. Save to `apps/web/public/proof/<expected-filename>.png`.
6. Run public web tests/build before committing.
7. Do not commit any generated `docs/proofs/*.json` artifacts unless explicitly requested.

## Automation note
`pnpm proof:capture-assets` is intentionally not implemented in this pass. Manual capture keeps review/redaction explicit before assets are exposed on public pages.

## Current capture status
Captured and reviewed in Public Proof Assets v1.1:
- `release-readiness-ready.png`
- `validation-evidence.png`
- `admin-command.png`
- `merchant-menu-operations.png`
- `dispatch-audit.png`
- `fleet-workspace.png`
- `governance-controls.png`
- `demo-request-pipeline.png`

Captured and reviewed in Public Proof Assets v1.2:
- `finance-review.png` - captured from `/admin/finance` after applying the missing staging `finance_review_records` schema; reflects current staging finance-review data.
- `analytics-dashboard.png` - captured from `/admin/analytics` after applying the missing staging `analytics_events` schema; reflects current staging funnel data.

Do not use unavailable/error-state screenshots as proof assets.
