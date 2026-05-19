# ShipWright Roadmap

## Purpose
This is the canonical roadmap alignment document for ShipWright. It keeps current pilot-readiness work, operational maturity work, platform identity work, fleet organisation work, commercial conversion, and brand/product marketing in the right order.

Use this document when deciding what to build next. Do not let new platform work interrupt active pilot-readiness work unless it directly unblocks controlled rehearsal or safe operations.

## Current Product Posture
ShipWright is a Stage 1 controlled-pilot logistics command centre with:
- public restaurant ordering
- merchant menu editing and price updates
- customer tracking
- business orders, jobs, payment risk, and reporting surfaces
- driver execution and proof of delivery
- admin command intelligence
- courier readiness
- support escalation logging
- support closeout workflow
- append-only support audit history
- support posture in daily briefing, admin command, and end-of-day reporting
- pilot workspace management
- pilot guardrails
- pilot rehearsal cockpit
- staging validation standard
- Playwright browser smoke testing
- demo readiness package
- public landing page with platform navigation and demo request path

The current product is ready for controlled demos and tightly managed staging testers. It is not yet positioned as an unattended real-world pilot.

## Roadmap Principles
- Finish active pilot-readiness work before starting broad platform expansion.
- Keep proof, smoke, and release verification as non-negotiable staging gates.
- Treat What’s New updates as part of delivery, not post-release cleanup.
- Add Platform Identity & Access Management without breaking current org, role, or pilot workflows.
- Keep AI and Command Intelligence deterministic and human-in-the-loop until instrumentation and governance justify more.
- Keep marketing/brand work paused except for targeted asset, motion, mobile, and real screenshot needs.

## Next Execution Sequence
1. Pilot Rehearsal Cockpit
2. What’s New + release discipline
3. Platform Identity & Access Management v1
4. Merchant Menu Editing / Price Update
5. Driver Fleet Organisations
6. Lead capture/commercial conversion backend

## Workstream 1: Pilot Rehearsal Cockpit
Status: Complete for read-only v1, continue hardening through staging rehearsal.

Scope:
- admin rehearsal readiness view
- pilot readiness/checklist posture
- proof/smoke/readiness posture
- guardrail state
- support escalation posture
- recommended next actions

Current rule:
- the cockpit may summarise validation posture
- the cockpit does not run proof, smoke, release verification, or destructive pilot controls from the UI
- if proof/smoke artifacts are not persisted in DB, the UI should show unknown and direct admins to run validation commands

Next hardening:
- seed pilot profiles for rehearsal environments where needed
- keep `/admin/pilots/[pilotId]/rehearsal` in smoke coverage
- decide later whether proof/smoke evidence should be stored as pilot readiness evidence

## Workstream 2: Product Communication Discipline
Status: Active release discipline.

Scope:
- refresh `/app/updates`, `/driver/updates`, and `/admin/updates`
- require every major user-visible delivery to include a What’s New entry or a release-note explanation for why it does not need one
- keep entries concise, operator-facing, and non-technical

Current source:
- `apps/web/app/_content/product-updates.ts`

Expected entry shape:
- title
- short operator-facing summary
- audience
- date/version when used
- CTA link when relevant

## Workstream 3: Platform Identity & Access Management v1
Status: Implemented foundation; continue hardening with real invite delivery, richer audit views, and fleet/org policy refinement.

Goal:
Make user, organisation, membership, role, and profile management explicit enough for pilots, support operations, and future driver fleet organisations.

Architectural principle:
- Identity = who you are
- Membership = where you belong
- Role = what you can do there
- Profile = operational details

Planned routes:
- `/admin/users`
- `/admin/orgs`
- `/admin/orgs/[orgId]/members`
- `/app/settings/team`

Core capabilities:
- platform global user list: implemented at `/admin/users`
- organisation membership management: implemented at `/admin/orgs` and `/admin/orgs/[orgId]/members`
- restaurant/team management: implemented at `/app/settings/team`
- invite/add member by email foundation: implemented as local invitation record plus membership creation; no external email delivery yet
- role assignment: implemented for platform admin and business team managers
- remove or deactivate membership: implemented as non-destructive deactivation/reactivation
- access-change audit trail: implemented through append-only `audit_log`
- safe role-boundary checks for platform, business, driver, and support users

Organisation types to plan for:
- `PLATFORM`
- `RESTAURANT`
- `RETAILER`
- `DRIVER_COMPANY`
- `INDEPENDENT_COURIER`
- `SUPPORT_PARTNER`

Role families to plan for:

Platform:
- Platform Owner
- Platform Admin
- Platform Support
- Platform Finance
- Platform Viewer

Restaurant/retailer:
- Owner
- Manager
- Operator
- Finance Viewer
- Support User
- Menu Manager

Driver company:
- Fleet Owner
- Fleet Manager
- Dispatcher
- Driver
- Compliance Manager

Independent courier:
- Courier

Constraints:
- do not rename repo/package/workspace identifiers as part of IAM
- do not loosen existing auth, RLS, or platform-admin boundaries
- do not let IAM replace pilot guardrail or rehearsal discipline
- every access mutation needs auditability
- no impersonation, SSO/SCIM, destructive account deletion, or external invite email in v1

## Workstream 4: Merchant Menu Editing / Price Update
Status: Implemented as a priority merchant-ops fix after IAM v1.

Goal:
Make restaurant menu management complete enough for controlled pilots by allowing authorised business users to update existing menu item details, especially price.

Implemented scope:
- business operators can edit menu item name, description, price, section, display order, and orderable state from `/app/restaurant`
- backend exposes a scoped menu item update endpoint
- menu item price validation requires positive integer pence values
- item and category updates remain scoped to the operator restaurant/org
- public restaurant menus read updated menu item data after refresh
- menu item updates write audit records with changed field names

Constraints:
- no destructive menu deletion in this pass
- no bulk import/export yet
- no historical menu price ledger yet
- no public checkout behaviour change beyond reading the updated menu data

## Workstream 5: Driver Fleet Organisations
Status: Planned after IAM v1 establishes organisation, membership, and role primitives.

Goal:
Support driver-company-managed courier pools without weakening independent courier support.

Scope:
- driver company organisation type
- fleet owner, fleet manager, dispatcher, driver, and compliance manager roles
- fleet driver list
- fleet readiness
- driver-company-managed courier pool
- relationship between courier profile and fleet membership

Constraints:
- no punitive driver scoring
- no automatic courier suspension
- no silent driver assignment autonomy
- keep compliance and approval human-reviewed

## Workstream 6: Operational Maturity Continuation
Status: Continue in parallel only where it strengthens pilot readiness.

Active foundations:
- rehearsal cockpit
- support history
- resolution closeout
- pilot guardrails
- support/incident closeout reporting

Next candidates:
- operational reset tools
- support/incident closeout reporting polish
- clearer rehearsal evidence capture
- better support escalation filters and admin views
- pilot owner accountability reporting

Constraints:
- no destructive reset tools without explicit confirmation, audit, and staging-first proof
- no automatic customer messaging, refund, cancellation, or driver assignment

## Workstream 7: Commercial Conversion Layer
Status: Planned after IAM and fleet organisation sequencing is clear, unless needed for an immediate demo commitment.

Scope:
- real demo request persistence
- lead capture
- email or webhook integration
- admin lead view
- analytics/conversion tracking
- pilot package/pricing page

Current posture:
- public landing page includes a demo request path
- capture is intentionally lightweight until persistence and handoff are designed

Constraints:
- do not imply CRM/email automation is live until it is wired and verified
- do not expose internal docs or proof artifacts publicly without review

## Workstream 8: Brand/Product Marketing
Status: Pause broad redesign work for now.

Continue only where needed:
- brand asset suite
- motion pass
- final mobile polish
- real product screenshots

Current posture:
- landing page has premium visual direction, platform navigation, ecosystem framing, and demo request pathways
- next design work should be targeted and evidence-driven, not another broad redesign cycle

## AI-Assisted Command Centre Alignment
Command Intelligence remains an assistive operations layer:
- Daily briefing
- Recovery suggestions
- Delay detection
- Incident summary drafts
- End-of-day report
- Admin command intelligence
- Support posture
- Pilot readiness posture

Rules:
- recommendations are advisory
- human approval is required for recovery, messaging, refunds, cancellation, assignment, and incident closeout
- future AI/LLM work must sit on top of instrumentation, access control, and auditability

Reference:
- `docs/roadmaps/ai-assisted-command-centre-roadmap.md`

## Current Remaining Blockers To Open Pilot
- named live operating owners for incident command, support, courier escalation, and payment/refund decisions
- stronger live customer support and tracking expectations
- payout/reconciliation remains visibility-first
- Resend external email remains parked until verified sender/domain exists
- real-world courier compliance ownership remains human-reviewed
- IAM is not yet mature enough for broad self-serve user/team management

## Change Control
- Update this roadmap when adding a major workstream or changing execution order.
- Keep `docs/roadmaps/fleet-pilot-working-plan.md` focused on Stage 1 pilot execution.
- Keep `docs/roadmaps/ai-assisted-command-centre-roadmap.md` focused on assistive intelligence and human-in-the-loop controls.
- Keep What’s New entries aligned with major user-visible deliveries.
