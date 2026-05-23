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
- driver fleet organisation management
- dispatch governance and assignment audit visibility
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
- first-party public funnel analytics and admin analytics view

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
- release verification, paid-delivery proof, and Playwright smoke can be stored as admin-only validation evidence
- `/admin/release-readiness` provides the single `READY` / `NEEDS_REVIEW` / `BLOCKED` admin verdict using latest stored evidence freshness
- if validation evidence is missing, stale, skipped, or failed, the UI should direct admins to rerun and record validation commands

Next hardening:
- seed pilot profiles for rehearsal environments where needed
- keep `/admin/release-readiness` ready before investor or pilot rehearsals
- keep `/admin/validation-evidence` current before investor or pilot rehearsals
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
Status: Implemented foundation with invite lifecycle polish; continue hardening with real invite delivery, richer policy tooling, and fleet/org policy refinement.

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
- pending invite lifecycle: implemented with pending/expired resend, non-destructive cancellation, and accepted/cancelled safeguards
- role assignment: implemented for platform admin and business team managers
- remove or deactivate membership: implemented as non-destructive deactivation/reactivation
- access-change audit trail: implemented through append-only `audit_log`
- business and admin team screens show recent access history for invites, resends, cancellations, membership role changes, and activation changes
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
- invite resend records an outbox/audit event; actual email delivery still depends on notification integration

Enterprise Readiness v1:
- platform admins can suspend/reactivate organisations from `/admin/orgs`, `/admin/orgs/[orgId]/members`, and review posture at `/admin/governance`
- platform admins can suspend/reactivate/disable users from `/admin/users`
- status changes require reason capture and typed confirmation for restricted states
- access changes are written to the existing append-only audit log
- impersonation remains disabled; preview records audit intent and documents required future controls rather than creating a support session
- suspended users are rejected by business context restoration; broad suspended-organisation mutation enforcement remains a follow-up hardening item where endpoints do not share a central mutation guard

## Workstream 4: Merchant Menu Operations
Status: Implemented through v1.5 for price editing, availability clarity, simple reordering, menu-specific audit visibility, rollback readiness, and business-scoped rollback.

Goal:
Make restaurant menu management complete enough for controlled pilots by allowing authorised business users to update existing menu item details, especially price.

Implemented scope:
- business operators can edit menu item name, description, price, section, display order, and orderable state from `/app/restaurant`
- backend exposes a scoped menu item update endpoint
- backend exposes a scoped menu category update endpoint for section ordering and active-state updates
- menu item price validation requires positive integer pence values
- item and category updates remain scoped to the operator restaurant/org
- operators can reorder sections and items with Move up / Move down controls instead of manually calculating display order
- operators can see clear Live / Hidden / Draft availability posture for menu items
- public restaurant menus read updated menu item data after refresh
- public restaurant menus only expose active restaurants, active sections, and active menu items, ordered by display order
- menu item updates write audit records with changed field names
- `/app/restaurant` includes recent menu history so operators can review price, visibility, section, and ordering changes
- `GET /v1/business/restaurants/:restaurantId/menu-history` reads menu-specific events from the existing append-only audit log
- `/admin/menu-history` gives platform admins read-only cross-org visibility into menu price, visibility, section, and ordering changes for pilot support
- `GET /v1/admin/menu-history` reads the existing append-only audit log with org, restaurant, event, resource, date, and limit filters
- menu history now classifies each change as rollback prepared, not reversible, or needing more metadata
- menu mutation audit metadata consistently records restaurant/resource identity plus previous and new values for reversible fields where available
- business operators can preview prepared menu history rollback from `/app/restaurant`
- rollback execution requires typed confirmation, an idempotency key, current-state drift checks, and a scoped restaurant/org match
- rollback writes a new append-only audit event (`menu_item_rollback_applied` or `menu_category_rollback_applied`) with original audit ID, restored fields, before/after state, and actor context
- `/admin/menu-history` remains read-only and only indicates that rollback is available from the business workspace

Constraints:
- no destructive menu deletion in this pass
- no bulk import/export yet
- no historical menu price ledger yet
- no admin menu mutation or rollback from the cross-org history view
- rollback remains human-reviewed, scoped, and restricted to events with complete reversible metadata
- no public checkout behaviour change beyond reading the updated menu data

## Workstream 5: Driver Fleet Organisations
Status: Implemented v1 foundation and v1.2 fleet workspace hardening; continue with readiness event capture after controlled fleet rehearsal.

Goal:
Support driver-company-managed courier pools without weakening independent courier support.

Implemented scope:
- driver-company organisations reuse `orgs.org_type = DRIVER_COMPANY`
- fleet roles reuse the IAM role foundation: `FLEET_OWNER`, `FLEET_MANAGER`, `DISPATCHER`, `DRIVER`, `COMPLIANCE_MANAGER`
- platform admins can create and review fleet organisations at `/admin/fleets`
- platform admins can add existing users or couriers to a fleet and update fleet role/active status
- fleet manager-scoped API exposes driver list and readiness summary for driver-company members with manager, dispatcher, owner, or compliance roles
- fleet managers, owners, dispatchers, and compliance leads can open `/fleet/drivers/[driverId]` for driver-level readiness detail, active/recent work, and non-punitive next actions
- fleet owners, managers, and compliance leads can manage driver-company invitations from `/fleet/team`; dispatchers remain read-only for team management
- admin driver readiness shows independent vs fleet-managed courier affiliation
- fleet readiness remains compliance/readiness visibility, not dispatch preference automation
- readiness history is currently an empty-state surface until driver signal changes are captured as append-only readiness events

Constraints:
- no punitive driver scoring
- no automatic courier suspension
- no silent driver assignment autonomy
- keep compliance and approval human-reviewed
- no fleet billing, payout automation, or dispatch prioritisation in v1
- no automatic readiness event history capture yet

## Workstream 5A: Dispatch Governance
Status: Implemented v1 for human-reviewed override recording and cross-org assignment audit visibility.

Goal:
Make dispatch intervention accountable without introducing autonomous assignment changes, driver scoring, or punitive automation.

Implemented scope:
- business job detail includes a Dispatch Governance section for current assignment posture, courier affiliation, manual review notes, blocked/reviewed markers, and assignment audit history
- business driver assignment from the eligible pool requires a reason and typed confirmation before recording an assignment override
- `GET /v1/business/jobs/:jobId/dispatch-audit` returns org-scoped assignment and override history
- `POST /v1/business/jobs/:jobId/dispatch-override` records human-reviewed assignment, reassignment, unassignment, review, blocked, or manual recovery events with idempotency
- `GET /v1/admin/dispatch-audit` gives platform admins read-only cross-org visibility into dispatch override and assignment history
- `/admin/dispatch-audit` shows recent override decisions with courier affiliation, fleet organisation context where available, actor, reason, and job/order links
- fleet-managed vs independent courier context is surfaced in dispatch audit rows

Constraints:
- no autonomous dispatch override
- no driver scoring, suspension, payout, or billing automation
- no destructive dispatch workflow
- admin dispatch audit remains read-only

## Workstream 6: Operational Maturity Continuation
Status: Continue in parallel only where it strengthens pilot readiness.

Active foundations:
- rehearsal cockpit
- support history
- resolution closeout
- pilot guardrails
- support/incident closeout reporting
- operational reset tools for staging/demo tidy runs
- per-record operational reset selection so admins can preview, include, or exclude eligible demo/staging records before typed confirmation

Next candidates:
- support/incident closeout reporting polish
- clearer rehearsal evidence capture
- better support escalation filters and admin views
- pilot owner accountability reporting

Constraints:
- reset tools remain admin-only, preview-first, per-record selectable, typed-confirmation gated, and non-destructive
- reset tools must not mutate proof orders, jobs, payments, proof artifacts, or audit events
- no automatic customer messaging, refund, cancellation, or driver assignment

## Workstream 6A: Payments / Finance Visibility
Status: Implemented v1 review foundation.

Goal:
Give business operators and platform admins clear settlement and refund-review posture without adding automated refunds, payout automation, or payment-provider changes.

Implemented scope:
- business finance surface at `/app/finance`
- admin finance surface at `/admin/finance`
- read-only finance summary endpoints for captured, pending, failed, delivered, and refund-review posture
- transaction rows avoid sensitive card/provider details and link operators back to order/job context
- refund review candidates are computed from captured payments with failed/cancelled fulfilment and unresolved `REFUND_REVIEW` support escalations
- Admin Command includes finance counts and links to the finance surface

Constraints:
- no automated refunds
- no payout automation or settlement-to-bank automation
- no destructive payment mutation
- refund decisions remain human-reviewed and support-context dependent

## Workstream 7: Commercial Conversion Layer
Status: In progress. Demo request persistence, internal notification posture, admin notification diagnostics, admin follow-up pipeline preparation, controlled pilot package positioning, and first-party public funnel analytics are active.

Scope:
- real demo request persistence
- lead capture and admin review
- email or webhook integration
- admin lead view
- lead follow-up owner, priority, due date, contact record, and append-only event history
- analytics/conversion tracking
- pilot package/pricing page

Current posture:
- public landing page includes a demo request path
- `/pricing` explains controlled pilot packages for merchant, operator/platform, and investor/partner paths without public-price overclaiming
- demo requests are persisted for platform admin review
- new demo requests record internal outbox event `NOTIFY_ADMIN_DEMO_REQUEST_CREATED`
- `/admin` and `/admin/command` surface new demo request counts and link to the review queue
- `/admin/demo-requests` shows next-action guidance, reviewed metadata, owner, priority, next follow-up date, contact record, status quick actions, admin notes, close reason, and compact event history
- meaningful admin updates record append-only `demo_request_events`
- status, scheduled follow-up, and contact updates can enqueue internal outbox events for later automation wiring
- optional email/webhook delivery can be tested from `/admin/notifications` through marked `TEST_ADMIN_NOTIFICATION` outbox events
- `/admin/notifications` shows safe configuration booleans, delivery status counts, recent test events, and safe error summaries without exposing secrets
- invite lifecycle outbox events use the same worker skip/send/fail metadata conventions as demo request notifications
- pricing CTAs preselect the correct demo request interest type
- first-party analytics records public page, CTA, pricing, and demo request form intent in `analytics_events`
- `/admin/analytics` summarises first-party funnel performance without storing raw IP addresses or raw user agents
- CRM sync remains deferred; outbound email/webhook delivery is optional and only considered proven when configured and separately tested

Constraints:
- do not imply CRM/email automation is live until it is wired and verified
- do not expose notification secrets, sender credentials, or full webhook URLs in admin diagnostics
- do not expose internal docs or proof artifacts publicly without review
- do not expose demo request lists outside platform-admin surfaces
- do not add external analytics vendors, cookies, raw IP storage, or raw user-agent storage without an explicit privacy review
- do not add delete/destructive lead management in the follow-up pipeline

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
- fleet organisations are management groups only; they do not yet change dispatch eligibility or settlement flows

## Change Control
- Update this roadmap when adding a major workstream or changing execution order.
- Keep `docs/roadmaps/fleet-pilot-working-plan.md` focused on Stage 1 pilot execution.
- Keep `docs/roadmaps/ai-assisted-command-centre-roadmap.md` focused on assistive intelligence and human-in-the-loop controls.
- Keep What’s New entries aligned with major user-visible deliveries.
